import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/auth"

export default async function AdminPage() {
  const user = await getSessionUser()

  if (!user) redirect("/login")
  if (user.role !== "ADMIN") redirect("/dashboard")

  return (
    <div>
      <div className="mb-6 h-[3px] w-8 bg-accent" />
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">
        Bonjour, {user.prenom} {user.nom}
      </h1>
      <p className="mb-8 text-sm text-muted">
        Bienvenue sur l&apos;espace administrateur. Supervisez l&apos;ensemble
        des dossiers de réinscription.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard label="Total dossiers" value="—" />
        <StatCard label="En attente" value="—" />
        <StatCard label="Validés" value="—" />
        <StatCard label="Refusés" value="—" />
      </div>

      <div className="mt-8 rounded border border-border px-6 py-5">
        <p className="text-sm font-medium text-foreground mb-1">
          Aucun dossier pour le moment
        </p>
        <p className="text-xs text-muted">
          Les dossiers soumis par les doctorants apparaîtront ici.
        </p>
      </div>
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
