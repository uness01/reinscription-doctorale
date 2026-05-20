"use server"

import { createClient } from "@supabase/supabase-js"
import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateAttestationPdf } from "@/lib/pdf/attestation"

type Decision = "APPROUVE" | "REFUSE" | "CORRECTION_DEMANDEE"

const NEXT_STATUS: Record<Decision, string> = {
  APPROUVE: "VALIDE_ADMIN",
  REFUSE: "REFUSE",
  CORRECTION_DEMANDEE: "CORRECTION_DEMANDEE",
}

export async function soumettreDecision(
  dossierId: string,
  decision: Decision,
  commentaire: string
): Promise<{ error: string | null }> {
  const user = await getSessionUser()
  if (!user || user.role !== "ADMIN") return { error: "Non autorisé" }

  const dossier = await prisma.dossier.findFirst({
    where: { id: dossierId, status: "VALIDE_ENCADRANT" },
    select: { id: true },
  })
  if (!dossier) return { error: "Dossier introuvable ou déjà traité." }

  try {
    await prisma.dossier.update({
      where: { id: dossierId },
      data: { status: NEXT_STATUS[decision] as any },
    })
    await prisma.validation.create({
      data: {
        dossierId,
        valideurId: user.id,
        role: "ADMIN",
        decision,
        commentaire: commentaire.trim() || null,
      },
    })
    return { error: null }
  } catch (err) {
    console.error("admin soumettreDecision:", err)
    return { error: "Une erreur est survenue. Veuillez réessayer." }
  }
}

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
    // ── 1. Generate PDF ──────────────────────────────────────────────────────
    const dateGeneration = new Date().toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })

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
      dateGeneration,
    })

    // ── 2. Upload to Supabase Storage ────────────────────────────────────────
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Create bucket if it doesn't exist (no-op if already present)
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

    // ── 3. Persist attestation + update status ───────────────────────────────
    await prisma.attestation.upsert({
      where: { dossierId },
      update: { pdfUrl: publicUrl },
      create: { dossierId, pdfUrl: publicUrl },
    })

    await prisma.dossier.update({
      where: { id: dossierId },
      data: { status: "REINSCRIPTION_EFFECTUEE" },
    })

    return { error: null }
  } catch (err) {
    console.error("confirmerReinscription:", err)
    return { error: "Une erreur est survenue. Veuillez réessayer." }
  }
}
