"use server"

import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Decision = "APPROUVE" | "REFUSE" | "CORRECTION_DEMANDEE"

const NEXT_STATUS: Record<Decision, string> = {
  APPROUVE: "VALIDE_ENCADRANT",
  REFUSE: "REFUSE",
  CORRECTION_DEMANDEE: "CORRECTION_DEMANDEE",
}

export async function soumettreDecision(
  dossierId: string,
  decision: Decision,
  commentaire: string
): Promise<{ error: string | null }> {
  const user = await getSessionUser()
  if (!user || user.role !== "ENCADRANT") return { error: "Non autorisé" }

  const encadrant = await prisma.encadrant.findUnique({
    where: { userId: user.id },
    select: { id: true },
  })
  if (!encadrant) return { error: "Profil encadrant introuvable" }

  // Verify the dossier is assigned to this encadrant and awaiting their decision
  const dossier = await prisma.dossier.findFirst({
    where: {
      id: dossierId,
      encadrantId: encadrant.id,
      status: "EN_ATTENTE_ENCADRANT",
    },
    select: { id: true },
  })
  if (!dossier) {
    return {
      error:
        "Dossier introuvable ou déjà traité.",
    }
  }

  try {
    await prisma.dossier.update({
      where: { id: dossierId },
      data: { status: NEXT_STATUS[decision] as any },
    })

    await prisma.validation.create({
      data: {
        dossierId,
        valideurId: user.id,
        role: "ENCADRANT",
        decision,
        commentaire: commentaire.trim() || null,
      },
    })

    return { error: null }
  } catch (err) {
    console.error("soumettreDecision:", err)
    return { error: "Une erreur est survenue. Veuillez réessayer." }
  }
}
