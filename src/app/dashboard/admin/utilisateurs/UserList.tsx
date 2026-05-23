"use client"

import { useState, useMemo } from "react"
import UserRow from "./UserRow"

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrateur",
  ENCADRANT: "Encadrant",
  DIRECTEUR_LABO: "Directeur de laboratoire",
  DOYEN: "Doyen",
  DOCTORANT: "Doctorant",
}

export type UserItem = {
  id: string
  nom: string
  prenom: string
  email: string
  role: string
  actif: boolean
  directeurLaboratoireId: string | null
  doctorant: {
    cin: string
    cne: string
    apogee: string
    dateNaissance: string
    telephone: string
    formationDoctorale: string
    laboratoireId: string
    laboratoireNom: string
    sujetThese: string
    anneePremiereInscription: number
    encadrantId: string | null
  } | null
}

type Props = {
  users: UserItem[]
  selfId: string
  laboratoires: { id: string; nom: string }[]
  encadrants: { id: string; prenom: string; nom: string }[]
}

const fieldCls =
  "rounded border border-border bg-white px-3 py-2 text-sm text-foreground " +
  "placeholder:text-muted/60 outline-none transition-colors " +
  "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"

export default function UserList({ users, selfId, laboratoires, encadrants }: Props) {
  const [query, setQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("")

  const availableRoles = useMemo(
    () => [...new Set(users.map((u) => u.role))],
    [users]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return users.filter((u) => {
      const text = `${u.prenom} ${u.nom} ${u.email}`.toLowerCase()
      return (!q || text.includes(q)) && (!roleFilter || u.role === roleFilter)
    })
  }, [users, query, roleFilter])

  return (
    <section className="rounded border border-border">
      <div className="border-b border-border px-5 py-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          {filtered.length} utilisateur{filtered.length > 1 ? "s" : ""}
        </h2>
      </div>

      {/* Search + filter */}
      <div className="border-b border-border px-5 py-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            placeholder="Rechercher par nom, prénom ou email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`flex-1 ${fieldCls}`}
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className={`w-full sm:w-52 ${fieldCls}`}
          >
            <option value="">Tous les rôles</option>
            {availableRoles.map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r] ?? r}</option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-muted">
            {query || roleFilter
              ? "Aucun résultat pour ces critères."
              : "Aucun utilisateur."}
          </p>
        </div>
      ) : (
        <ul>
          {filtered.map((u) => (
            <UserRow
              key={u.id}
              user={u}
              isSelf={u.id === selfId}
              laboratoires={laboratoires}
              encadrants={encadrants}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
