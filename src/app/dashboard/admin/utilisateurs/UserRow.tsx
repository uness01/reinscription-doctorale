"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { editUser, setUserStatus, type DoctorantInput } from "./actions"

// ── Types ──────────────────────────────────────────────────────────────────

type DoctorantData = {
  cin: string
  cne: string
  apogee: string
  dateNaissance: string        // YYYY-MM-DD
  telephone: string
  formationDoctorale: string
  laboratoireId: string
  sujetThese: string
  anneePremiereInscription: number
  encadrantId: string | null
}

type Props = {
  user: {
    id: string
    nom: string
    prenom: string
    email: string
    role: string
    actif: boolean
    directeurLaboratoireId: string | null
    doctorant: (DoctorantData & { cin: string; laboratoireNom: string }) | null
  }
  isSelf: boolean
  laboratoires: { id: string; nom: string }[]
  encadrants: { id: string; prenom: string; nom: string }[]
}

// ── Constants ──────────────────────────────────────────────────────────────

const ROLES = [
  { value: "DOCTORANT",      label: "Doctorant" },
  { value: "ENCADRANT",      label: "Encadrant" },
  { value: "ADMIN",          label: "Administrateur" },
  { value: "DIRECTEUR_LABO", label: "Directeur de laboratoire" },
  { value: "DOYEN",          label: "Doyen" },
]

const ROLE_LABEL: Record<string, string> = Object.fromEntries(ROLES.map((r) => [r.value, r.label]))

const INPUT =
  "w-full rounded border border-border bg-white px-3 py-2 text-sm text-foreground " +
  "placeholder:text-muted/60 outline-none transition-colors " +
  "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"

// ── Component ──────────────────────────────────────────────────────────────

export default function UserRow({ user, isSelf, laboratoires, encadrants }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // User fields
  const [nom, setNom] = useState(user.nom)
  const [prenom, setPrenom] = useState(user.prenom)
  const [email, setEmail] = useState(user.email)
  const [role, setRole] = useState(user.role)

  // Directeur lab field
  const [directeurLaboratoireId, setDirecteurLaboratoireId] = useState(user.directeurLaboratoireId ?? "")

  // Doctorant fields
  const [cin, setCin] = useState(user.doctorant?.cin ?? "")
  const [cne, setCne] = useState(user.doctorant?.cne ?? "")
  const [apogee, setApogee] = useState(user.doctorant?.apogee ?? "")
  const [dateNaissance, setDateNaissance] = useState(user.doctorant?.dateNaissance ?? "")
  const [telephone, setTelephone] = useState(user.doctorant?.telephone ?? "")
  const [formationDoctorale, setFormationDoctorale] = useState(user.doctorant?.formationDoctorale ?? "")
  const [laboratoireId, setLaboratoireId] = useState(user.doctorant?.laboratoireId ?? (laboratoires[0]?.id ?? ""))
  const [sujetThese, setSujetThese] = useState(user.doctorant?.sujetThese ?? "")
  const [anneeInscription, setAnneeInscription] = useState(String(user.doctorant?.anneePremiereInscription ?? new Date().getFullYear()))
  const [encadrantId, setEncadrantId] = useState(user.doctorant?.encadrantId ?? "")

  function handleEdit() {
    setNom(user.nom); setPrenom(user.prenom); setEmail(user.email); setRole(user.role)
    setDirecteurLaboratoireId(user.directeurLaboratoireId ?? "")
    setCin(user.doctorant?.cin ?? "")
    setCne(user.doctorant?.cne ?? "")
    setApogee(user.doctorant?.apogee ?? "")
    setDateNaissance(user.doctorant?.dateNaissance ?? "")
    setTelephone(user.doctorant?.telephone ?? "")
    setFormationDoctorale(user.doctorant?.formationDoctorale ?? "")
    setLaboratoireId(user.doctorant?.laboratoireId ?? (laboratoires[0]?.id ?? ""))
    setSujetThese(user.doctorant?.sujetThese ?? "")
    setAnneeInscription(String(user.doctorant?.anneePremiereInscription ?? new Date().getFullYear()))
    setEncadrantId(user.doctorant?.encadrantId ?? "")
    setError(null)
    setEditing(true)
  }

  function handleCancel() { setEditing(false); setError(null) }

  function handleSave() {
    if (!nom.trim() || !prenom.trim() || !email.trim())
      return setError("Nom, prénom et email sont obligatoires.")

    const isDoctorant = role === "DOCTORANT"
    if (isDoctorant) {
      if (!cin.trim() || !cne.trim() || !apogee.trim() || !dateNaissance ||
          !telephone.trim() || !formationDoctorale.trim() || !laboratoireId || !sujetThese.trim())
        return setError("Tous les champs du profil doctorant sont obligatoires.")
      const year = parseInt(anneeInscription)
      if (!year || year < 2000 || year > new Date().getFullYear())
        return setError("Année de première inscription invalide.")
    }

    const doctorantPayload: DoctorantInput | undefined = isDoctorant ? {
      cin, cne, apogee, dateNaissance, telephone, formationDoctorale,
      laboratoireId, sujetThese,
      anneePremiereInscription: parseInt(anneeInscription),
      encadrantId: encadrantId || null,
    } : undefined

    startTransition(async () => {
      setError(null)
      const result = await editUser(user.id, {
        nom, prenom, email, role,
        doctorant: doctorantPayload,
        directeurLaboratoireId: role === "DIRECTEUR_LABO" ? directeurLaboratoireId || undefined : undefined,
      })
      if (result.error) { setError(result.error) }
      else { setEditing(false); router.refresh() }
    })
  }

  function handleToggleStatus() {
    startTransition(async () => {
      setError(null)
      const result = await setUserStatus(user.id, user.email, !user.actif)
      if (result.error) { setError(result.error) }
      else { router.refresh() }
    })
  }

  // ── Display mode ───────────────────────────────────────────────────────────

  if (!editing) {
    return (
      <li className="border-b border-border last:border-b-0">
        <div className="px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {user.prenom} {user.nom}
                </span>
                <span className="inline-flex rounded bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                  {ROLE_LABEL[user.role] ?? user.role}
                </span>
                {user.actif ? (
                  <span className="inline-flex rounded bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">Actif</span>
                ) : (
                  <span className="inline-flex rounded bg-danger-bg px-2 py-0.5 text-[10px] font-medium text-danger">Inactif</span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted">{user.email}</p>
              {user.doctorant && (
                <p className="mt-1 text-[10px] text-muted">
                  CIN&nbsp;{user.doctorant.cin}&nbsp;·&nbsp;
                  {user.doctorant.formationDoctorale}&nbsp;·&nbsp;
                  {user.doctorant.laboratoireNom}
                </p>
              )}
              {user.role === "DIRECTEUR_LABO" && (
                <p className="mt-1 text-[10px] text-muted">
                  {user.directeurLaboratoireId
                    ? laboratoires.find((l) => l.id === user.directeurLaboratoireId)?.nom ?? "Laboratoire inconnu"
                    : "Aucun laboratoire assigné"}
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={handleEdit}
                className="rounded border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-border/50"
              >
                Éditer
              </button>
              {!isSelf && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleToggleStatus}
                  className={`rounded border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                    user.actif
                      ? "border-danger/30 text-danger hover:bg-danger-bg"
                      : "border-accent/30 text-accent hover:bg-accent/5"
                  }`}
                >
                  {user.actif ? "Désactiver" : "Réactiver"}
                </button>
              )}
            </div>
          </div>
          {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        </div>
      </li>
    )
  }

  // ── Edit mode ──────────────────────────────────────────────────────────────

  const isDoctorant = role === "DOCTORANT"

  return (
    <li className="border-b border-border last:border-b-0 bg-border/10">
      <div className="px-5 py-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted">
          Modifier — {user.prenom} {user.nom}
        </p>

        {/* ── User fields ── */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">Prénom</label>
            <input className={INPUT} value={prenom} onChange={(e) => setPrenom(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">Nom</label>
            <input className={INPUT} value={nom} onChange={(e) => setNom(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">Adresse e-mail</label>
            <input className={INPUT} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">Rôle</label>
            <select className={INPUT} value={role} onChange={(e) => setRole(e.target.value)} disabled={isSelf}>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
        </div>

        {/* ── Directeur lab assignment ── */}
        {role === "DIRECTEUR_LABO" && (
          <div className="mb-4 rounded border border-border bg-white p-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted">
              Laboratoire assigné
            </p>
            <select
              className={INPUT}
              value={directeurLaboratoireId}
              onChange={(e) => setDirecteurLaboratoireId(e.target.value)}
            >
              <option value="">— Aucun laboratoire —</option>
              {laboratoires.map((l) => (
                <option key={l.id} value={l.id}>{l.nom}</option>
              ))}
            </select>
          </div>
        )}

        {/* ── Doctorant profile ── */}
        {isDoctorant && (
          <div className="rounded border border-border bg-white p-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted">
              Profil doctorant
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">CIN</label>
                <input className={INPUT} value={cin} onChange={(e) => setCin(e.target.value)} placeholder="Ex : BK123456" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">CNE</label>
                <input className={INPUT} value={cne} onChange={(e) => setCne(e.target.value)} placeholder="Ex : R123456789" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">N° Apogée</label>
                <input className={INPUT} value={apogee} onChange={(e) => setApogee(e.target.value)} placeholder="8 chiffres" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">Date de naissance</label>
                <input className={INPUT} type="date" value={dateNaissance} onChange={(e) => setDateNaissance(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">Téléphone</label>
                <input className={INPUT} value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="0612345678" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">Année première inscription</label>
                <input className={INPUT} type="number" value={anneeInscription} onChange={(e) => setAnneeInscription(e.target.value)} min="2000" max={String(new Date().getFullYear())} />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-foreground">Formation doctorale</label>
                <input className={INPUT} value={formationDoctorale} onChange={(e) => setFormationDoctorale(e.target.value)} placeholder="Ex : Informatique et Mathématiques Appliquées" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">Laboratoire</label>
                <select className={INPUT} value={laboratoireId} onChange={(e) => setLaboratoireId(e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {laboratoires.map((l) => <option key={l.id} value={l.id}>{l.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">Encadrant</label>
                <select className={INPUT} value={encadrantId} onChange={(e) => setEncadrantId(e.target.value)}>
                  <option value="">— Non assigné —</option>
                  {encadrants.map((e) => <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-foreground">Sujet de thèse</label>
                <textarea
                  className={INPUT + " min-h-[72px] resize-y"}
                  value={sujetThese}
                  onChange={(e) => setSujetThese(e.target.value)}
                  placeholder="Intitulé du sujet de thèse"
                />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 rounded border border-danger/20 bg-danger-bg px-4 py-2">
            <p className="text-xs text-danger">{error}</p>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={handleSave}
            className="rounded bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
          >
            {isPending ? "Enregistrement…" : "Sauvegarder"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isPending}
            className="rounded border border-border px-4 py-2 text-sm text-muted transition-colors hover:text-foreground disabled:opacity-40"
          >
            Annuler
          </button>
        </div>
      </div>
    </li>
  )
}
