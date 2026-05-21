"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { soumettreDecision } from "./actions"
import SignaturePad from "@/components/SignaturePad"

export default function ValidationPanel({ dossierId }: { dossierId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [commentaire, setCommentaire] = useState("")
  const [signature, setSignature] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function decide(decision: "APPROUVE" | "REFUSE" | "CORRECTION_DEMANDEE") {
    if (!signature) {
      setError("Veuillez apposer votre signature avant de soumettre.")
      return
    }
    startTransition(async () => {
      setError(null)
      const result = await soumettreDecision(dossierId, decision, commentaire, signature)
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
          Décision
        </h2>
      </div>
      <div className="px-5 py-5">
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-medium text-foreground">
            Commentaire
          </label>
          <textarea
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            placeholder="Ajoutez un commentaire à votre décision (facultatif)…"
            className={
              "w-full min-h-[90px] resize-y rounded border border-border bg-white px-3 py-2 " +
              "text-sm text-foreground placeholder:text-muted/60 outline-none transition-colors " +
              "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
            }
          />
        </div>

        <div className="mb-5">
          <label className="mb-1.5 block text-xs font-medium text-foreground">
            Signature <span className="text-danger">*</span>
          </label>
          <SignaturePad onChange={setSignature} />
          {!signature && (
            <p className="mt-1 text-xs text-muted">
              Dessinez votre signature dans le cadre ci-dessus.
            </p>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded border border-danger/20 bg-danger-bg px-4 py-3">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isPending || !signature}
            onClick={() => decide("APPROUVE")}
            className="rounded bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
          >
            Valider
          </button>
          <button
            type="button"
            disabled={isPending || !signature}
            onClick={() => decide("CORRECTION_DEMANDEE")}
            className="rounded border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-border/50 disabled:opacity-60"
          >
            Demander une correction
          </button>
          <button
            type="button"
            disabled={isPending || !signature}
            onClick={() => decide("REFUSE")}
            className="rounded border border-danger/30 px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger-bg disabled:opacity-60"
          >
            Refuser
          </button>
        </div>
      </div>
    </section>
  )
}
