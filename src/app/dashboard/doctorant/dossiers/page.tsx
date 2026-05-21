import Link from "next/link"
import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const STATUS_LABEL: Record<string, string> = {
  BROUILLON: "Brouillon",
  SOUMIS: "Soumis",
  EN_ATTENTE_ENCADRANT: "En attente de l'encadrant",
  CORRECTION_DEMANDEE: "Correction demandée",
  REFUSE: "Refusé",
  VALIDE_ENCADRANT: "Validé par l'encadrant",
  EN_ATTENTE_ADMIN: "En attente de l'administration",
  VALIDE_ADMIN: "Validé par l'administration",
  EN_ATTENTE_DIRECTEUR: "En attente du directeur",
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

const ATTESTATION_STATUSES = new Set(["REINSCRIPTION_EFFECTUEE", "ATTESTATION_GENEREE"])

export default async function MesDossiersPage() {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  if (user.role !== "DOCTORANT") redirect("/dashboard")

  const doctorant = await prisma.doctorant.findUnique({
    where: { userId: user.id },
    select: { id: true },
  })
  if (!doctorant) redirect("/dashboard/doctorant")

  const dossiers = await prisma.dossier.findMany({
    where: { doctorantId: doctorant.id },
    include: { attestation: { select: { pdfUrl: true } } },
    orderBy: { anneeUniversitaire: "desc" },
  })

  return (
    <div className="max-w-2xl">
      <div className="mb-1 h-[3px] w-8 bg-accent" />
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">
        Mes dossiers
      </h1>
      <p className="mb-6 text-sm text-muted">
        Historique de vos dossiers de réinscription.
      </p>

      {dossiers.length === 0 ? (
        <div className="rounded border border-border px-5 py-8 text-center">
          <p className="text-sm text-muted">
            Aucun dossier enregistré pour le moment.
          </p>
        </div>
      ) : (
        <section className="rounded border border-border">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted">
              {dossiers.length} dossier{dossiers.length > 1 ? "s" : ""}
            </h2>
          </div>
          <ul>
            {dossiers.map((d) => {
              const hasAttestation =
                d.attestation && ATTESTATION_STATUSES.has(d.status)
              const isBrouillon = d.status === "BROUILLON"
              const isCorrection = d.status === "CORRECTION_DEMANDEE"

              return (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 last:border-b-0"
                >
                  {/* Left: year + status */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {d.anneeUniversitaire}
                    </p>
                    <span
                      className={`mt-1 inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                        STATUS_CLASS[d.status] ?? "bg-border text-muted"
                      }`}
                    >
                      {STATUS_LABEL[d.status] ?? d.status}
                    </span>
                  </div>

                  {/* Right: action buttons */}
                  <div className="flex shrink-0 items-center gap-2">
                    {hasAttestation && (
                      <a
                        href={d.attestation!.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex rounded border border-accent/40 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/5"
                      >
                        Télécharger l&apos;attestation
                      </a>
                    )}
                    {isBrouillon || isCorrection ? (
                      <Link
                        href="/dashboard/doctorant/reinscription"
                        className="inline-flex rounded bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-dark"
                      >
                        {isCorrection ? "Corriger" : "Continuer"}
                      </Link>
                    ) : (
                      <Link
                        href={`/dashboard/doctorant/dossier/${d.id}`}
                        className="inline-flex rounded border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-border/50"
                      >
                        Voir
                      </Link>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
