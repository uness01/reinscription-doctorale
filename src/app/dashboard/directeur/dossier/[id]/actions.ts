"use server"

import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function signerDossier(
  dossierId: string,
  commentaire: string
): Promise<{ error: string | null }> {
  const user = await getSessionUser()
  if (!user || user.role !== "DIRECTEUR_LABO") return { error: "Non autorisé" }

  // Only sign dossiers that have been validated by the administration
  const dossier = await prisma.dossier.findFirst({
    where: { id: dossierId, status: "VALIDE_ADMIN" },
    select: { id: true },
  })
  if (!dossier) return { error: "Dossier introuvable ou déjà traité." }

  try {
    await prisma.dossier.update({
      where: { id: dossierId },
      data: { status: "SIGNE_DIRECTEUR" },
    })

    await prisma.validation.create({
      data: {
        dossierId,
        valideurId: user.id,
        role: "DIRECTEUR_LABO",
        decision: "SIGNE",
        commentaire: commentaire.trim() || null,
      },
    })

    return { error: null }
  } catch (err) {
    console.error("signerDossier:", err)
    return { error: "Une erreur est survenue. Veuillez réessayer." }
  }
}
