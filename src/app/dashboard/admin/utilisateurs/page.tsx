import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import AddUserPanel from "./AddUserPanel"
import UserRow from "./UserRow"

const ROLE_ORDER: Record<string, number> = {
  ADMIN: 0, ENCADRANT: 1, DIRECTEUR_LABO: 2, DOYEN: 3, DOCTORANT: 4,
}

export default async function UtilisateursPage() {
  const currentUser = await getSessionUser()
  if (!currentUser) redirect("/login")
  if (currentUser.role !== "ADMIN") redirect("/dashboard")

  const [users, laboratoires, encadrantProfiles] = await Promise.all([
    prisma.user.findMany({
      include: {
        doctorant: {
          include: {
            laboratoire: { select: { nom: true } },
          },
        },
      },
      orderBy: { nom: "asc" },
    }),
    prisma.laboratoire.findMany({ orderBy: { nom: "asc" } }),
    prisma.encadrant.findMany({
      include: { user: { select: { nom: true, prenom: true } } },
      orderBy: { user: { nom: "asc" } },
    }),
  ])

  const sorted = [...users].sort((a, b) => {
    const ra = ROLE_ORDER[a.role] ?? 99
    const rb = ROLE_ORDER[b.role] ?? 99
    if (ra !== rb) return ra - rb
    return a.nom.localeCompare(b.nom)
  })

  const total = users.length
  const actifs = users.filter((u) => u.actif).length

  const labOptions = laboratoires.map((l) => ({ id: l.id, nom: l.nom }))
  const encadrantOptions = encadrantProfiles.map((e) => ({
    id: e.id,
    prenom: e.user.prenom,
    nom: e.user.nom,
  }))

  return (
    <div className="max-w-3xl">
      <div className="mb-1 h-[3px] w-8 bg-accent" />
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">
        Utilisateurs
      </h1>
      <p className="mb-6 text-sm text-muted">
        Gérez les comptes utilisateurs de la plateforme.
      </p>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatCard label="Total" value={String(total)} />
        <StatCard label="Actifs" value={String(actifs)} />
        <StatCard label="Inactifs" value={String(total - actifs)} danger={total - actifs > 0} />
      </div>

      {/* Add user */}
      <AddUserPanel />

      {/* User list */}
      <section className="rounded border border-border">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            {total} utilisateur{total > 1 ? "s" : ""}
          </h2>
        </div>
        {sorted.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-muted">Aucun utilisateur.</p>
          </div>
        ) : (
          <ul>
            {sorted.map((u) => (
              <UserRow
                key={u.id}
                user={{
                  id: u.id,
                  nom: u.nom,
                  prenom: u.prenom,
                  email: u.email,
                  role: u.role,
                  actif: u.actif,
                  doctorant: u.doctorant
                    ? {
                        cin: u.doctorant.cin,
                        cne: u.doctorant.cne,
                        apogee: u.doctorant.apogee,
                        // Serialize Date → string before crossing server→client boundary
                        dateNaissance: u.doctorant.dateNaissance
                          .toISOString()
                          .split("T")[0],
                        telephone: u.doctorant.telephone,
                        formationDoctorale: u.doctorant.formationDoctorale,
                        laboratoireId: u.doctorant.laboratoireId,
                        laboratoireNom: u.doctorant.laboratoire.nom,
                        sujetThese: u.doctorant.sujetThese,
                        anneePremiereInscription: u.doctorant.anneePremiereInscription,
                        encadrantId: u.doctorant.encadrantId,
                      }
                    : null,
                }}
                isSelf={u.id === currentUser.id}
                laboratoires={labOptions}
                encadrants={encadrantOptions}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function StatCard({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded border border-border px-5 py-4">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className={`text-2xl font-semibold ${danger ? "text-danger" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  )
}
