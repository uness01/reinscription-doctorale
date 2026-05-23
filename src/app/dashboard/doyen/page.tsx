import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import DoyenDossierList, { type DossierItem } from "./DoyenDossierList"

export default async function DoyenPage() {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  if (user.role !== "DOYEN") redirect("/dashboard")

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

  // Serialise — strip non-transferable Date fields
  const dossierItems: DossierItem[] = allDossiers.map((d) => ({
    id: d.id,
    anneeUniversitaire: d.anneeUniversitaire,
    status: d.status,
    doctorant: {
      formationDoctorale: d.doctorant.formationDoctorale,
      user: { nom: d.doctorant.user.nom, prenom: d.doctorant.user.prenom },
    },
  }))

  return (
    <div className="max-w-2xl">
      <div className="mb-6 h-[3px] w-8 bg-accent" />
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">
        Bonjour, {user.prenom} {user.nom}
      </h1>
      <p className="mb-6 text-sm text-muted">
        Accordez la validation définitive aux dossiers signés par les directeurs
        de laboratoire.
      </p>

      {/* Stats — always show totals, unaffected by search */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="À valider"
          value={String(allDossiers.filter((d) => d.status === "SIGNE_DIRECTEUR").length)}
        />
        <StatCard
          label="Validés"
          value={String(
            allDossiers.filter((d) =>
              ["VALIDE_DEFINITIVEMENT", "REINSCRIPTION_EFFECTUEE",
               "ATTESTATION_GENEREE"].includes(d.status)
            ).length
          )}
        />
        <StatCard label="Total" value={String(allDossiers.length)} />
      </div>

      <DoyenDossierList dossiers={dossierItems} />
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
