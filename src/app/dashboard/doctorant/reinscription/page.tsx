import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import ReinscriptionForm from "./ReinscriptionForm"

function currentAcademicYear(): string {
  const now = new Date()
  const y = now.getFullYear()
  return now.getMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`
}

export default async function ReinscriptionPage() {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  if (user.role !== "DOCTORANT") redirect("/dashboard")

  const doctorant = await prisma.doctorant.findUnique({
    where: { userId: user.id },
    include: {
      user: { select: { nom: true, prenom: true } },
      laboratoire: { select: { nom: true } },
    },
  })

  if (!doctorant) redirect("/dashboard/doctorant")

  const annee = currentAcademicYear()

  // Load existing BROUILLON or CORRECTION_DEMANDEE for pre-filling
  const draft = await prisma.dossier.findFirst({
    where: {
      doctorantId: doctorant.id,
      anneeUniversitaire: annee,
      status: { in: ["BROUILLON", "CORRECTION_DEMANDEE"] },
    },
    include: { publications: true, activites: true },
    orderBy: { updatedAt: "desc" },
  })

  // Fetch the correction comment so it can be shown throughout the form
  let correctionComment: string | null = null
  if (draft?.status === "CORRECTION_DEMANDEE") {
    const correction = await prisma.validation.findFirst({
      where: { dossierId: draft.id, decision: "CORRECTION_DEMANDEE" },
      select: { commentaire: true },
      orderBy: { signedAt: "desc" },
    })
    correctionComment = correction?.commentaire ?? null
  }

  return (
    <ReinscriptionForm
      annee={annee}
      doctorantId={doctorant.id}
      laboratoireId={doctorant.laboratoireId}
      personalInfo={{
        nom: doctorant.user.nom,
        prenom: doctorant.user.prenom,
        cin: doctorant.cin,
        cne: doctorant.cne,
        apogee: doctorant.apogee,
        // Date must be serialised to string before crossing the server→client boundary
        dateNaissance: doctorant.dateNaissance.toLocaleDateString("fr-FR"),
        telephone: doctorant.telephone,
      }}
      doctoralInfo={{
        formation: doctorant.formationDoctorale,
        laboratoire: doctorant.laboratoire.nom,
        sujetThese: doctorant.sujetThese,
        anneePremiereInscription: doctorant.anneePremiereInscription,
      }}
      correctionComment={correctionComment}
      draft={
        draft
          ? {
              id: draft.id,
              travauxRealises: draft.travauxRealises ?? "",
              etatAvancement: draft.etatAvancement ?? "",
              difficultes: draft.difficultes ?? "",
              objectifsFuturs: draft.objectifsFuturs ?? "",
              publications: draft.publications.map((p) => ({
                titre: p.titre,
                type: p.type,
                auteurs: p.auteurs,
                revue: p.revue ?? "",
                annee: String(p.annee),
                doi: p.doi ?? "",
                statut: p.statut,
              })),
              activites: draft.activites.map((a) => ({
                type: a.type,
                titre: a.titre,
                lieu: a.lieu ?? "",
                date: a.date ? a.date.toISOString().split("T")[0] : "",
              })),
            }
          : null
      }
    />
  )
}
