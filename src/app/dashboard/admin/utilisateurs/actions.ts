"use server"

import { createClient } from "@supabase/supabase-js"
import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function getSupabaseUid(email: string): Promise<string | null> {
  const { data } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
  return data?.users?.find((u) => u.email === email)?.id ?? null
}

function prismaUniqueError(err: any): string {
  if (err?.code === "P2002") {
    const target = err?.meta?.target
    const targets = Array.isArray(target) ? target.join(" ") : String(target ?? "")
    if (targets.includes("cin")) return "Ce CIN est déjà utilisé."
    if (targets.includes("cne")) return "Ce CNE est déjà utilisé."
    if (targets.includes("apogee")) return "Ce N° Apogée est déjà utilisé."
    if (targets.includes("email")) return "Cette adresse email est déjà utilisée."
    return "Une valeur unique est déjà utilisée."
  }
  return "Une erreur est survenue. Veuillez réessayer."
}

function supabaseAuthError(err: { message: string }): string {
  const msg = err.message.toLowerCase()
  if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("user already")) {
    return "Cette adresse email est déjà enregistrée."
  }
  return "Une erreur est survenue. Veuillez réessayer."
}

// ── Create user ─────────────────────────────────────────────────────────────

export async function createUser(input: {
  nom: string
  prenom: string
  email: string
  role: string
  password: string
  doctorant?: DoctorantInput
  directeurLaboratoireId?: string
}): Promise<{ error: string | null }> {
  const admin = await getSessionUser()
  if (!admin || admin.role !== "ADMIN") return { error: "Vous n'êtes pas autorisé à effectuer cette action." }

  const email = input.email.trim().toLowerCase()

  const { error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
  })
  if (authErr) return { error: supabaseAuthError(authErr) }

  let createdUserId: string | null = null
  try {
    const created = await prisma.user.create({
      data: { email, nom: input.nom.trim(), prenom: input.prenom.trim(), role: input.role as any },
    })
    createdUserId = created.id

    if (input.role === "DOCTORANT" && input.doctorant) {
      const d = input.doctorant
      await prisma.doctorant.create({
        data: {
          userId: created.id,
          cin: d.cin.trim(),
          cne: d.cne.trim(),
          apogee: d.apogee.trim(),
          dateNaissance: new Date(d.dateNaissance),
          telephone: d.telephone.trim(),
          formationDoctorale: d.formationDoctorale.trim(),
          laboratoireId: d.laboratoireId,
          sujetThese: d.sujetThese.trim(),
          anneePremiereInscription: d.anneePremiereInscription,
          encadrantId: d.encadrantId || null,
        },
      })
    }

    if (input.role === "DIRECTEUR_LABO" && input.directeurLaboratoireId) {
      await prisma.laboratoire.update({
        where: { id: input.directeurLaboratoireId },
        data: { directeurId: created.id },
      })
    }

    return { error: null }
  } catch (err: any) {
    // Rollback: remove the Prisma user then the Supabase account
    if (createdUserId) {
      await prisma.laboratoire.updateMany({ where: { directeurId: createdUserId }, data: { directeurId: null } }).catch(() => {})
      await prisma.user.delete({ where: { id: createdUserId } }).catch(() => {})
    }
    const uid = await getSupabaseUid(email)
    if (uid) await supabaseAdmin.auth.admin.deleteUser(uid)
    return { error: prismaUniqueError(err) }
  }
}

// ── Edit user (+ optional doctorant profile upsert) ─────────────────────────

export type DoctorantInput = {
  cin: string
  cne: string
  apogee: string
  dateNaissance: string        // YYYY-MM-DD
  telephone: string
  formationDoctorale: string
  laboratoireId: string
  sujetThese: string
  anneePremiereInscription: number
  encadrantId: string | null
}

export async function editUser(
  id: string,
  input: {
    nom: string
    prenom: string
    email: string
    role: string
    doctorant?: DoctorantInput
    directeurLaboratoireId?: string
  }
): Promise<{ error: string | null }> {
  const admin = await getSessionUser()
  if (!admin || admin.role !== "ADMIN") return { error: "Vous n'êtes pas autorisé à effectuer cette action." }
  if (id === admin.id && input.role !== "ADMIN")
    return { error: "Vous ne pouvez pas modifier votre propre rôle." }

  const newEmail = input.email.trim().toLowerCase()

  try {
    // If email changed, update in Supabase first
    const current = await prisma.user.findUnique({ where: { id }, select: { email: true } })
    if (current && current.email !== newEmail) {
      const uid = await getSupabaseUid(current.email)
      if (uid) {
        const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(uid, {
          email: newEmail,
        })
        if (authErr) return { error: supabaseAuthError(authErr) }
      }
    }

    // Update Prisma User
    await prisma.user.update({
      where: { id },
      data: { nom: input.nom.trim(), prenom: input.prenom.trim(), email: newEmail, role: input.role as any },
    })

    // Upsert Doctorant profile when role is DOCTORANT and fields are provided
    if (input.role === "DOCTORANT" && input.doctorant) {
      const d = input.doctorant
      await prisma.doctorant.upsert({
        where: { userId: id },
        create: {
          userId: id,
          cin: d.cin.trim(),
          cne: d.cne.trim(),
          apogee: d.apogee.trim(),
          dateNaissance: new Date(d.dateNaissance),
          telephone: d.telephone.trim(),
          formationDoctorale: d.formationDoctorale.trim(),
          laboratoireId: d.laboratoireId,
          sujetThese: d.sujetThese.trim(),
          anneePremiereInscription: d.anneePremiereInscription,
          encadrantId: d.encadrantId ?? null,
        },
        update: {
          cin: d.cin.trim(),
          cne: d.cne.trim(),
          apogee: d.apogee.trim(),
          dateNaissance: new Date(d.dateNaissance),
          telephone: d.telephone.trim(),
          formationDoctorale: d.formationDoctorale.trim(),
          laboratoireId: d.laboratoireId,
          sujetThese: d.sujetThese.trim(),
          anneePremiereInscription: d.anneePremiereInscription,
          encadrantId: d.encadrantId ?? null,
        },
      })
    }

    // Update lab assignment for DIRECTEUR_LABO — clear old, set new
    await prisma.laboratoire.updateMany({
      where: { directeurId: id },
      data: { directeurId: null },
    })
    if (input.role === "DIRECTEUR_LABO" && input.directeurLaboratoireId) {
      await prisma.laboratoire.update({
        where: { id: input.directeurLaboratoireId },
        data: { directeurId: id },
      })
    }

    return { error: null }
  } catch (err: any) {
    return { error: prismaUniqueError(err) }
  }
}

// ── Toggle active status ─────────────────────────────────────────────────────

export async function setUserStatus(
  id: string,
  email: string,
  actif: boolean
): Promise<{ error: string | null }> {
  const admin = await getSessionUser()
  if (!admin || admin.role !== "ADMIN") return { error: "Vous n'êtes pas autorisé à effectuer cette action." }
  if (id === admin.id) return { error: "Vous ne pouvez pas modifier votre propre statut." }

  const uid = await getSupabaseUid(email)
  if (uid) {
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(uid, {
      ban_duration: actif ? "none" : "876000h",
    })
    if (authErr) return { error: "Une erreur est survenue. Veuillez réessayer." }
  }

  await prisma.user.update({ where: { id }, data: { actif } })
  return { error: null }
}
