"use server"

import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type PubInput = {
  titre: string
  type: string
  auteurs: string
  revue: string
  annee: string
  doi: string
  statut: string
}

type ActInput = {
  type: string
  titre: string
  lieu: string
  date: string
}

export async function saveDossier(input: {
  dossierId: string | null
  doctorantId: string
  laboratoireId: string
  anneeUniversitaire: string
  travauxRealises: string
  etatAvancement: string
  difficultes: string
  objectifsFuturs: string
  publications: PubInput[]
  activites: ActInput[]
  status: "BROUILLON" | "SOUMIS"
}): Promise<{ error: string | null }> {
  const user = await getSessionUser()
  if (!user || user.role !== "DOCTORANT") return { error: "Non autorisé" }

  // Verify the doctorantId belongs to the authenticated user
  const owned = await prisma.doctorant.findFirst({
    where: { id: input.doctorantId, userId: user.id },
    select: { id: true },
  })
  if (!owned) return { error: "Non autorisé" }

  const dossierFields = {
    travauxRealises: input.travauxRealises || null,
    etatAvancement: input.etatAvancement || null,
    difficultes: input.difficultes || null,
    objectifsFuturs: input.objectifsFuturs || null,
    status: input.status,
  }

  const pubs = input.publications.map((p) => ({
    titre: p.titre,
    type: p.type,
    auteurs: p.auteurs,
    revue: p.revue || null,
    annee: parseInt(p.annee) || new Date().getFullYear(),
    doi: p.doi || null,
    statut: p.statut,
  }))

  const acts = input.activites.map((a) => ({
    type: a.type,
    titre: a.titre,
    lieu: a.lieu || null,
    date: a.date ? new Date(a.date) : null,
  }))

  try {
    if (input.dossierId) {
      // Update dossier fields, then replace publications and activities
      await prisma.dossier.update({
        where: { id: input.dossierId },
        data: dossierFields,
      })
      await prisma.publication.deleteMany({ where: { dossierId: input.dossierId } })
      await prisma.activiteScientifique.deleteMany({ where: { dossierId: input.dossierId } })
      if (pubs.length > 0) {
        await prisma.publication.createMany({
          data: pubs.map((p) => ({ ...p, dossierId: input.dossierId! })),
        })
      }
      if (acts.length > 0) {
        await prisma.activiteScientifique.createMany({
          data: acts.map((a) => ({ ...a, dossierId: input.dossierId! })),
        })
      }
    } else {
      // Create dossier with all nested data in one write
      await prisma.dossier.create({
        data: {
          doctorantId: input.doctorantId,
          laboratoireId: input.laboratoireId,
          anneeUniversitaire: input.anneeUniversitaire,
          ...dossierFields,
          publications: { create: pubs },
          activites: { create: acts },
        },
      })
    }
    return { error: null }
  } catch (err) {
    console.error("saveDossier:", err)
    return { error: "Une erreur est survenue. Veuillez réessayer." }
  }
}
