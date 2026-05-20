import Link from "next/link"
import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Sep–Aug academic cycle: Oct 2024 → "2024-2025", Mar 2025 → "2024-2025"
function currentAcademicYear(): string {
  const now = new Date()
  const y = now.getFullYear()
  return now.getMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`
}

// Statuses that count as a successfully completed reinscription for a past year
const COMPLETED = new Set([
  "REINSCRIPTION_EFFECTUEE",
  "VALIDE_DEFINITIVEMENT",
  "ATTESTATION_GENEREE",
])

const STATUS_LABEL: Record<string, string> = {
  BROUILLON: "Brouillon",
  SOUMIS: "Soumis",
  EN_ATTENTE_ENCADRANT: "En attente de l'encadrant",
  CORRECTION_DEMANDEE: "Correction demandée",
  REFUSE: "Refusé",
  VALIDE_ENCADRANT: "Validé par l'encadrant",
  EN_ATTENTE_ADMIN: "En attente de l'administration",
  VALIDE_ADMIN: "Validé par l'administration",
  EN_ATTENTE_DIRECTEUR: "En attente du directeur de labo",
  SIGNE_DIRECTEUR: "Signé par le directeur",
  EN_ATTENTE_DOYEN: "En attente du doyen",
  VALIDE_DEFINITIVEMENT: "Validé définitivement",
  REINSCRIPTION_EFFECTUEE: "Réinscription effectuée",
  ATTESTATION_GENEREE: "Attestation générée",
  ARCHIVE: "Archivé",
}

const STATUS_CLASS: Record<string, string> = {
  BROUILLON: "bg-border text-muted",
  SOUMIS: "bg-accent/10 text-accent",
  EN_ATTENTE_ENCADRANT: "bg-accent/10 text-accent",
  CORRECTION_DEMANDEE: "bg-danger-bg text-danger",
  REFUSE: "bg-danger-bg text-danger",
  VALIDE_ENCADRANT: "bg-accent/10 text-accent",
  EN_ATTENTE_ADMIN: "bg-accent/10 text-accent",
  VALIDE_ADMIN: "bg-accent/10 text-accent",
  EN_ATTENTE_DIRECTEUR: "bg-accent/10 text-accent",
  SIGNE_DIRECTEUR: "bg-accent/10 text-accent",
  EN_ATTENTE_DOYEN: "bg-accent/10 text-accent",
  VALIDE_DEFINITIVEMENT: "bg-accent/20 text-accent-dark",
  REINSCRIPTION_EFFECTUEE: "bg-accent/20 text-accent-dark",
  ATTESTATION_GENEREE: "bg-accent/20 text-accent-dark",
  ARCHIVE: "bg-border text-muted",
}

const STATUS_HINT: Record<string, string> = {
  BROUILLON:
    "Votre dossier est en cours de rédaction. Complétez-le et soumettez-le.",
  SOUMIS: "Votre dossier a été soumis et est en cours d'examen.",
  EN_ATTENTE_ENCADRANT:
    "Votre dossier attend la validation de votre encadrant.",
  CORRECTION_DEMANDEE:
    "Des corrections ont été demandées. Veuillez mettre à jour votre dossier.",
  REFUSE:
    "Votre dossier a été refusé. Contactez votre encadrant pour plus d'informations.",
  VALIDE_ENCADRANT:
    "Votre encadrant a validé votre dossier. Il est transmis à l'administration.",
  EN_ATTENTE_ADMIN: "L'administration examine votre dossier.",
  VALIDE_ADMIN:
    "L'administration a validé votre dossier. Il est transmis au directeur de labo.",
  EN_ATTENTE_DIRECTEUR:
    "Le directeur de laboratoire examine votre dossier.",
  SIGNE_DIRECTEUR: "Le directeur de laboratoire a signé votre dossier.",
  EN_ATTENTE_DOYEN:
    "Le doyen examine votre dossier pour validation finale.",
  VALIDE_DEFINITIVEMENT: "Votre dossier a été validé définitivement.",
  REINSCRIPTION_EFFECTUEE:
    "Votre réinscription a été effectuée avec succès.",
  ATTESTATION_GENEREE:
    "Votre attestation de réinscription est disponible.",
  ARCHIVE: "Ce dossier a été archivé.",
}

export default async function DoctorantPage() {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  if (user.role !== "DOCTORANT") redirect("/dashboard")

  const annee = currentAcademicYear()
  // The calendar year in which this academic year starts (e.g. 2024 for "2024-2025")
  const currentStartYear = parseInt(annee.split("-")[0])

  const doctorant = await prisma.doctorant.findUnique({
    where: { userId: user.id },
    include: { laboratoire: { select: { nom: true } } },
  })

  // ── No profile ────────────────────────────────────────────────────────────
  if (!doctorant) {
    return (
      <div className="max-w-2xl">
        <div className="mb-6 h-[3px] w-8 bg-accent" />
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">
          Bonjour, {user.prenom} {user.nom}
        </h1>
        <div className="rounded border border-border px-5 py-4">
          <p className="text-sm text-muted">
            Aucun profil doctorant associé à ce compte. Contactez
            l&apos;administration.
          </p>
        </div>
      </div>
    )
  }

  // ── Eligibility calculation ───────────────────────────────────────────────
  // Year 1 = anneePremiereInscription (initial enrollment, no reinscription needed)
  // Year 2 onward = annual reinscription required
  const anneeThese =
    currentStartYear - doctorant.anneePremiereInscription + 1

  // Academic year strings that must have a completed dossier before the current year
  const requiredPastYears: string[] = []
  for (
    let y = doctorant.anneePremiereInscription + 1;
    y < currentStartYear;
    y++
  ) {
    requiredPastYears.push(`${y}-${y + 1}`)
  }

  // Fetch past + current dossiers in one query, keep latest per year
  const allDossiers = await prisma.dossier.findMany({
    where: {
      doctorantId: doctorant.id,
      anneeUniversitaire: { in: [...requiredPastYears, annee] },
    },
    select: {
      id: true,
      anneeUniversitaire: true,
      status: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  })

  // Index by year — first entry wins (desc order = most recent)
  const byYear = new Map<string, (typeof allDossiers)[number]>()
  for (const d of allDossiers) {
    if (!byYear.has(d.anneeUniversitaire)) byYear.set(d.anneeUniversitaire, d)
  }

  // First past year that is missing or not yet completed
  let missingYear: string | null = null
  for (const year of requiredPastYears) {
    const d = byYear.get(year)
    if (!d || !COMPLETED.has(d.status)) {
      missingYear = year
      break
    }
  }

  const currentDossier = byYear.get(annee) ?? null

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-6 h-[3px] w-8 bg-accent" />
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">
        Bonjour, {user.prenom} {user.nom}
      </h1>
      <p className="mb-8 text-sm text-muted">
        Année universitaire&nbsp;{annee}&nbsp;&nbsp;·&nbsp;&nbsp;Année de
        thèse&nbsp;:&nbsp;{anneeThese}
      </p>

      {/* Doctoral info */}
      <section className="mb-5 rounded border border-border">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            Informations doctorales
          </h2>
        </div>
        <dl>
          <InfoRow label="Formation" value={doctorant.formationDoctorale} />
          <InfoRow label="Laboratoire" value={doctorant.laboratoire.nom} />
          <InfoRow label="Sujet de thèse" value={doctorant.sujetThese} />
          <InfoRow
            label="Première inscription"
            value={String(doctorant.anneePremiereInscription)}
          />
          <InfoRow label="Année de thèse" value={`Année ${anneeThese}`} />
        </dl>
      </section>

      {/* Reinscription section */}
      <section className="rounded border border-border">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            Réinscription {annee}
          </h2>
        </div>

        <div className="px-5 py-5">
          {missingYear !== null ? (
            // ── Gap found: block with error ──────────────────────────────
            <div className="rounded border border-danger/20 bg-danger-bg px-4 py-4">
              <p className="mb-1 text-sm font-medium text-danger">
                Dossier manquant
              </p>
              <p className="text-sm text-danger">
                Votre dossier de réinscription pour l&apos;année{" "}
                <span className="font-medium">{missingYear}</span> est manquant.
                Veuillez contacter l&apos;administration.
              </p>
            </div>
          ) : currentDossier !== null ? (
            // ── Eligible, dossier already exists: show status ────────────
            <>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex rounded px-2.5 py-1 text-xs font-medium ${
                    STATUS_CLASS[currentDossier.status] ??
                    "bg-border text-muted"
                  }`}
                >
                  {STATUS_LABEL[currentDossier.status] ??
                    currentDossier.status}
                </span>
                <span className="text-xs text-muted">
                  Mis à jour le{" "}
                  {new Intl.DateTimeFormat("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }).format(new Date(currentDossier.updatedAt))}
                </span>
              </div>
              <p className="text-sm text-muted">
                {STATUS_HINT[currentDossier.status] ??
                  "Votre dossier est en cours de traitement."}
              </p>
            </>
          ) : (
            // ── Eligible, no dossier yet: show CTA ──────────────────────
            <>
              <p className="mb-5 text-sm text-muted">
                Vous n&apos;avez pas encore de dossier pour l&apos;année
                universitaire {annee}. Commencez votre réinscription dès
                maintenant.
              </p>
              <Link
                href="/dashboard/doctorant/reinscription"
                className="inline-flex rounded bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
              >
                Commencer la réinscription
              </Link>
            </>
          )}
        </div>
      </section>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-6 border-b border-border px-5 py-3 last:border-b-0">
      <dt className="w-36 shrink-0 text-xs text-muted">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  )
}
