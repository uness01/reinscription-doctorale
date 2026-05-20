import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/auth"

const ROLE_ROUTES: Record<string, string> = {
  DOCTORANT: "/dashboard/doctorant",
  ENCADRANT: "/dashboard/encadrant",
  ADMIN: "/dashboard/admin",
  DIRECTEUR_LABO: "/dashboard/directeur",
  DOYEN: "/dashboard/doyen",
}

// Role resolver — authenticated users land here from the proxy, get forwarded
// to their role-specific dashboard without an extra round-trip to /login.
export default async function DashboardPage() {
  const user = await getSessionUser()

  if (!user) redirect("/login")

  redirect(ROLE_ROUTES[user.role] ?? "/login")
}
