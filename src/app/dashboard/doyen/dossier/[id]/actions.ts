"use server"

import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function validerDefinitivement(
  dossierId: string,
  commentaire: string,
  signature: string
): Promise<{ error: string | null }> {
  const user = await getSessionUser()
  if (!user || user.role !== "DOYEN") return { error: "Non autorisé" }

  const dossier = await prisma.dossier.findFirst({
    where: { id: dossierId, status: "SIGNE_DIRECTEUR" },
    select: { id: true },
  })
  if (!dossier) return { error: "Dossier introuvable ou déjà traité." }

  try {
    await prisma.validation.create({
      data: {
        dossierId,
        valideurId: user.id,
        role: "DOYEN",
        decision: "VALIDE_DEFINITIVEMENT",
        commentaire: commentaire.trim() || null,
        signature,
      },
    })

    await prisma.dossier.update({
      where: { id: dossierId },
      data: { status: "VALIDE_DEFINITIVEMENT" },
    })

    return { error: null }
  } catch (err) {
    console.error("validerDefinitivement error:", err)
    return { error: "Une erreur est survenue. Veuillez réessayer." }
  }
}
