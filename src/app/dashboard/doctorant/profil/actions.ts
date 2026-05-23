"use server"

import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function updateProfil(input: {
  telephone: string
  sujetThese: string
}): Promise<{ error: string | null }> {
  const user = await getSessionUser()
  if (!user || user.role !== "DOCTORANT") return { error: "Vous n'êtes pas autorisé à effectuer cette action." }

  const telephone = input.telephone.trim()
  const sujetThese = input.sujetThese.trim()

  if (!telephone) return { error: "Le téléphone est requis." }
  if (!sujetThese) return { error: "Le sujet de thèse est requis." }

  try {
    await prisma.doctorant.update({
      where: { userId: user.id },
      data: { telephone, sujetThese },
    })
    return { error: null }
  } catch (err) {
    console.error("updateProfil:", err)
    return { error: "Une erreur est survenue. Veuillez réessayer." }
  }
}
