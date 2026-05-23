import Link from "next/link"
import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import ValidationPanel from "./ValidationPanel"

const STATUS_LABEL: Record<string, string> = {
  SOUMIS: "Soumis",
  EN_ATTENTE_ENCADRANT: "En attente de l'encadrant",
  CORRECTION_DEMANDEE: "Correction demandée",
  REFUSE: "Refusé",
  VALIDE_ENCADRANT: "Validé par l'encadrant",
  VALIDE_ADMIN: "Validé par l'administration",
  SIGNE_DIRECTEUR: "Signé par le directeur",
  EN_ATTENTE_DOYEN: "En attente du doyen",
  VALIDE_DEFINITIVEMENT: "Validé définitivement",
  REINSCRIPTION_EFFECTUEE: "Réinscription effectuée",
  ATTESTATION_GENEREE: "Attestation générée",
  ARCHIVE: "Archivé",
}

const STATUS_CLASS: Record<string, string> = {
  EN_ATTENTE_ENCADRANT: "bg-accent/10 text-accent",
  CORRECTION_DEMANDEE: "bg-warning-bg text-warning",
  REFUSE: "bg-danger-bg text-danger",
  VALIDE_ENCADRANT: "bg-success/10 text-success",
  VALIDE_ADMIN: "bg-success/10 text-success",
  SIGNE_DIRECTEUR: "bg-success/10 text-success",
  VALIDE_DEFINITIVEMENT: "bg-success/20 text-success",
  REINSCRIPTION_EFFECTUEE: "bg-success/20 text-success",
  ATTESTATION_GENEREE: "bg-success/20 text-success",
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

function decisionClass(decision: string) {
  const d = decision.toUpperCase()
  if (d.includes("REFUSE")) return "bg-danger-bg text-danger"
  if (d.includes("CORRECTION")) return "bg-warning-bg text-warning"
  return "bg-success/10 text-success"
}

function decisionLabel(decision: string) {
  const map: Record<string, string> = {
    APPROUVE: "Approuvé",
    VALIDE: "Validé",
    VALIDE_DEFINITIVEMENT: "Validé définitivement",
    REFUSE: "Refusé",
    CORRECTION_DEMANDEE: "Correction demandée",
    SIGNE: "Signé",
    CONFIRME: "Réinscription confirmée",
  }
  return map[decision.toUpperCase()] ?? decision
}

const fmt = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
})

export default async function DoyenDossierPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const user = await getSessionUser()
  if (!user) redirect("/login")
  if (user.role !== "DOYEN") redirect("/dashboard")

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
    },
  })

  if (!dossier) redirect("/dashboard/doyen")

  const { doctorant } = dossier
  const isPending = dossier.status === "SIGNE_DIRECTEUR"

  // Doyen sees all of their own decisions + only positive decisions from other roles
  const visibleValidations = dossier.validations.filter(
    (v) => v.valideur.role === "DOYEN" || !["CORRECTION_DEMANDEE", "REFUSE"].includes(v.decision)
  )

  // Previous signatures: last positive decision per preceding role, with a signature image
  const _sigByRole = new Map<string, (typeof dossier.validations)[0]>()
  for (const v of dossier.validations) {
    if (
      v.signature &&
      ["ENCADRANT", "ADMIN", "DIRECTEUR_LABO"].includes(v.valideur.role) &&
      ["APPROUVE", "SIGNE"].includes(v.decision)
    ) {
      _sigByRole.set(v.valideur.role, v)
    }
  }
  const prevSignatures = Array.from(_sigByRole.values())

  return (
    <div className="max-w-2xl">
      <Link
        href="/dashboard/doyen"
        className="mb-6 inline-flex text-xs text-muted transition-colors hover:text-accent"
      >
        ← Tableau de bord
      </Link>

      <div className="mb-1 mt-4 h-[3px] w-8 bg-accent" />
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">
        {doctorant.user.prenom} {doctorant.user.nom}
      </h1>
      <p className="mb-6 text-sm text-muted">
        Dossier de réinscription — {dossier.anneeUniversitaire}
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
          Mis à jour le {fmt.format(new Date(dossier.updatedAt))}
        </span>
      </div>

      {/* Personal info */}
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

      {/* Doctoral info */}
      <Section title="Informations doctorales">
        <Row label="Formation" value={doctorant.formationDoctorale} />
        <Row label="Laboratoire" value={doctorant.laboratoire.nom} />
        <Row label="Sujet de thèse" value={doctorant.sujetThese} />
        <Row
          label="Première inscription"
          value={String(doctorant.anneePremiereInscription)}
        />
      </Section>

      {/* Thesis progress */}
      <Section title="Avancement de thèse">
        <Row label="Travaux réalisés" value={dossier.travauxRealises ?? "—"} />
        <Row label="État d'avancement" value={dossier.etatAvancement ?? "—"} />
        <Row label="Difficultés" value={dossier.difficultes ?? "—"} />
        <Row label="Objectifs futurs" value={dossier.objectifsFuturs ?? "—"} />
      </Section>

      {/* Publications */}
      <Section title={`Publications (${dossier.publications.length})`}>
        {dossier.publications.length === 0 ? (
          <Row label="—" value="Aucune publication" />
        ) : (
          dossier.publications.map((p) => (
            <div key={p.id} className="border-b border-border py-3 last:border-b-0">
              <p className="mb-0.5 text-sm font-medium text-foreground">{p.titre}</p>
              <p className="text-xs text-muted">
                {PUB_TYPE_LABEL[p.type] ?? p.type}&nbsp;·&nbsp;{p.auteurs}
                &nbsp;·&nbsp;{p.annee}
                {p.revue && <>&nbsp;·&nbsp;{p.revue}</>}
                {p.doi && <>&nbsp;·&nbsp;<span className="font-mono">{p.doi}</span></>}
              </p>
              <p className="mt-0.5 text-xs text-muted">Statut : {p.statut}</p>
            </div>
          ))
        )}
      </Section>

      {/* Activities */}
      <Section title={`Activités scientifiques (${dossier.activites.length})`}>
        {dossier.activites.length === 0 ? (
          <Row label="—" value="Aucune activité" />
        ) : (
          dossier.activites.map((a) => (
            <div key={a.id} className="border-b border-border py-3 last:border-b-0">
              <p className="mb-0.5 text-sm font-medium text-foreground">{a.titre}</p>
              <p className="text-xs text-muted">
                {ACT_TYPE_LABEL[a.type] ?? a.type}
                {a.lieu && <>&nbsp;·&nbsp;{a.lieu}</>}
                {a.date && <>&nbsp;·&nbsp;{fmt.format(new Date(a.date))}</>}
              </p>
            </div>
          ))
        )}
      </Section>

      {/* Full validation history */}
      <Section title="Historique de validation">
        {visibleValidations.length === 0 ? (
          <div className="py-3">
            <p className="text-sm text-muted">Aucune validation enregistrée.</p>
          </div>
        ) : (
          visibleValidations.map((v, i) => (
            <div
              key={v.id}
              className="flex gap-4 border-b border-border py-4 last:border-b-0"
            >
              <div className="flex flex-col items-center">
                <div
                  className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                    v.decision.toUpperCase().includes("REFUSE")
                      ? "bg-danger"
                      : v.decision.toUpperCase().includes("CORRECTION")
                      ? "bg-warning"
                      : "bg-success"
                  }`}
                />
                {i < visibleValidations.length - 1 && (
                  <div className="mt-1 w-px flex-1 bg-border" />
                )}
              </div>
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
          ))
        )}
      </Section>

      {/* Previous validator signatures */}
      {prevSignatures.length > 0 && (
        <section className="mb-5 rounded border border-border">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted">
              Signatures reçues ({prevSignatures.length})
            </h2>
          </div>
          <div className="flex flex-wrap gap-6 px-5 py-4">
            {prevSignatures.map((v) => (
              <div key={v.id} className="flex flex-col">
                <p className="text-xs font-medium text-foreground">
                  {ROLE_LABEL[v.valideur.role] ?? v.valideur.role}
                </p>
                <p className="text-xs text-muted">
                  {v.valideur.prenom} {v.valideur.nom}
                </p>
                <p className="mt-0.5 text-[10px] text-muted">
                  {fmt.format(new Date(v.signedAt))}
                </p>
                <img
                  src={v.signature!}
                  alt="Signature"
                  className="mt-2 h-14 max-w-[180px] rounded border border-border bg-white object-contain"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Validation panel — only when awaiting doyen */}
      {isPending && <ValidationPanel dossierId={dossier.id} />}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
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
    <div className="flex flex-col gap-0.5 border-b border-border py-3 last:border-b-0 sm:flex-row sm:gap-6">
      <span className="text-xs text-muted sm:w-40 sm:shrink-0">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  )
}
