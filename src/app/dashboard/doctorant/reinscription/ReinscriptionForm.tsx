"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { saveDossier } from "./actions"

// ── Types ──────────────────────────────────────────────────────────────────

type Publication = {
  titre: string
  type: string
  auteurs: string
  revue: string
  annee: string
  doi: string
  statut: string
}

type Activite = {
  type: string
  titre: string
  lieu: string
  date: string
}

type Props = {
  annee: string
  doctorantId: string
  laboratoireId: string
  correctionComment?: string | null
  personalInfo: {
    nom: string
    prenom: string
    cin: string
    cne: string
    apogee: string
    dateNaissance: string
    telephone: string
  }
  doctoralInfo: {
    formation: string
    laboratoire: string
    sujetThese: string
    anneePremiereInscription: number
  }
  draft: {
    id: string
    travauxRealises: string
    etatAvancement: string
    difficultes: string
    objectifsFuturs: string
    publications: Publication[]
    activites: Activite[]
  } | null
}

// ── Constants ──────────────────────────────────────────────────────────────

const STEPS = [
  "Infos personnelles",
  "Infos doctorales",
  "Avancement",
  "Publications",
  "Activités",
  "Récapitulatif",
]

const PUB_TYPES = ["article", "communication", "poster", "chapitre"]
const ACT_TYPES = ["congrès", "séminaire", "stage", "formation", "atelier", "mobilité"]

const INPUT =
  "w-full rounded border border-border bg-white px-3 py-2 text-sm text-foreground " +
  "placeholder:text-muted/60 outline-none transition-colors " +
  "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"

const TEXTAREA = INPUT + " min-h-[100px] resize-y"

// ── Main component ─────────────────────────────────────────────────────────

export default function ReinscriptionForm({
  annee,
  doctorantId,
  laboratoireId,
  correctionComment,
  personalInfo,
  doctoralInfo,
  draft,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState(0)
  const [serverError, setServerError] = useState<string | null>(null)

  // Step 3
  const [travauxRealises, setTravauxRealises] = useState(draft?.travauxRealises ?? "")
  const [etatAvancement, setEtatAvancement] = useState(draft?.etatAvancement ?? "")
  const [difficultes, setDifficultes] = useState(draft?.difficultes ?? "")
  const [objectifsFuturs, setObjectifsFuturs] = useState(draft?.objectifsFuturs ?? "")

  // Step 4
  const [publications, setPublications] = useState<Publication[]>(
    draft?.publications ?? []
  )

  // Step 5
  const [activites, setActivites] = useState<Activite[]>(draft?.activites ?? [])

  // ── Publication helpers ──────────────────────────────────────────────────

  function addPub() {
    setPublications((prev) => [
      ...prev,
      {
        titre: "",
        type: "article",
        auteurs: "",
        revue: "",
        annee: String(new Date().getFullYear()),
        doi: "",
        statut: "",
      },
    ])
  }

  function removePub(i: number) {
    setPublications((prev) => prev.filter((_, j) => j !== i))
  }

  function updatePub(i: number, key: keyof Publication, value: string) {
    setPublications((prev) =>
      prev.map((p, j) => (j === i ? { ...p, [key]: value } : p))
    )
  }

  // ── Activity helpers ─────────────────────────────────────────────────────

  function addAct() {
    setActivites((prev) => [
      ...prev,
      { type: "congrès", titre: "", lieu: "", date: "" },
    ])
  }

  function removeAct(i: number) {
    setActivites((prev) => prev.filter((_, j) => j !== i))
  }

  function updateAct(i: number, key: keyof Activite, value: string) {
    setActivites((prev) =>
      prev.map((a, j) => (j === i ? { ...a, [key]: value } : a))
    )
  }

  // ── Save / submit ────────────────────────────────────────────────────────

  function save(status: "BROUILLON" | "SOUMIS") {
    startTransition(async () => {
      setServerError(null)
      const result = await saveDossier({
        dossierId: draft?.id ?? null,
        doctorantId,
        laboratoireId,
        anneeUniversitaire: annee,
        travauxRealises,
        etatAvancement,
        difficultes,
        objectifsFuturs,
        publications,
        activites,
        status,
      })
      if (result.error) {
        setServerError(result.error)
      } else {
        router.push("/dashboard/doctorant")
      }
    })
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-6 h-[3px] w-8 bg-accent" />
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">
        Réinscription {annee}
      </h1>
      <p className="mb-6 text-sm text-muted">
        Complétez les 6 étapes pour soumettre votre demande.
      </p>

      {/* Correction banner — shown on every step when form opened in correction mode */}
      {correctionComment && (
        <div className="mb-6 rounded border border-danger/30 bg-danger-bg px-5 py-4">
          <p className="mb-1 text-xs font-semibold text-danger">
            Correction demandée — apportez les modifications suivantes :
          </p>
          <p className="text-sm text-danger">{correctionComment}</p>
        </div>
      )}

      {/* Progress bar */}
      <div className="mb-8 flex items-start gap-1">
        {STEPS.map((label, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                i < step
                  ? "bg-accent text-white"
                  : i === step
                  ? "bg-accent text-white ring-2 ring-accent ring-offset-2"
                  : "bg-border text-muted"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </div>
            <span
              className={`text-center text-[9px] leading-tight ${
                i === step ? "font-medium text-accent" : "text-muted"
              }`}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Step card */}
      <div className="rounded border border-border">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            Étape {step + 1} — {STEPS[step]}
          </h2>
        </div>

        <div className="px-5 py-5">
          {/* ── Step 1: Personal info (read-only) ── */}
          {step === 0 && (
            <>
              <p className="mb-4 text-sm text-muted">
                Vérifiez vos informations personnelles. Si des données sont
                incorrectes, contactez l&apos;administration.
              </p>
              <div className="divide-y divide-border">
                <ReadRow label="Nom" value={personalInfo.nom} />
                <ReadRow label="Prénom" value={personalInfo.prenom} />
                <ReadRow label="CIN" value={personalInfo.cin} />
                <ReadRow label="CNE" value={personalInfo.cne} />
                <ReadRow label="N° Apogée" value={personalInfo.apogee} />
                <ReadRow
                  label="Date de naissance"
                  value={personalInfo.dateNaissance}
                />
                <ReadRow label="Téléphone" value={personalInfo.telephone} />
              </div>
            </>
          )}

          {/* ── Step 2: Doctoral info (read-only) ── */}
          {step === 1 && (
            <>
              <p className="mb-4 text-sm text-muted">
                Vérifiez vos informations doctorales.
              </p>
              <div className="divide-y divide-border">
                <ReadRow
                  label="Formation"
                  value={doctoralInfo.formation}
                />
                <ReadRow
                  label="Laboratoire"
                  value={doctoralInfo.laboratoire}
                />
                <ReadRow
                  label="Sujet de thèse"
                  value={doctoralInfo.sujetThese}
                />
                <ReadRow
                  label="Première inscription"
                  value={String(doctoralInfo.anneePremiereInscription)}
                />
              </div>
            </>
          )}

          {/* ── Step 3: Thesis progress ── */}
          {step === 2 && (
            <div className="space-y-4">
              <Field label="Travaux réalisés">
                <textarea
                  className={TEXTAREA}
                  value={travauxRealises}
                  onChange={(e) => setTravauxRealises(e.target.value)}
                  placeholder="Décrivez les travaux réalisés depuis votre dernière inscription…"
                />
              </Field>
              <Field label="État d'avancement">
                <textarea
                  className={TEXTAREA}
                  value={etatAvancement}
                  onChange={(e) => setEtatAvancement(e.target.value)}
                  placeholder="Décrivez l'état d'avancement de votre thèse…"
                />
              </Field>
              <Field label="Difficultés rencontrées">
                <textarea
                  className={TEXTAREA}
                  value={difficultes}
                  onChange={(e) => setDifficultes(e.target.value)}
                  placeholder="Décrivez les difficultés éventuelles…"
                />
              </Field>
              <Field label="Objectifs futurs">
                <textarea
                  className={TEXTAREA}
                  value={objectifsFuturs}
                  onChange={(e) => setObjectifsFuturs(e.target.value)}
                  placeholder="Décrivez vos objectifs pour la prochaine année…"
                />
              </Field>
            </div>
          )}

          {/* ── Step 4: Publications ── */}
          {step === 3 && (
            <div>
              {publications.length === 0 ? (
                <p className="mb-4 text-sm text-muted">
                  Aucune publication ajoutée. Cette section est facultative.
                </p>
              ) : (
                <div className="mb-4 space-y-4">
                  {publications.map((pub, i) => (
                    <div
                      key={i}
                      className="rounded border border-border p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                          Publication {i + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removePub(i)}
                          className="text-xs text-danger transition-colors hover:text-danger/80"
                        >
                          Supprimer
                        </button>
                      </div>
                      <div className="space-y-3">
                        <Field label="Titre">
                          <input
                            className={INPUT}
                            value={pub.titre}
                            onChange={(e) =>
                              updatePub(i, "titre", e.target.value)
                            }
                            placeholder="Titre de la publication"
                          />
                        </Field>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Field label="Type">
                            <select
                              className={INPUT}
                              value={pub.type}
                              onChange={(e) =>
                                updatePub(i, "type", e.target.value)
                              }
                            >
                              {PUB_TYPES.map((t) => (
                                <option key={t} value={t}>
                                  {t.charAt(0).toUpperCase() + t.slice(1)}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Année">
                            <input
                              className={INPUT}
                              type="number"
                              value={pub.annee}
                              onChange={(e) =>
                                updatePub(i, "annee", e.target.value)
                              }
                              min="1990"
                              max="2099"
                            />
                          </Field>
                        </div>
                        <Field label="Auteurs">
                          <input
                            className={INPUT}
                            value={pub.auteurs}
                            onChange={(e) =>
                              updatePub(i, "auteurs", e.target.value)
                            }
                            placeholder="Prénom Nom, Prénom Nom…"
                          />
                        </Field>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Field label="Revue / Conférence">
                            <input
                              className={INPUT}
                              value={pub.revue}
                              onChange={(e) =>
                                updatePub(i, "revue", e.target.value)
                              }
                              placeholder="Nom de la revue"
                            />
                          </Field>
                          <Field label="DOI">
                            <input
                              className={INPUT}
                              value={pub.doi}
                              onChange={(e) =>
                                updatePub(i, "doi", e.target.value)
                              }
                              placeholder="10.xxxx/xxxxx"
                            />
                          </Field>
                        </div>
                        <Field label="Statut">
                          <input
                            className={INPUT}
                            value={pub.statut}
                            onChange={(e) =>
                              updatePub(i, "statut", e.target.value)
                            }
                            placeholder="Ex : Publié, Soumis, En révision…"
                          />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={addPub}
                className="text-sm text-accent transition-colors hover:text-accent-dark"
              >
                + Ajouter une publication
              </button>
            </div>
          )}

          {/* ── Step 5: Scientific activities ── */}
          {step === 4 && (
            <div>
              {activites.length === 0 ? (
                <p className="mb-4 text-sm text-muted">
                  Aucune activité ajoutée. Cette section est facultative.
                </p>
              ) : (
                <div className="mb-4 space-y-4">
                  {activites.map((act, i) => (
                    <div
                      key={i}
                      className="rounded border border-border p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                          Activité {i + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeAct(i)}
                          className="text-xs text-danger transition-colors hover:text-danger/80"
                        >
                          Supprimer
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Field label="Type">
                            <select
                              className={INPUT}
                              value={act.type}
                              onChange={(e) =>
                                updateAct(i, "type", e.target.value)
                              }
                            >
                              {ACT_TYPES.map((t) => (
                                <option key={t} value={t}>
                                  {t.charAt(0).toUpperCase() + t.slice(1)}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Date">
                            <input
                              className={INPUT}
                              type="date"
                              value={act.date}
                              onChange={(e) =>
                                updateAct(i, "date", e.target.value)
                              }
                            />
                          </Field>
                        </div>
                        <Field label="Titre / Intitulé">
                          <input
                            className={INPUT}
                            value={act.titre}
                            onChange={(e) =>
                              updateAct(i, "titre", e.target.value)
                            }
                            placeholder="Intitulé de l'activité"
                          />
                        </Field>
                        <Field label="Lieu">
                          <input
                            className={INPUT}
                            value={act.lieu}
                            onChange={(e) =>
                              updateAct(i, "lieu", e.target.value)
                            }
                            placeholder="Ville, Pays"
                          />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={addAct}
                className="text-sm text-accent transition-colors hover:text-accent-dark"
              >
                + Ajouter une activité
              </button>
            </div>
          )}

          {/* ── Step 6: Summary ── */}
          {step === 5 && (
            <div className="space-y-4">
              <p className="text-sm text-muted">
                Vérifiez l&apos;ensemble des informations avant de soumettre
                votre dossier. Une fois soumis, il ne pourra plus être modifié.
              </p>

              <SummaryBlock title="Informations personnelles">
                <ReadRow
                  label="Nom complet"
                  value={`${personalInfo.prenom} ${personalInfo.nom}`}
                />
                <ReadRow label="CIN" value={personalInfo.cin} />
                <ReadRow label="CNE" value={personalInfo.cne} />
                <ReadRow label="N° Apogée" value={personalInfo.apogee} />
                <ReadRow
                  label="Date de naissance"
                  value={personalInfo.dateNaissance}
                />
                <ReadRow label="Téléphone" value={personalInfo.telephone} />
              </SummaryBlock>

              <SummaryBlock title="Informations doctorales">
                <ReadRow label="Formation" value={doctoralInfo.formation} />
                <ReadRow
                  label="Laboratoire"
                  value={doctoralInfo.laboratoire}
                />
                <ReadRow
                  label="Sujet de thèse"
                  value={doctoralInfo.sujetThese}
                />
                <ReadRow
                  label="Première inscription"
                  value={String(doctoralInfo.anneePremiereInscription)}
                />
              </SummaryBlock>

              <SummaryBlock title="Avancement de thèse">
                <ReadRow
                  label="Travaux réalisés"
                  value={travauxRealises || "—"}
                />
                <ReadRow
                  label="État d'avancement"
                  value={etatAvancement || "—"}
                />
                <ReadRow
                  label="Difficultés"
                  value={difficultes || "—"}
                />
                <ReadRow
                  label="Objectifs futurs"
                  value={objectifsFuturs || "—"}
                />
              </SummaryBlock>

              <SummaryBlock title={`Publications (${publications.length})`}>
                {publications.length === 0 ? (
                  <ReadRow label="—" value="Aucune publication" />
                ) : (
                  publications.map((p, i) => (
                    <ReadRow
                      key={i}
                      label={`Publication ${i + 1}`}
                      value={`${p.titre} — ${p.auteurs} (${p.annee})`}
                    />
                  ))
                )}
              </SummaryBlock>

              <SummaryBlock
                title={`Activités scientifiques (${activites.length})`}
              >
                {activites.length === 0 ? (
                  <ReadRow label="—" value="Aucune activité" />
                ) : (
                  activites.map((a, i) => (
                    <ReadRow
                      key={i}
                      label={`Activité ${i + 1}`}
                      value={[a.titre, a.lieu, a.date]
                        .filter(Boolean)
                        .join(" — ")}
                    />
                  ))
                )}
              </SummaryBlock>
            </div>
          )}
        </div>

        {/* Error banner */}
        {serverError && (
          <div className="mx-5 mb-4 rounded border border-danger/20 bg-danger-bg px-4 py-3">
            <p className="text-sm text-danger">{serverError}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="text-sm text-muted transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Précédent
          </button>

          <div className="flex flex-wrap gap-2">
            {step < 5 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="rounded bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
              >
                Continuer →
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => save("BROUILLON")}
                  disabled={isPending}
                  className="rounded border border-border px-4 py-2 text-sm text-muted transition-colors hover:text-foreground disabled:opacity-40"
                >
                  Sauvegarder
                </button>
                <button
                  type="button"
                  onClick={() => save("SOUMIS")}
                  disabled={isPending}
                  className="rounded bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
                >
                  {isPending
                    ? "Envoi en cours…"
                    : correctionComment
                    ? "Resoumettre le dossier"
                    : "Soumettre la demande"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Helper components ──────────────────────────────────────────────────────

function ReadRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-border sm:flex-row sm:gap-6">
      <span className="text-xs text-muted sm:w-36 sm:shrink-0">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}

function SummaryBlock({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded border border-border">
      <div className="border-b border-border px-4 py-2.5">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          {title}
        </h3>
      </div>
      <div className="px-4">{children}</div>
    </div>
  )
}
