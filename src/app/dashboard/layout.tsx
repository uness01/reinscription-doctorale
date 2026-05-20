import { redirect } from "next/navigation"
import Link from "next/link"
import { getSessionUser } from "@/lib/auth"
import LogoutButton from "./LogoutButton"

type NavItem = { label: string; href: string }

const NAV: Record<string, NavItem[]> = {
  DOCTORANT: [
    { label: "Mes dossiers", href: "/dashboard/doctorant" },
  ],
  ENCADRANT: [
    { label: "Tableau de bord", href: "/dashboard/encadrant" },
  ],
  ADMIN: [
    { label: "Tableau de bord", href: "/dashboard/admin" },
  ],
  DIRECTEUR_LABO: [
    { label: "Tableau de bord", href: "/dashboard/directeur" },
  ],
  DOYEN: [
    { label: "Tableau de bord", href: "/dashboard/doyen" },
  ],
}

const ROLE_LABELS: Record<string, string> = {
  DOCTORANT: "Doctorant",
  ENCADRANT: "Encadrant",
  ADMIN: "Administrateur",
  DIRECTEUR_LABO: "Directeur de Labo",
  DOYEN: "Doyen",
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSessionUser()

  if (!user) redirect("/login")

  const navItems = NAV[user.role] ?? []
  const roleLabel = ROLE_LABELS[user.role] ?? user.role

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-border">
        <div className="h-[3px] shrink-0 bg-accent" />

        <div className="border-b border-border px-5 py-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted leading-snug">
            Université Ibn Tofail
          </p>
          <p className="text-[10px] uppercase tracking-[0.08em] text-muted/60 leading-snug">
            Études Doctorales
          </p>
        </div>

        <div className="border-b border-border px-5 py-2.5">
          <span className="inline-block rounded bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
            {roleLabel}
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center rounded px-3 py-2 text-sm text-foreground transition-colors hover:bg-border/60"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-border px-5 py-3">
          <p className="truncate text-xs font-medium text-foreground">
            {user.prenom} {user.nom}
          </p>
          <LogoutButton />
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="shrink-0 border-b border-border px-6 py-3">
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted">
            Gestion de Réinscription Doctorale
          </p>
        </header>

        <main className="flex-1 overflow-y-auto px-8 py-8">{children}</main>
      </div>
    </div>
  )
}
