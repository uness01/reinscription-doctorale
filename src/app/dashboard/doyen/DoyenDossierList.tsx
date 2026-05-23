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
  SIGNE_DIRECTEUR: "Signé par le directeur",
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
  SIGNE_DIRECTEUR: "bg-success/10 text-success",
  VALIDE_DEFINITIVEMENT: "bg-success/20 text-success",
  REINSCRIPTION_EFFECTUEE: "bg-success/20 text-success",
  ATTESTATION_GENEREE: "bg-success/20 text-success",
  ARCHIVE: "bg-border text-muted",
}

export type DossierItem = {
  id: string
  anneeUniversitaire: string
  status: string
  doctorant: {
    formationDoctorale: string
    user: { nom: string; prenom: string }
  }
}

const fieldCls =
  "rounded border border-border bg-white px-3 py-2 text-sm text-foreground " +
  "placeholder:text-muted/60 outline-none transition-colors " +
  "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"

export default function DoyenDossierList({ dossiers }: { dossiers: DossierItem[] }) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return dossiers
    return dossiers.filter((d) => {
      const name = `${d.doctorant.user.prenom} ${d.doctorant.user.nom}`.toLowerCase()
      return name.includes(q)
    })
  }, [dossiers, query])

  const queue = filtered.filter((d) => d.status === "SIGNE_DIRECTEUR")
  const others = filtered.filter((d) => d.status !== "SIGNE_DIRECTEUR")
  const hasFilter = query.trim() !== ""

  return (
    <>
      {/* Search bar */}
      <div className="mb-5">
        <input
          type="search"
          placeholder="Rechercher par nom ou prénom…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={`w-full max-w-sm ${fieldCls}`}
        />
      </div>

      {/* Primary queue */}
      <section className="mb-6 rounded border border-border">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            En attente de votre validation ({queue.length})
          </h2>
        </div>
        {queue.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-muted">
              {hasFilter
                ? "Aucun résultat pour ces critères."
                : "Aucun dossier en attente de validation."}
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
        href={`/dashboard/doyen/dossier/${d.id}`}
        className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-border/30"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {d.doctorant.user.prenom} {d.doctorant.user.nom}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted">
            {d.anneeUniversitaire}&nbsp;·&nbsp;{d.doctorant.formationDoctorale}
          </p>
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
