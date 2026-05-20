import Link from "next/link"
import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Note: the schema has no Laboratoire→directeur link, so dossiers are not
// filtered by laboratory.  A production build would add directeurId to
// Laboratoire and filter here.

const STATUS_LABEL: Record<string, string> = {
  SOUMIS: "Soumis",
  EN_ATTENTE_ENCADRANT: "En attente de l'encadrant",
  CORRECTION_DEMANDEE: "Correction demandée",
  REFUSE: "Refusé",
  VALIDE_ENCADRANT: "Validé par l'encadrant",
  VALIDE_ADMIN: "Validé par l'administration",
  EN_ATTENTE_DIRECTEUR: "En attente du directeur",
  SIGNE_DIRECTEUR: "Signé",
  EN_ATTENTE_DOYEN: "En attente du doyen",
  VALIDE_DEFINITIVEMENT: "Validé définitivement",
  REINSCRIPTION_EFFECTUEE: "Réinscription effectuée",
  ATTESTATION_GENEREE: "Attestation générée",
  ARCHIVE: "Archivé",
}

const STATUS_CLASS: Record<string, string> = {
  SOUMIS: "bg-accent/10 text-accent",
  EN_ATTENTE_ENCADRANT: "bg-accent/10 text-accent",
  CORRECTION_DEMANDEE: "bg-danger-bg text-danger",
  REFUSE: "bg-danger-bg text-danger",
  VALIDE_ENCADRANT: "bg-accent/10 text-accent",
  VALIDE_ADMIN: "bg-accent/10 text-accent",
  EN_ATTENTE_DIRECTEUR: "bg-accent/10 text-accent",
  SIGNE_DIRECTEUR: "bg-accent/20 text-accent-dark",
  EN_ATTENTE_DOYEN: "bg-accent/10 text-accent",
  VALIDE_DEFINITIVEMENT: "bg-accent/20 text-accent-dark",
  REINSCRIPTION_EFFECTUEE: "bg-accent/20 text-accent-dark",
  ATTESTATION_GENEREE: "bg-accent/20 text-accent-dark",
  ARCHIVE: "bg-border text-muted",
}

export default async function DirecteurPage() {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  if (user.role !== "DIRECTEUR_LABO") redirect("/dashboard")

  const allDossiers = await prisma.dossier.findMany({
    include: {
      doctorant: {
        include: {
          user: { select: { nom: true, prenom: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  const queue = allDossiers.filter((d) => d.status === "VALIDE_ADMIN")
  const others = allDossiers.filter((d) => d.status !== "VALIDE_ADMIN")

  return (
    <div className="max-w-2xl">
      <div className="mb-6 h-[3px] w-8 bg-accent" />
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">
        Bonjour, {user.prenom} {user.nom}
      </h1>
      <p className="mb-6 text-sm text-muted">
        Signez les dossiers validés par l&apos;administration.
      </p>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatCard label="À signer" value={String(queue.length)} />
        <StatCard
          label="Signés"
          value={String(
            allDossiers.filter((d) =>
              ["SIGNE_DIRECTEUR", "EN_ATTENTE_DOYEN", "VALIDE_DEFINITIVEMENT",
               "REINSCRIPTION_EFFECTUEE", "ATTESTATION_GENEREE"].includes(d.status)
            ).length
          )}
        />
        <StatCard
          label="Total"
          value={String(allDossiers.length)}
        />
      </div>

      {/* Primary queue: VALIDE_ADMIN */}
      <section className="mb-6 rounded border border-border">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            En attente de votre signature ({queue.length})
          </h2>
        </div>
        {queue.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-muted">
              Aucun dossier en attente de signature.
            </p>
          </div>
        ) : (
          <ul>
            {queue.map((d) => (
              <DossierRow key={d.id} d={d} />
            ))}
          </ul>
        )}
      </section>

      {/* Overview */}
      <section className="rounded border border-border">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            Tous les autres dossiers ({others.length})
          </h2>
        </div>
        {others.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-muted">Aucun dossier.</p>
          </div>
        ) : (
          <ul>
            {others.map((d) => (
              <DossierRow key={d.id} d={d} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

type DossierItem = {
  id: string
  anneeUniversitaire: string
  status: string
  doctorant: { user: { nom: string; prenom: string } }
}

function DossierRow({ d }: { d: DossierItem }) {
  return (
    <li className="border-b border-border last:border-b-0">
      <Link
        href={`/dashboard/directeur/dossier/${d.id}`}
        className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-border/30"
      >
        <div>
          <p className="text-sm font-medium text-foreground">
            {d.doctorant.user.prenom} {d.doctorant.user.nom}
          </p>
          <p className="mt-0.5 text-xs text-muted">{d.anneeUniversitaire}</p>
        </div>
        <span
          className={`shrink-0 inline-flex rounded px-2.5 py-1 text-xs font-medium ${
            STATUS_CLASS[d.status] ?? "bg-border text-muted"
          }`}
        >
          {STATUS_LABEL[d.status] ?? d.status}
        </span>
      </Link>
    </li>
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
