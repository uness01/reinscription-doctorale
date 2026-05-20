"use client"

import { logout } from "./actions"

export default function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="mt-1 text-xs text-muted transition-colors hover:text-accent"
      >
        Se déconnecter
      </button>
    </form>
  )
}
