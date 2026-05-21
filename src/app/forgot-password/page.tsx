"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

const inputBase =
  "w-full rounded border border-border bg-white px-3.5 py-2.5 text-sm text-foreground " +
  "placeholder:text-muted/60 outline-none transition-colors " +
  "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return setError("Veuillez saisir votre adresse email.")

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: supabaseError } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)

    if (supabaseError) {
      setError(supabaseError.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="h-[3px] shrink-0 bg-accent" />

      <header className="shrink-0 border-b border-border px-6 py-3">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
          Université Ibn Tofail&nbsp;&nbsp;·&nbsp;&nbsp;Centre des Études Doctorales
        </p>
      </header>

      <main className="flex-1 px-6 pb-24 pt-16">
        <div className="mx-auto max-w-[400px]">
          <div className="mb-6 h-[3px] w-8 bg-accent" />
          <h1 className="mb-2 text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">
            Mot de passe oublié
          </h1>

          {sent ? (
            <div className="mt-8">
              <div className="rounded border border-accent/30 bg-accent/5 px-5 py-4">
                <p className="text-sm font-medium text-foreground">Email envoyé</p>
                <p className="mt-1 text-sm text-muted">
                  Un email de réinitialisation a été envoyé à{" "}
                  <span className="font-medium text-foreground">{email.trim()}</span>.
                  Vérifiez votre boîte de réception et suivez le lien pour choisir un nouveau mot
                  de passe.
                </p>
              </div>
              <Link
                href="/login"
                className="mt-6 inline-flex text-sm text-muted transition-colors hover:text-accent"
              >
                ← Retour à la connexion
              </Link>
            </div>
          ) : (
            <>
              <p className="mb-8 text-sm leading-relaxed text-muted">
                Saisissez votre adresse email institutionnelle. Nous vous enverrons un lien pour
                réinitialiser votre mot de passe.
              </p>

              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
                    Email institutionnel
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="prenom.nom@uit.ac.ma"
                    className={inputBase}
                  />
                </div>

                {error && (
                  <div className="rounded border border-danger/20 bg-danger-bg px-4 py-3">
                    <p className="text-sm text-danger">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Envoi en cours…" : "Envoyer le lien de réinitialisation"}
                </button>
              </form>

              <Link
                href="/login"
                className="mt-6 inline-flex text-sm text-muted transition-colors hover:text-accent"
              >
                ← Retour à la connexion
              </Link>
            </>
          )}
        </div>
      </main>

      <footer className="shrink-0 border-t border-border px-6 py-3">
        <p className="text-xs text-muted">
          © {new Date().getFullYear()} Université Ibn Tofail — Kénitra
        </p>
      </footer>
    </div>
  )
}
