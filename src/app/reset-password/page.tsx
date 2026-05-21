import { Suspense } from "react"
import ResetPasswordContent from "./ResetPasswordContent"

export default function ResetPasswordPage() {
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
            Nouveau mot de passe
          </h1>

          <Suspense fallback={<p className="mt-6 text-sm text-muted">Chargement…</p>}>
            <ResetPasswordContent />
          </Suspense>
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
