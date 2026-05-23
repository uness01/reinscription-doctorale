"use client"

import { useState, useMemo } from "react"
import Link from "next/link"

const STATUS_LABEL: Record<string, string> = {
  SOUMIS: "Soumis",
  EN_ATTENTE_ENCADRANT: "En attente de l'encadrant",
  CORRECTION_DEMANDEE: "Correction demandée",
  REFUSE: "Refusé",
  VALIDE_ENCADRANT: "Validé par l'encadrant",
  VALIDE_ADMIN: "Validé par l'administration",
  EN_ATTENTE_DIRECTEUR: "En attente du directeur",
  SIGNE_DIRECTEUR: "Signé",
  EN_ATTENTE_DOYEN: "En attente du doyen",
  VALIDE_DEFINITIVEMENT: "Validé définitivement",
  REINSCRIPTION_EFFECTUEE: "Réinscription effectuée",
  ATTESTATION_GENEREE: "Attestation générée",
  ARCHIVE: "Archivé",
}

const STATUS_CLASS: Record<string, string> = {
  SOUMIS: "bg-warning-bg text-warning",
  EN_ATTENTE_ENCADRANT: "bg-accent/10 text-accent",
  CORRECTION_DEMANDEE: "bg-warning-bg text-warning",
  REFUSE: "bg-danger-bg text-danger",
  VALIDE_ENCADRANT: "bg-success/10 text-success",
  VALIDE_ADMIN: "bg-success/10 text-success",
  EN_ATTENTE_DIRECTEUR: "bg-accent/10 text-accent",
  SIGNE_DIRECTEUR: "bg-success/10 text-success",
  EN_ATTENTE_DOYEN: "bg-accent/10 text-accent",
  VALIDE_DEFINITIVEMENT: "bg-success/20 text-success",
  REINSCRIPTION_EFFECTUEE: "bg-success/20 text-success",
  ATTESTATION_GENEREE: "bg-success/20 text-success",
  ARCHIVE: "bg-border text-muted",
}

export type DossierItem = {
  id: string
  anneeUniversitaire: string
  status: string
  doctorant: { user: { nom: string; prenom: string } }
}

const fieldCls =
  "rounded border border-border bg-white px-3 py-2 text-sm text-foreground " +
  "placeholder:text-muted/60 outline-none transition-colors " +
  "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"

export default function DirecteurDossierList({ dossiers }: { dossiers: DossierItem[] }) {
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  const availableStatuses = useMemo(
    () => [...new Set(dossiers.map((d) => d.status))],
    [dossiers]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return dossiers.filter((d) => {
      const name = `${d.doctorant.user.prenom} ${d.doctorant.user.nom}`.toLowerCase()
      return (!q || name.includes(q)) && (!statusFilter || d.status === statusFilter)
    })
  }, [dossiers, query, statusFilter])

  const queue = filtered.filter((d) => d.status === "VALIDE_ADMIN")
  const others = filtered.filter((d) => d.status !== "VALIDE_ADMIN")
  const hasFilter = query.trim() !== "" || statusFilter !== ""

  return (
    <>
      {/* Search + filter */}
      <div className="mb-5 flex gap-3">
        <input
          type="search"
          placeholder="Rechercher par nom ou prénom…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={`flex-1 ${fieldCls}`}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={`w-56 ${fieldCls}`}
        >
          <option value="">Tous les statuts</option>
          {availableStatuses.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s] ?? s}</option>
          ))}
        </select>
      </div>

      {/* Primary queue */}
      <section className="mb-6 rounded border border-border">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            En attente de votre signature ({queue.length})
          </h2>
        </div>
        {queue.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-muted">
              {hasFilter
                ? "Aucun résultat pour ces critères."
                : "Aucun dossier en attente de signature."}
            </p>
          </div>
        ) : (
          <ul>{queue.map((d) => <DossierRow key={d.id} d={d} />)}</ul>
        )}
      </section>

      {/* Overview */}
      <section className="rounded border border-border">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            Tous les autres dossiers ({others.length})
          </h2>
        </div>
        {others.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-muted">
              {hasFilter ? "Aucun résultat pour ces critères." : "Aucun dossier."}
            </p>
          </div>
        ) : (
          <ul>{others.map((d) => <DossierRow key={d.id} d={d} />)}</ul>
        )}
      </section>
    </>
  )
}

function DossierRow({ d }: { d: DossierItem }) {
  return (
    <li className="border-b border-border last:border-b-0">
      <Link
        href={`/dashboard/directeur/dossier/${d.id}`}
        className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-border/30"
      >
        <div>
          <p className="text-sm font-medium text-foreground">
            {d.doctorant.user.prenom} {d.doctorant.user.nom}
          </p>
          <p className="mt-0.5 text-xs text-muted">{d.anneeUniversitaire}</p>
        </div>
        <span
          className={`shrink-0 inline-flex rounded px-2.5 py-1 text-xs font-medium ${
            STATUS_CLASS[d.status] ?? "bg-border text-muted"
          }`}
        >
          {STATUS_LABEL[d.status] ?? d.status}
        </span>
      </Link>
    </li>
  )
}
