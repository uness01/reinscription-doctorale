export default function LogoutButton() {
  return (
    <a
      href="/api/auth/logout"
      className="mt-1 text-xs text-muted transition-colors hover:text-accent"
    >
      Se déconnecter
    </a>
  )
}
