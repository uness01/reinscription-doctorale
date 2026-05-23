import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import DirecteurDossierList, { type DossierItem } from "./DirecteurDossierList"

export default async function DirecteurPage() {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  if (user.role !== "DIRECTEUR_LABO") redirect("/dashboard")

  // Find the laboratory assigned to this directeur
  const laboratoire = await prisma.laboratoire.findUnique({
    where: { directeurId: user.id },
    select: { id: true, nom: true },
  })

  if (!laboratoire) {
    return (
      <div className="max-w-2xl">
        <div className="mb-6 h-[3px] w-8 bg-accent" />
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">
          Bonjour, {user.prenom} {user.nom}
        </h1>
        <div className="rounded border border-border px-5 py-4">
          <p className="text-sm text-muted">
            Aucun laboratoire assigné à votre compte. Contactez
            l&apos;administration.
          </p>
        </div>
      </div>
    )
  }

  const allDossiers = await prisma.dossier.findMany({
    where: { laboratoireId: laboratoire.id },
    include: {
      doctorant: {
        include: {
          user: { select: { nom: true, prenom: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  // Serialise — strip non-transferable Date fields
  const dossierItems: DossierItem[] = allDossiers.map((d) => ({
    id: d.id,
    anneeUniversitaire: d.anneeUniversitaire,
    status: d.status,
    doctorant: { user: { nom: d.doctorant.user.nom, prenom: d.doctorant.user.prenom } },
  }))

  return (
    <div className="max-w-2xl">
      <div className="mb-6 h-[3px] w-8 bg-accent" />
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">
        Bonjour, {user.prenom} {user.nom}
      </h1>
      <p className="mb-6 text-sm text-muted">
        {laboratoire.nom}&nbsp;&nbsp;·&nbsp;&nbsp;Signez les dossiers validés par
        l&apos;administration.
      </p>

      {/* Stats — always show totals, unaffected by search/filter */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="À signer"
          value={String(allDossiers.filter((d) => d.status === "VALIDE_ADMIN").length)}
        />
        <StatCard
          label="Signés"
          value={String(
            allDossiers.filter((d) =>
              ["SIGNE_DIRECTEUR", "EN_ATTENTE_DOYEN", "VALIDE_DEFINITIVEMENT",
               "REINSCRIPTION_EFFECTUEE", "ATTESTATION_GENEREE"].includes(d.status)
            ).length
          )}
        />
        <StatCard label="Total" value={String(allDossiers.length)} />
      </div>

      <DirecteurDossierList dossiers={dossierItems} />
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border px-5 py-4">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted">
        {label}
      </p>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
    </div>
  )
}
