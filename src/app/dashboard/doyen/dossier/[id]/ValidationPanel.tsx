"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { validerDefinitivement } from "./actions"

export default function ValidationPanel({ dossierId }: { dossierId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [commentaire, setCommentaire] = useState("")
  const [error, setError] = useState<string | null>(null)

  function handleValidate() {
    startTransition(async () => {
      setError(null)
      const result = await validerDefinitivement(dossierId, commentaire)
      if (result.error) {
        setError(result.error)
      } else {
        router.push("/dashboard/doyen")
      }
    })
  }

  return (
    <section className="rounded border border-border">
      <div className="border-b border-border px-5 py-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          Validation finale
        </h2>
      </div>
      <div className="px-5 py-5">
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-medium text-foreground">
            Commentaire (facultatif)
          </label>
          <textarea
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            placeholder="Ajoutez une remarque à votre validation…"
            className={
              "w-full min-h-[90px] resize-y rounded border border-border bg-white px-3 py-2 " +
              "text-sm text-foreground placeholder:text-muted/60 outline-none transition-colors " +
              "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
            }
          />
        </div>

        {error && (
          <div className="mb-4 rounded border border-danger/20 bg-danger-bg px-4 py-3">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        <button
          type="button"
          disabled={isPending}
          onClick={handleValidate}
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
        >
          {isPending ? "Validation en cours…" : "Valider définitivement"}
        </button>
      </div>
    </section>
  )
}
