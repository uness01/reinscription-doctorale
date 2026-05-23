"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createUser, type DoctorantInput } from "./actions"

type Props = {
  laboratoires: { id: string; nom: string }[]
  encadrants: { id: string; prenom: string; nom: string }[]
}

const ROLES = [
  { value: "DOCTORANT",      label: "Doctorant" },
  { value: "ENCADRANT",      label: "Encadrant" },
  { value: "ADMIN",          label: "Administrateur" },
  { value: "DIRECTEUR_LABO", label: "Directeur de laboratoire" },
  { value: "DOYEN",          label: "Doyen" },
]

const INPUT =
  "w-full rounded border border-border bg-white px-3 py-2 text-sm text-foreground " +
  "placeholder:text-muted/60 outline-none transition-colors " +
  "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"

export default function AddUserPanel({ laboratoires, encadrants }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Base fields
  const [nom, setNom] = useState("")
  const [prenom, setPrenom] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("DOCTORANT")
  const [password, setPassword] = useState("")

  // Doctorant-specific fields
  const [cin, setCin] = useState("")
  const [cne, setCne] = useState("")
  const [apogee, setApogee] = useState("")
  const [dateNaissance, setDateNaissance] = useState("")
  const [telephone, setTelephone] = useState("")
  const [formationDoctorale, setFormationDoctorale] = useState("")
  const [laboratoireId, setLaboratoireId] = useState(laboratoires[0]?.id ?? "")
  const [sujetThese, setSujetThese] = useState("")
  const [anneeInscription, setAnneeInscription] = useState(String(new Date().getFullYear()))
  const [encadrantId, setEncadrantId] = useState("")

  // Directeur lab field
  const [directeurLaboratoireId, setDirecteurLaboratoireId] = useState("")

  function reset() {
    setNom(""); setPrenom(""); setEmail(""); setRole("DOCTORANT"); setPassword("")
    setCin(""); setCne(""); setApogee(""); setDateNaissance(""); setTelephone("")
    setFormationDoctorale(""); setLaboratoireId(laboratoires[0]?.id ?? "")
    setSujetThese(""); setAnneeInscription(String(new Date().getFullYear()))
    setEncadrantId(""); setDirecteurLaboratoireId(""); setError(null)
  }

  function handleOpen() { reset(); setOpen(true) }
  function handleCancel() { setOpen(false); reset() }

  function handleSubmit() {
    if (!nom.trim() || !prenom.trim() || !email.trim() || !password.trim())
      return setError("Nom, prénom, email et mot de passe sont obligatoires.")
    if (password.length < 8)
      return setError("Le mot de passe doit contenir au moins 8 caractères.")

    if (role === "DOCTORANT") {
      if (!cin.trim() || !cne.trim() || !apogee.trim() || !dateNaissance ||
          !telephone.trim() || !formationDoctorale.trim() || !laboratoireId ||
          !sujetThese.trim() || !encadrantId)
        return setError("Tous les champs du profil doctorant sont obligatoires.")
      const year = parseInt(anneeInscription)
      if (!year || year < 2000 || year > new Date().getFullYear())
        return setError("Année de première inscription invalide.")
    }

    const doctorantPayload: DoctorantInput | undefined = role === "DOCTORANT" ? {
      cin, cne, apogee, dateNaissance, telephone, formationDoctorale,
      laboratoireId, sujetThese,
      anneePremiereInscription: parseInt(anneeInscription),
      encadrantId,
    } : undefined

    startTransition(async () => {
      setError(null)
      const result = await createUser({
        nom, prenom, email, role, password,
        doctorant: doctorantPayload,
        directeurLaboratoireId: role === "DIRECTEUR_LABO" ? directeurLaboratoireId || undefined : undefined,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setOpen(false)
        reset()
        router.refresh()
      }
    })
  }

  const isDoctorant = role === "DOCTORANT"

  return (
    <div className="mb-6">
      {!open ? (
        <button
          type="button"
          onClick={handleOpen}
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
        >
          + Ajouter un utilisateur
        </button>
      ) : (
        <section className="rounded border border-border">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted">
              Nouvel utilisateur
            </h2>
          </div>

          <div className="px-5 py-5 space-y-4">
            {/* Base fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">Prénom</label>
                <input className={INPUT} value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Prénom" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">Nom</label>
                <input className={INPUT} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom de famille" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">Adresse e-mail</label>
                <input className={INPUT} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom.nom@uit.ac.ma" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">Rôle</label>
                <select className={INPUT} value={role} onChange={(e) => setRole(e.target.value)}>
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-foreground">
                  Mot de passe temporaire
                </label>
                <input
                  className={INPUT}
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 caractères"
                  autoComplete="new-password"
                />
                <p className="mt-1 text-xs text-muted">
                  L&apos;utilisateur devra changer son mot de passe à la première connexion.
                </p>
              </div>
            </div>

            {/* Directeur lab assignment */}
            {role === "DIRECTEUR_LABO" && (
              <div className="rounded border border-border bg-white p-4">
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

            {/* Doctorant profile section */}
            {isDoctorant && (
              <div className="rounded border border-border bg-white p-4">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Profil doctorant <span className="text-danger">— tous les champs sont obligatoires</span>
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
                    <input
                      className={INPUT}
                      type="number"
                      value={anneeInscription}
                      onChange={(e) => setAnneeInscription(e.target.value)}
                      min="2000"
                      max={String(new Date().getFullYear())}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-medium text-foreground">Formation doctorale</label>
                    <input className={INPUT} value={formationDoctorale} onChange={(e) => setFormationDoctorale(e.target.value)} placeholder="Ex : Informatique et Mathématiques Appliquées" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">Laboratoire</label>
                    <select className={INPUT} value={laboratoireId} onChange={(e) => setLaboratoireId(e.target.value)}>
                      <option value="">— Sélectionner —</option>
                      {laboratoires.map((l) => (
                        <option key={l.id} value={l.id}>{l.nom}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">Encadrant</label>
                    <select className={INPUT} value={encadrantId} onChange={(e) => setEncadrantId(e.target.value)}>
                      <option value="">— Sélectionner —</option>
                      {encadrants.map((e) => (
                        <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>
                      ))}
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
          </div>

          {error && (
            <div className="mx-5 mb-4 rounded border border-danger/20 bg-danger-bg px-4 py-3">
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          <div className="flex gap-2 border-t border-border px-5 py-4">
            <button
              type="button"
              disabled={isPending}
              onClick={handleSubmit}
              className="rounded bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
            >
              {isPending ? "Création en cours…" : "Créer l'utilisateur"}
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
        </section>
      )}
    </div>
  )
}
