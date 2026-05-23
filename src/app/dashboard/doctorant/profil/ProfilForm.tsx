"use client"

import { useState, useTransition } from "react"
import { updateProfil } from "./actions"

const INPUT =
  "w-full rounded border border-border bg-white px-3 py-2 text-sm text-foreground " +
  "placeholder:text-muted/60 outline-none transition-colors " +
  "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"

const TEXTAREA = INPUT + " min-h-[80px] resize-y"

export default function ProfilForm({
  telephone,
  sujetThese,
}: {
  telephone: string
  sujetThese: string
}) {
  const [isPending, startTransition] = useTransition()
  const [tel, setTel] = useState(telephone)
  const [sujet, setSujet] = useState(sujetThese)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleSave() {
    startTransition(async () => {
      setError(null)
      setSuccess(false)
      const result = await updateProfil({ telephone: tel, sujetThese: sujet })
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-foreground">
          Téléphone
        </label>
        <input
          className={INPUT}
          value={tel}
          onChange={(e) => { setTel(e.target.value); setSuccess(false) }}
          placeholder="Ex : 0600000000"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-foreground">
          Sujet de thèse
        </label>
        <textarea
          className={TEXTAREA}
          value={sujet}
          onChange={(e) => { setSujet(e.target.value); setSuccess(false) }}
          placeholder="Intitulé de votre sujet de thèse"
        />
      </div>

      {error && (
        <div className="rounded border border-danger/20 bg-danger-bg px-4 py-3">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}
      {success && (
        <div className="rounded border border-success/20 bg-success/5 px-4 py-3">
          <p className="text-sm text-success">Profil mis à jour avec succès.</p>
        </div>
      )}

      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
        >
          {isPending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  )
}
