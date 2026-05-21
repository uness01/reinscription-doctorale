"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

const inputBase =
  "w-full rounded border border-border bg-white px-3.5 py-2.5 text-sm text-foreground " +
  "placeholder:text-muted/60 outline-none transition-colors " +
  "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"

type Phase = "exchanging" | "ready" | "success" | "error"

export default function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const code = searchParams.get("code")

  const [phase, setPhase] = useState<Phase>("exchanging")
  const [exchangeError, setExchangeError] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!code) {
      setExchangeError("Lien invalide ou expiré. Veuillez recommencer.")
      setPhase("error")
      return
    }

    const supabase = createClient()
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setExchangeError(error.message)
        setPhase("error")
      } else {
        setPhase("ready")
      }
    })
  }, [code])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (password.length < 8)
      return setFormError("Le mot de passe doit contenir au moins 8 caractères.")
    if (password !== confirm)
      return setFormError("Les deux mots de passe ne correspondent pas.")

    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)

    if (error) {
      setFormError(error.message)
    } else {
      setPhase("success")
      await supabase.auth.signOut()
      setTimeout(() => router.push("/login"), 2500)
    }
  }

  return (
    <>
      {/* Exchanging token */}
      {phase === "exchanging" && (
        <p className="mt-6 text-sm text-muted">Vérification du lien en cours…</p>
      )}

      {/* Invalid / expired link */}
      {phase === "error" && (
        <div className="mt-8">
          <div className="rounded border border-danger/20 bg-danger-bg px-5 py-4">
            <p className="text-sm font-medium text-danger">Lien invalide ou expiré</p>
            <p className="mt-1 text-sm text-danger/80">
              {exchangeError ?? "Ce lien est invalide ou a expiré."}
            </p>
          </div>
          <Link
            href="/forgot-password"
            className="mt-6 inline-flex text-sm text-muted transition-colors hover:text-accent"
          >
            ← Demander un nouveau lien
          </Link>
        </div>
      )}

      {/* Password form */}
      {phase === "ready" && (
        <>
          <p className="mb-8 text-sm leading-relaxed text-muted">
            Choisissez un nouveau mot de passe pour votre compte.
          </p>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground">
                Nouveau mot de passe
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Minimum 8 caractères"
                className={inputBase}
              />
            </div>

            <div>
              <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-foreground">
                Confirmer le mot de passe
              </label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                placeholder="Répétez le mot de passe"
                className={inputBase}
              />
            </div>

            {formError && (
              <div className="rounded border border-danger/20 bg-danger-bg px-4 py-3">
                <p className="text-sm text-danger">{formError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Enregistrement…" : "Enregistrer le mot de passe"}
            </button>
          </form>
        </>
      )}

      {/* Success */}
      {phase === "success" && (
        <div className="mt-8">
          <div className="rounded border border-accent/30 bg-accent/5 px-5 py-4">
            <p className="text-sm font-medium text-foreground">Mot de passe mis à jour</p>
            <p className="mt-1 text-sm text-muted">
              Votre mot de passe a été modifié avec succès. Vous allez être redirigé vers la
              page de connexion…
            </p>
          </div>
        </div>
      )}
    </>
  )
}
