import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  StatusChart,
  LaboChart,
  FormationChart,
  PubTypeChart,
  AnneeChart,
} from "./Charts"

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

export default async function AdminStatsPage() {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  if (user.role !== "ADMIN") redirect("/dashboard")

  const annee = currentAcademicYear()

  // ── Parallel data fetch ───────────────────────────────────────────────────

  const [
    totalDoctorants,
    allDossiers,
    dossiersAnnee,
    labos,
    formationGroups,
    pubGroups,
    anneeGroups,
  ] = await Promise.all([
    prisma.doctorant.count(),

    prisma.dossier.findMany({ select: { status: true } }),

    prisma.dossier.count({ where: { anneeUniversitaire: annee } }),

    prisma.laboratoire.findMany({
      include: { _count: { select: { doctorants: true } } },
      orderBy: { nom: "asc" },
    }),

    // groupBy without _count-in-orderBy to keep the return type simple; sort in JS
    prisma.doctorant.groupBy({
      by: ["formationDoctorale"],
      _count: { _all: true },
    }),

    prisma.publication.groupBy({
      by: ["type"],
      _count: { _all: true },
    }),

    prisma.dossier.groupBy({
      by: ["anneeUniversitaire"],
      _count: { _all: true },
      where: {
        status: {
          in: ["VALIDE_DEFINITIVEMENT", "REINSCRIPTION_EFFECTUEE", "ATTESTATION_GENEREE"] as any,
        },
      },
    }),
  ])

  // ── Derived stats ─────────────────────────────────────────────────────────

  const totalDossiers = allDossiers.length
  const dossiersCompleted = allDossiers.filter((d) => COMPLETED.has(d.status)).length
  const dossiersRefus = allDossiers.filter((d) => d.status === "REFUSE").length
  const tauxValidation =
    totalDossiers > 0 ? Math.round((dossiersCompleted / totalDossiers) * 100) : 0

  // ── Chart data ────────────────────────────────────────────────────────────

  // Status distribution — group by status, sorted by count desc
  const statusMap = new Map<string, number>()
  for (const d of allDossiers) {
    statusMap.set(d.status, (statusMap.get(d.status) ?? 0) + 1)
  }
  const statusData = Array.from(statusMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => ({
      label: STATUS_LABEL[status] ?? status,
      count,
    }))

  const laboData = labos.map((l) => ({
    nom: l.nom,
    count: l._count.doctorants,
  }))

  const formationData = formationGroups
    .map((f) => ({ formation: f.formationDoctorale, count: f._count?._all ?? 0 }))
    .sort((a, b) => b.count - a.count)

  const pubTypeData = pubGroups
    .map((p) => ({ type: p.type, count: p._count?._all ?? 0 }))
    .sort((a, b) => b.count - a.count)

  const anneeData = anneeGroups
    .map((a) => ({ annee: a.anneeUniversitaire, count: a._count?._all ?? 0 }))
    .sort((a, b) => a.annee.localeCompare(b.annee))

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-1 h-[3px] w-8 bg-accent" />
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">
        Statistiques
      </h1>
      <p className="mb-8 text-sm text-muted">
        Vue d&apos;ensemble de la plateforme — année {annee}
      </p>

      {/* ── Summary cards ───────────────────────────────────────────────── */}
      <div className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Doctorants"
          value={String(totalDoctorants)}
          sub="inscrits"
        />
        <StatCard
          label="Dossiers cette année"
          value={String(dossiersAnnee)}
          sub={annee}
        />
        <StatCard
          label="Taux de validation"
          value={`${tauxValidation}%`}
          sub={`${dossiersCompleted} / ${totalDossiers} dossiers`}
        />
        <StatCard
          label="Refus"
          value={String(dossiersRefus)}
          sub="dossiers refusés"
          danger={dossiersRefus > 0}
        />
      </div>

      {/* ── Status distribution (full width) ────────────────────────────── */}
      {statusData.length > 0 && (
        <div className="mb-6">
          <StatusChart data={statusData} />
        </div>
      )}

      {/* ── Labo + Formation (2 columns) ─────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
        {laboData.length > 0 ? (
          <LaboChart data={laboData} />
        ) : (
          <EmptyChart title="Répartition par laboratoire" />
        )}
        {formationData.length > 0 ? (
          <FormationChart data={formationData} />
        ) : (
          <EmptyChart title="Répartition par formation doctorale" />
        )}
      </div>

      {/* ── Publications + Évolution (2 columns) ─────────────────────────── */}
      <div className="grid grid-cols-2 gap-6">
        {pubTypeData.length > 0 ? (
          <PubTypeChart data={pubTypeData} />
        ) : (
          <EmptyChart title="Publications par type" />
        )}
        {anneeData.length > 0 ? (
          <AnneeChart data={anneeData} />
        ) : (
          <EmptyChart title="Évolution des réinscriptions" />
        )}
      </div>
    </div>
  )
}

// ── Helper components ──────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  danger,
}: {
  label: string
  value: string
  sub?: string
  danger?: boolean
}) {
  return (
    <div className="rounded border border-border px-5 py-4">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted">
        {label}
      </p>
      <p
        className={`text-2xl font-semibold ${
          danger ? "text-danger" : "text-foreground"
        }`}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[10px] text-muted">{sub}</p>}
    </div>
  )
}

function EmptyChart({ title }: { title: string }) {
  return (
    <div className="rounded border border-border">
      <div className="border-b border-border px-5 py-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          {title}
        </h2>
      </div>
      <div className="flex items-center justify-center px-5 py-12">
        <p className="text-sm text-muted">Aucune donnée disponible.</p>
      </div>
    </div>
  )
}
