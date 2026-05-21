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

// ── Create user ─────────────────────────────────────────────────────────────

export async function createUser(input: {
  nom: string
  prenom: string
  email: string
  role: string
  password: string
}): Promise<{ error: string | null }> {
  const admin = await getSessionUser()
  if (!admin || admin.role !== "ADMIN") return { error: "Non autorisé" }

  const email = input.email.trim().toLowerCase()

  const { error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
  })
  if (authErr) return { error: authErr.message }

  try {
    await prisma.user.create({
      data: { email, nom: input.nom.trim(), prenom: input.prenom.trim(), role: input.role as any },
    })
    return { error: null }
  } catch (err: any) {
    const uid = await getSupabaseUid(email)
    if (uid) await supabaseAdmin.auth.admin.deleteUser(uid)
    return { error: err.message ?? "Erreur lors de la création." }
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
  }
): Promise<{ error: string | null }> {
  const admin = await getSessionUser()
  if (!admin || admin.role !== "ADMIN") return { error: "Non autorisé" }
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
        if (authErr) return { error: authErr.message }
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

    return { error: null }
  } catch (err: any) {
    return { error: err.message ?? "Erreur lors de la modification." }
  }
}

// ── Toggle active status ─────────────────────────────────────────────────────

export async function setUserStatus(
  id: string,
  email: string,
  actif: boolean
): Promise<{ error: string | null }> {
  const admin = await getSessionUser()
  if (!admin || admin.role !== "ADMIN") return { error: "Non autorisé" }
  if (id === admin.id) return { error: "Vous ne pouvez pas modifier votre propre statut." }

  const uid = await getSupabaseUid(email)
  if (uid) {
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(uid, {
      ban_duration: actif ? "none" : "876000h",
    })
    if (authErr) return { error: authErr.message }
  }

  await prisma.user.update({ where: { id }, data: { actif } })
  return { error: null }
}
