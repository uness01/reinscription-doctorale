"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { createClient } from "@/lib/supabase/client"
import { getUserRole } from "./actions"

// Each role maps to its dedicated dashboard route
const ROLE_ROUTES: Record<string, string> = {
  DOCTORANT: "/dashboard/doctorant",
  ENCADRANT: "/dashboard/encadrant",
  ADMIN: "/dashboard/admin",
  DIRECTEUR_LABO: "/dashboard/directeur",
  DOYEN: "/dashboard/doyen",
}

// Form validation: institutional email required, password non-empty
const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Email requis" })
    .email({ message: "Format d'email invalide" })
    .refine((val) => val.endsWith("@uit.ac.ma"), {
      message: "Veuillez utiliser votre email institutionnel (@uit.ac.ma)",
    }),
  password: z.string().min(1, { message: "Mot de passe requis" }),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  // Holds error messages returned from the server (wrong credentials, etc.)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  // Handles form submit: authenticate via Supabase, then redirect by role
  async function onSubmit(data: LoginFormData) {
    setServerError(null)
    const supabase = createClient()

    // Step 1: Sign in — Supabase stores the session in a cookie on success
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (authError) {
      setServerError("Email ou mot de passe incorrect")
      return
    }

    // Step 2: Read the role from the database (server action reads the cookie)
    const { role, error: roleError } = await getUserRole()

    if (roleError || !role) {
      setServerError(roleError ?? "Erreur lors de la récupération du rôle")
      return
    }

    // Step 3: Send the user to the dashboard that matches their role
    router.push(ROLE_ROUTES[role] ?? "/")
  }

  // Reusable class strings for input fields
  const inputBase =
    "w-full rounded border bg-white px-3.5 py-2.5 text-sm text-foreground " +
    "placeholder:text-muted/60 outline-none transition-colors " +
    "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"

  const inputError = "border-danger"
  const inputDefault = "border-border"

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* 3px accent strip — the only decorative element on the page */}
      <div className="h-[3px] shrink-0 bg-accent" />

      {/* Institution identifier */}
      <header className="shrink-0 border-b border-border px-6 py-3">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
          Université Ibn Tofail&nbsp;&nbsp;·&nbsp;&nbsp;Centre des Études Doctorales
        </p>
      </header>

      {/* Login form — centered column, no card */}
      <main className="flex-1 px-6 pb-24 pt-16">
        <div className="mx-auto max-w-[400px]">
          {/* Short accent bar anchors the title visually */}
          <div className="mb-6 h-[3px] w-8 bg-accent" />

          <h1 className="mb-2 text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">
            Gestion de Réinscription Doctorale
          </h1>

          <p className="mb-10 text-sm leading-relaxed text-muted">
            Connectez-vous avec votre email institutionnel.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Email institutionnel
              </label>
              <input
                {...register("email")}
                id="email"
                type="email"
                autoComplete="email"
                placeholder="prenom.nom@uit.ac.ma"
                className={`${inputBase} ${errors.email ? inputError : inputDefault}`}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-danger">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-foreground"
                >
                  Mot de passe
                </label>
                <a
                  href="#"
                  className="text-xs text-muted transition-colors hover:text-accent"
                >
                  Mot de passe oublié&nbsp;?
                </a>
              </div>
              <input
                {...register("password")}
                id="password"
                type="password"
                autoComplete="current-password"
                className={`${inputBase} ${errors.password ? inputError : inputDefault}`}
              />
              {errors.password && (
                <p className="mt-1.5 text-xs text-danger">{errors.password.message}</p>
              )}
            </div>

            {/* Server-side error (wrong credentials, account not found, etc.) */}
            {serverError && (
              <div className="rounded border border-danger/20 bg-danger-bg px-4 py-3">
                <p className="text-sm text-danger">{serverError}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 w-full rounded bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Connexion en cours…" : "Se connecter"}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 border-t border-border px-6 py-3">
        <p className="text-xs text-muted">
          © {new Date().getFullYear()} Université Ibn Tofail — Kénitra
        </p>
      </footer>
    </div>
  )
}
