import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function currentAcademicYear(): string {
  const now = new Date()
  const y = now.getFullYear()
  return now.getMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`
}

const STATUS_LABEL: Record<string, string> = {
  BROUILLON: "Brouillon",
  SOUMIS: "Soumis",
  EN_ATTENTE_ENCADRANT: "En attente encadrant",
  CORRECTION_DEMANDEE: "Correction demandée",
  REFUSE: "Refusé",
  VALIDE_ENCADRANT: "Validé encadrant",
  EN_ATTENTE_ADMIN: "En attente admin",
  VALIDE_ADMIN: "Validé admin",
  EN_ATTENTE_DIRECTEUR: "En attente directeur",
  SIGNE_DIRECTEUR: "Signé directeur",
  EN_ATTENTE_DOYEN: "En attente doyen",
  VALIDE_DEFINITIVEMENT: "Validé définitivement",
  REINSCRIPTION_EFFECTUEE: "Réinscription effectuée",
  ATTESTATION_GENEREE: "Attestation générée",
  ARCHIVE: "Archivé",
}

const COMPLETED = new Set([
  "VALIDE_DEFINITIVEMENT",
  "REINSCRIPTION_EFFECTUEE",
  "ATTESTATION_GENEREE",
])

export default async function DirecteurStatsPage() {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  if (user.role !== "DIRECTEUR_LABO") redirect("/dashboard")

  const laboratoire = await prisma.laboratoire.findUnique({
    where: { directeurId: user.id },
    select: { id: true, nom: true },
  })

  if (!laboratoire) {
    return (
      <div className="max-w-2xl">
        <div className="mb-1 h-[3px] w-8 bg-accent" />
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">
          Statistiques
        </h1>
        <div className="rounded border border-border px-5 py-4">
          <p className="text-sm text-muted">
            Aucun laboratoire assigné à votre compte. Contactez l&apos;administration.
          </p>
        </div>
      </div>
    )
  }

  const annee = currentAcademicYear()

  const [totalDoctorants, allDossiers, dossiersAnnee] = await Promise.all([
    prisma.doctorant.count({ where: { laboratoireId: laboratoire.id } }),

    prisma.dossier.findMany({
      where: { laboratoireId: laboratoire.id },
      select: { status: true },
    }),

    prisma.dossier.count({
      where: { laboratoireId: laboratoire.id, anneeUniversitaire: annee },
    }),
  ])

  const totalDossiers = allDossiers.length
  const dossiersCompleted = allDossiers.filter((d) => COMPLETED.has(d.status)).length
  const tauxValidation =
    totalDossiers > 0 ? Math.round((dossiersCompleted / totalDossiers) * 100) : 0

  // Count per status, sorted by count desc
  const statusMap = new Map<string, number>()
  for (const d of allDossiers) {
    statusMap.set(d.status, (statusMap.get(d.status) ?? 0) + 1)
  }
  const statusRows = Array.from(statusMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => ({ status, label: STATUS_LABEL[status] ?? status, count }))

  return (
    <div className="max-w-2xl">
      <div className="mb-1 h-[3px] w-8 bg-accent" />
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">
        Statistiques
      </h1>
      <p className="mb-8 text-sm text-muted">
        {laboratoire.nom} — année {annee}
      </p>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Doctorants" value={String(totalDoctorants)} sub="inscrits" />
        <StatCard
          label="Dossiers cette année"
          value={String(dossiersAnnee)}
          sub={annee}
        />
        <StatCard
          label="Taux de validation"
          value={`${tauxValidation}%`}
          sub={`${dossiersCompleted} / ${totalDossiers}`}
        />
        <StatCard
          label="Total dossiers"
          value={String(totalDossiers)}
          sub="toutes années"
        />
      </div>

      <div className="rounded border border-border">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            Répartition par statut
          </h2>
        </div>
        {statusRows.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-muted">Aucune donnée disponible.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-5 py-2.5 text-[10px] font-medium uppercase tracking-wider text-muted">
                  Statut
                </th>
                <th className="px-5 py-2.5 text-right text-[10px] font-medium uppercase tracking-wider text-muted">
                  Dossiers
                </th>
                <th className="px-5 py-2.5 text-right text-[10px] font-medium uppercase tracking-wider text-muted">
                  %
                </th>
              </tr>
            </thead>
            <tbody>
              {statusRows.map(({ status, label, count }) => (
                <tr
                  key={status}
                  className="border-b border-border last:border-b-0"
                >
                  <td className="px-5 py-3 text-foreground">{label}</td>
                  <td className="px-5 py-3 text-right font-medium text-foreground">
                    {count}
                  </td>
                  <td className="px-5 py-3 text-right text-muted">
                    {totalDossiers > 0
                      ? Math.round((count / totalDossiers) * 100)
                      : 0}
                    %
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded border border-border px-5 py-4">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted">
        {label}
      </p>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-muted">{sub}</p>}
    </div>
  )
}
