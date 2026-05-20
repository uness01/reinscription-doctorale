"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { confirmerReinscription } from "./actions"

export default function ConfirmerPanel({ dossierId }: { dossierId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleConfirm() {
    startTransition(async () => {
      setError(null)
      const result = await confirmerReinscription(dossierId)
      if (result.error) {
        setError(result.error)
      } else {
        router.push("/dashboard/admin")
      }
    })
  }

  return (
    <section className="rounded border border-border">
      <div className="border-b border-border px-5 py-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          Confirmation de la réinscription
        </h2>
      </div>
      <div className="px-5 py-5">
        <p className="mb-5 text-sm text-muted">
          Ce dossier a été validé définitivement par le doyen. Confirmez la
          réinscription pour générer l&apos;attestation officielle et notifier
          le doctorant.
        </p>

        {error && (
          <div className="mb-4 rounded border border-danger/20 bg-danger-bg px-4 py-3">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        <button
          type="button"
          disabled={isPending}
          onClick={handleConfirm}
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
        >
          {isPending
            ? "Génération de l'attestation…"
            : "Confirmer la réinscription"}
        </button>
      </div>
    </section>
  )
}
