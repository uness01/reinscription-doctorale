import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import AdminDossierList, { type DossierItem } from "./AdminDossierList"

export default async function AdminPage() {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  if (user.role !== "ADMIN") redirect("/dashboard")

  const allDossiers = await prisma.dossier.findMany({
    include: {
      doctorant: {
        include: {
          user: { select: { nom: true, prenom: true } },
          laboratoire: { select: { nom: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  // Serialise — strip non-transferable Date fields before crossing server→client boundary
  const dossierItems: DossierItem[] = allDossiers.map((d) => ({
    id: d.id,
    anneeUniversitaire: d.anneeUniversitaire,
    status: d.status,
    doctorant: {
      formationDoctorale: d.doctorant.formationDoctorale,
      user: { nom: d.doctorant.user.nom, prenom: d.doctorant.user.prenom },
      laboratoire: { nom: d.doctorant.laboratoire.nom },
    },
  }))

  return (
    <div className="max-w-3xl">
      <div className="mb-6 h-[3px] w-8 bg-accent" />
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">
        Bonjour, {user.prenom} {user.nom}
      </h1>
      <p className="mb-6 text-sm text-muted">
        Gérez l&apos;ensemble des dossiers de réinscription.
      </p>

      {/* Stats — always show totals, unaffected by search/filter */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total" value={String(allDossiers.length)} />
        <StatCard
          label="À valider"
          value={String(allDossiers.filter((d) => d.status === "VALIDE_ENCADRANT").length)}
        />
        <StatCard
          label="Validés"
          value={String(
            allDossiers.filter((d) =>
              ["VALIDE_ADMIN", "EN_ATTENTE_DIRECTEUR", "SIGNE_DIRECTEUR",
               "EN_ATTENTE_DOYEN", "VALIDE_DEFINITIVEMENT",
               "REINSCRIPTION_EFFECTUEE", "ATTESTATION_GENEREE"].includes(d.status)
            ).length
          )}
        />
        <StatCard
          label="Refusés"
          value={String(allDossiers.filter((d) => d.status === "REFUSE").length)}
        />
      </div>

      <AdminDossierList dossiers={dossierItems} />
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
