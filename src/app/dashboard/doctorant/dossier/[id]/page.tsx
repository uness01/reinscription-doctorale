import Link from "next/link"
import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// ── Status display maps (mirrors the dashboard page) ───────────────────────

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

const ROLE_LABEL: Record<string, string> = {
  ENCADRANT: "Encadrant",
  ADMIN: "Administration",
  DIRECTEUR_LABO: "Directeur de laboratoire",
  DOYEN: "Doyen",
}

const PUB_TYPE_LABEL: Record<string, string> = {
  article: "Article",
  communication: "Communication",
  poster: "Poster",
  chapitre: "Chapitre d'ouvrage",
}

const ACT_TYPE_LABEL: Record<string, string> = {
  congrès: "Congrès",
  séminaire: "Séminaire",
  stage: "Stage",
  formation: "Formation",
  atelier: "Atelier",
  mobilité: "Mobilité",
}

// Colour the validation decision badge based on the decision string
function decisionClass(decision: string): string {
  const d = decision.toUpperCase()
  if (d.includes("REFUSE")) return "bg-danger-bg text-danger"
  if (d.includes("CORRECTION")) return "bg-danger-bg text-danger"
  return "bg-accent/10 text-accent"
}

function decisionLabel(decision: string): string {
  const map: Record<string, string> = {
    APPROUVE: "Approuvé",
    VALIDE: "Validé",
    REFUSE: "Refusé",
    CORRECTION_DEMANDEE: "Correction demandée",
    SIGNE: "Signé",
  }
  return map[decision.toUpperCase()] ?? decision
}

const fmt = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
})

// ── Page ───────────────────────────────────────────────────────────────────

export default async function DossierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const user = await getSessionUser()
  if (!user) redirect("/login")
  if (user.role !== "DOCTORANT") redirect("/dashboard")

  const dossier = await prisma.dossier.findUnique({
    where: { id },
    include: {
      doctorant: {
        include: {
          user: { select: { nom: true, prenom: true } },
          laboratoire: { select: { nom: true } },
        },
      },
      publications: { orderBy: { annee: "desc" } },
      activites: { orderBy: { date: { sort: "desc", nulls: "last" } } },
      validations: {
        include: {
          valideur: { select: { nom: true, prenom: true, role: true } },
        },
        orderBy: { signedAt: "asc" },
      },
      attestation: true,
    },
  })

  // 404 or ownership check
  if (!dossier || dossier.doctorant.userId !== user.id) {
    redirect("/dashboard/doctorant")
  }

  const { doctorant } = dossier

  return (
    <div className="max-w-2xl">
      {/* Back link */}
      <Link
        href="/dashboard/doctorant"
        className="mb-6 inline-flex text-xs text-muted transition-colors hover:text-accent"
      >
        ← Tableau de bord
      </Link>

      {/* Header */}
      <div className="mb-1 mt-4 h-[3px] w-8 bg-accent" />
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">
        Dossier de réinscription
      </h1>
      <p className="mb-6 text-sm text-muted">
        Année universitaire&nbsp;{dossier.anneeUniversitaire}
      </p>

      {/* Status banner */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded border border-border px-5 py-4">
        <span
          className={`inline-flex rounded px-2.5 py-1 text-xs font-medium ${
            STATUS_CLASS[dossier.status] ?? "bg-border text-muted"
          }`}
        >
          {STATUS_LABEL[dossier.status] ?? dossier.status}
        </span>
        <span className="text-xs text-muted">
          Dernière mise à jour le {fmt.format(new Date(dossier.updatedAt))}
        </span>
      </div>

      {/* ── Attestation download ─────────────────────────────────────────── */}
      {dossier.attestation && (
        <div className="mb-6 flex items-center justify-between rounded border border-accent/30 bg-accent/5 px-5 py-4">
          <div>
            <p className="text-sm font-medium text-foreground">
              Attestation de réinscription disponible
            </p>
            <p className="text-xs text-muted">
              Votre réinscription pour {dossier.anneeUniversitaire} est
              officielle.
            </p>
          </div>
          <a
            href={dossier.attestation.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex rounded bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
          >
            Télécharger
          </a>
        </div>
      )}

      {/* ── Personal info ────────────────────────────────────────────────── */}
      <Section title="Informations personnelles">
        <Row label="Nom" value={doctorant.user.nom} />
        <Row label="Prénom" value={doctorant.user.prenom} />
        <Row label="CIN" value={doctorant.cin} />
        <Row label="CNE" value={doctorant.cne} />
        <Row label="N° Apogée" value={doctorant.apogee} />
        <Row
          label="Date de naissance"
          value={new Date(doctorant.dateNaissance).toLocaleDateString("fr-FR")}
        />
        <Row label="Téléphone" value={doctorant.telephone} />
      </Section>

      {/* ── Doctoral info ────────────────────────────────────────────────── */}
      <Section title="Informations doctorales">
        <Row label="Formation" value={doctorant.formationDoctorale} />
        <Row label="Laboratoire" value={doctorant.laboratoire.nom} />
        <Row label="Sujet de thèse" value={doctorant.sujetThese} />
        <Row
          label="Première inscription"
          value={String(doctorant.anneePremiereInscription)}
        />
      </Section>

      {/* ── Thesis progress ──────────────────────────────────────────────── */}
      <Section title="Avancement de thèse">
        <Row label="Travaux réalisés" value={dossier.travauxRealises ?? "—"} />
        <Row label="État d'avancement" value={dossier.etatAvancement ?? "—"} />
        <Row
          label="Difficultés rencontrées"
          value={dossier.difficultes ?? "—"}
        />
        <Row label="Objectifs futurs" value={dossier.objectifsFuturs ?? "—"} />
      </Section>

      {/* ── Publications ─────────────────────────────────────────────────── */}
      <Section title={`Publications (${dossier.publications.length})`}>
        {dossier.publications.length === 0 ? (
          <Row label="—" value="Aucune publication" />
        ) : (
          dossier.publications.map((p) => (
            <div
              key={p.id}
              className="border-b border-border py-3 last:border-b-0"
            >
              <p className="mb-0.5 text-sm font-medium text-foreground">
                {p.titre}
              </p>
              <p className="text-xs text-muted">
                {PUB_TYPE_LABEL[p.type] ?? p.type}&nbsp;·&nbsp;{p.auteurs}
                &nbsp;·&nbsp;{p.annee}
                {p.revue && <>&nbsp;·&nbsp;{p.revue}</>}
                {p.doi && (
                  <>&nbsp;·&nbsp;<span className="font-mono">{p.doi}</span></>
                )}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Statut&nbsp;: {p.statut}
              </p>
            </div>
          ))
        )}
      </Section>

      {/* ── Scientific activities ─────────────────────────────────────────── */}
      <Section
        title={`Activités scientifiques (${dossier.activites.length})`}
      >
        {dossier.activites.length === 0 ? (
          <Row label="—" value="Aucune activité" />
        ) : (
          dossier.activites.map((a) => (
            <div
              key={a.id}
              className="border-b border-border py-3 last:border-b-0"
            >
              <p className="mb-0.5 text-sm font-medium text-foreground">
                {a.titre}
              </p>
              <p className="text-xs text-muted">
                {ACT_TYPE_LABEL[a.type] ?? a.type}
                {a.lieu && <>&nbsp;·&nbsp;{a.lieu}</>}
                {a.date && (
                  <>&nbsp;·&nbsp;{fmt.format(new Date(a.date))}</>
                )}
              </p>
            </div>
          ))
        )}
      </Section>

      {/* ── Validation history ───────────────────────────────────────────── */}
      <Section title="Historique de validation">
        {dossier.validations.length === 0 ? (
          <div className="py-3">
            <p className="text-sm text-muted">
              Aucune validation enregistrée pour le moment.
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {dossier.validations.map((v, i) => (
              <div
                key={v.id}
                className="flex gap-4 border-b border-border py-4 last:border-b-0"
              >
                {/* Timeline dot */}
                <div className="flex flex-col items-center">
                  <div
                    className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                      v.decision.toUpperCase().includes("REFUSE") ||
                      v.decision.toUpperCase().includes("CORRECTION")
                        ? "bg-danger"
                        : "bg-accent"
                    }`}
                  />
                  {i < dossier.validations.length - 1 && (
                    <div className="mt-1 w-px flex-1 bg-border" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${decisionClass(v.decision)}`}
                    >
                      {decisionLabel(v.decision)}
                    </span>
                    <span className="text-xs font-medium text-foreground">
                      {ROLE_LABEL[v.valideur.role] ?? v.valideur.role}
                    </span>
                    <span className="text-xs text-muted">
                      {v.valideur.prenom} {v.valideur.nom}
                    </span>
                  </div>
                  <p className="text-xs text-muted">
                    {fmt.format(new Date(v.signedAt))}
                  </p>
                  {v.commentaire && (
                    <p className="mt-2 rounded border border-border bg-background px-3 py-2 text-sm text-foreground">
                      {v.commentaire}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

// ── Helper components ──────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-5 rounded border border-border">
      <div className="border-b border-border px-5 py-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          {title}
        </h2>
      </div>
      <div className="px-5">{children}</div>
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-6 border-b border-border py-3 last:border-b-0">
      <span className="w-40 shrink-0 text-xs text-muted">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  )
}
