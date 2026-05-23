import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import EncadrantDossierList, { type DossierItem } from "./EncadrantDossierList"

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
  const pending = dossiers.filter((d) => PENDING_STATUSES.includes(d.status)).length
  const validated = dossiers.filter((d) =>
    ["VALIDE_ENCADRANT", "EN_ATTENTE_ADMIN", "VALIDE_ADMIN",
     "EN_ATTENTE_DIRECTEUR", "SIGNE_DIRECTEUR", "EN_ATTENTE_DOYEN",
     "VALIDE_DEFINITIVEMENT", "REINSCRIPTION_EFFECTUEE", "ATTESTATION_GENEREE",
    ].includes(d.status)
  ).length
  const corrections = dossiers.filter((d) => d.status === "CORRECTION_DEMANDEE").length

  // Serialise — strip non-transferable Date fields
  const dossierItems: DossierItem[] = dossiers.map((d) => ({
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
        Consultez et validez les dossiers de vos doctorants.
      </p>

      {/* Stats — always show totals, unaffected by search/filter */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatCard label="À valider" value={String(pending)} />
        <StatCard label="Validés" value={String(validated)} />
        <StatCard label="En correction" value={String(corrections)} />
      </div>

      <EncadrantDossierList dossiers={dossierItems} />
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
