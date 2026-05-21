"use server"

import { createClient } from "@supabase/supabase-js"
import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateAttestationPdf, type ValidatorEntry } from "@/lib/pdf/attestation"

type Decision = "APPROUVE" | "REFUSE" | "CORRECTION_DEMANDEE"

const NEXT_STATUS: Record<Decision, string> = {
  APPROUVE: "VALIDE_ADMIN",
  REFUSE: "REFUSE",
  CORRECTION_DEMANDEE: "CORRECTION_DEMANDEE",
}

export async function soumettreDecision(
  dossierId: string,
  decision: Decision,
  commentaire: string,
  signature: string
): Promise<{ error: string | null }> {
  const user = await getSessionUser()
  if (!user || user.role !== "ADMIN") return { error: "Non autorisé" }

  const dossier = await prisma.dossier.findFirst({
    where: { id: dossierId, status: "VALIDE_ENCADRANT" },
    select: { id: true },
  })
  if (!dossier) return { error: "Dossier introuvable ou déjà traité." }

  try {
    await prisma.validation.create({
      data: {
        dossierId,
        valideurId: user.id,
        role: "ADMIN",
        decision,
        commentaire: commentaire.trim() || null,
        signature,
      },
    })

    await prisma.dossier.update({
      where: { id: dossierId },
      data: { status: NEXT_STATUS[decision] as any },
    })

    return { error: null }
  } catch (err) {
    console.error("admin soumettreDecision error:", err)
    return { error: "Une erreur est survenue. Veuillez réessayer." }
  }
}

const ROLE_LABELS: Record<string, string> = {
  ENCADRANT: "Encadrant",
  ADMIN: "Administration",
  DIRECTEUR_LABO: "Directeur de labo",
  DOYEN: "Doyen",
}

// Decisions that represent a positive approval (not rejection or correction)
const POSITIVE_DECISIONS = new Set(["APPROUVE", "SIGNE", "VALIDE_DEFINITIVEMENT"])

const fmtDate = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
})

export async function confirmerReinscription(
  dossierId: string
): Promise<{ error: string | null }> {
  const user = await getSessionUser()
  if (!user || user.role !== "ADMIN") return { error: "Non autorisé" }

  const dossier = await prisma.dossier.findFirst({
    where: { id: dossierId, status: "VALIDE_DEFINITIVEMENT" },
    include: {
      doctorant: {
        include: {
          user: { select: { nom: true, prenom: true } },
          laboratoire: { select: { nom: true } },
        },
      },
    },
  })
  if (!dossier) return { error: "Dossier introuvable ou déjà traité." }

  try {
    // ── 1. Collect all validator signatures for the PDF ───────────────────────
    const allValidations = await prisma.validation.findMany({
      where: { dossierId },
      include: { valideur: { select: { nom: true, prenom: true } } },
      orderBy: { signedAt: "asc" },
    })

    // Keep the last positive validation per role (handles re-submissions)
    const roleMap = new Map<string, typeof allValidations[0]>()
    for (const v of allValidations) {
      if (POSITIVE_DECISIONS.has(v.decision)) {
        roleMap.set(v.role, v)
      }
    }

    const validators: ValidatorEntry[] = Array.from(roleMap.values())
      .sort((a, b) => a.signedAt.getTime() - b.signedAt.getTime())
      .map((v) => ({
        roleLabel: ROLE_LABELS[v.role] ?? v.role,
        prenom: v.valideur.prenom,
        nom: v.valideur.nom,
        date: fmtDate.format(v.signedAt),
        signature: v.signature,
      }))

    // ── 2. Generate PDF ──────────────────────────────────────────────────────
    const pdfBuffer = await generateAttestationPdf({
      prenom: dossier.doctorant.user.prenom,
      nom: dossier.doctorant.user.nom,
      cin: dossier.doctorant.cin,
      cne: dossier.doctorant.cne,
      apogee: dossier.doctorant.apogee,
      formationDoctorale: dossier.doctorant.formationDoctorale,
      laboratoire: dossier.doctorant.laboratoire.nom,
      sujetThese: dossier.doctorant.sujetThese,
      anneeUniversitaire: dossier.anneeUniversitaire,
      dateGeneration: fmtDate.format(new Date()),
      validators,
    })

    // ── 3. Upload to Supabase Storage ────────────────────────────────────────
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    await supabaseAdmin.storage
      .createBucket("attestations", { public: true })
      .catch(() => {})

    const fileName = `${dossierId}.pdf`
    const { error: uploadError } = await supabaseAdmin.storage
      .from("attestations")
      .upload(fileName, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      })

    if (uploadError) {
      console.error("Storage upload:", uploadError)
      return { error: "Erreur lors de la génération de l'attestation." }
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("attestations")
      .getPublicUrl(fileName)

    // ── 4. Persist attestation record ────────────────────────────────────────
    await prisma.attestation.upsert({
      where: { dossierId },
      update: { pdfUrl: publicUrl },
      create: { dossierId, pdfUrl: publicUrl },
    })

    // ── 5. Update dossier status ─────────────────────────────────────────────
    await prisma.dossier.update({
      where: { id: dossierId },
      data: { status: "REINSCRIPTION_EFFECTUEE" },
    })

    // ── 6. Record the admin confirmation in the validation history ────────────
    await prisma.validation.create({
      data: {
        dossierId,
        valideurId: user.id,
        role: "ADMIN",
        decision: "CONFIRME",
        commentaire: null,
        signature: null,
      },
    })

    return { error: null }
  } catch (err) {
    console.error("confirmerReinscription error:", err)
    return { error: "Une erreur est survenue. Veuillez réessayer." }
  }
}
