import Link from "next/link"
import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const STATUS_LABEL: Record<string, string> = {
  SOUMIS: "Soumis",
  EN_ATTENTE_ENCADRANT: "En attente de votre décision",
  CORRECTION_DEMANDEE: "Correction demandée",
  REFUSE: "Refusé",
  VALIDE_ENCADRANT: "Validé",
  EN_ATTENTE_ADMIN: "Transmis à l'administration",
  VALIDE_ADMIN: "Validé par l'administration",
  EN_ATTENTE_DIRECTEUR: "En attente du directeur",
  SIGNE_DIRECTEUR: "Signé par le directeur",
  EN_ATTENTE_DOYEN: "En attente du doyen",
  VALIDE_DEFINITIVEMENT: "Validé définitivement",
  REINSCRIPTION_EFFECTUEE: "Réinscription effectuée",
  ATTESTATION_GENEREE: "Attestation générée",
}

const STATUS_CLASS: Record<string, string> = {
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
}

export default async function EncadrantPage() {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  if (user.role !== "ENCADRANT") redirect("/dashboard")

  const encadrant = await prisma.encadrant.findUnique({
    where: { userId: user.id },
    select: { id: true },
  })

  if (!encadrant) {
    return (
      <div className="max-w-2xl">
        <div className="mb-6 h-[3px] w-8 bg-accent" />
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">
          Bonjour, {user.prenom} {user.nom}
        </h1>
        <div className="rounded border border-border px-5 py-4">
          <p className="text-sm text-muted">
            Aucun profil encadrant associé à ce compte. Contactez
            l&apos;administration.
          </p>
        </div>
      </div>
    )
  }

  const dossiers = await prisma.dossier.findMany({
    where: { encadrantId: encadrant.id },
    include: {
      doctorant: {
        include: { user: { select: { nom: true, prenom: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  const PENDING_STATUSES = ["SOUMIS", "EN_ATTENTE_ENCADRANT"]

  // Pending actions first
  const sorted = [
    ...dossiers.filter((d) => PENDING_STATUSES.includes(d.status)),
    ...dossiers.filter((d) => !PENDING_STATUSES.includes(d.status)),
  ]

  const pending = dossiers.filter((d) =>
    PENDING_STATUSES.includes(d.status)
  ).length
  const validated = dossiers.filter((d) =>
    ["VALIDE_ENCADRANT", "EN_ATTENTE_ADMIN", "VALIDE_ADMIN",
     "EN_ATTENTE_DIRECTEUR", "SIGNE_DIRECTEUR", "EN_ATTENTE_DOYEN",
     "VALIDE_DEFINITIVEMENT", "REINSCRIPTION_EFFECTUEE", "ATTESTATION_GENEREE",
    ].includes(d.status)
  ).length
  const corrections = dossiers.filter(
    (d) => d.status === "CORRECTION_DEMANDEE"
  ).length

  return (
    <div className="max-w-2xl">
      <div className="mb-6 h-[3px] w-8 bg-accent" />
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">
        Bonjour, {user.prenom} {user.nom}
      </h1>
      <p className="mb-6 text-sm text-muted">
        Consultez et validez les dossiers de vos doctorants.
      </p>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatCard label="À valider" value={String(pending)} />
        <StatCard label="Validés" value={String(validated)} />
        <StatCard label="En correction" value={String(corrections)} />
      </div>

      {/* Dossier list */}
      <section className="rounded border border-border">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            Dossiers assignés ({dossiers.length})
          </h2>
        </div>

        {sorted.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-muted">
              Aucun dossier ne vous est assigné pour le moment.
            </p>
          </div>
        ) : (
          <ul>
            {sorted.map((d) => (
              <li
                key={d.id}
                className="border-b border-border last:border-b-0"
              >
                <Link
                  href={`/dashboard/encadrant/dossier/${d.id}`}
                  className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-border/30"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {d.doctorant.user.prenom} {d.doctorant.user.nom}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {d.anneeUniversitaire}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded px-2.5 py-1 text-xs font-medium ${
                      STATUS_CLASS[d.status] ?? "bg-border text-muted"
                    }`}
                  >
                    {STATUS_LABEL[d.status] ?? d.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
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
