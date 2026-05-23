"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import LogoutButton from "./LogoutButton"

type NavItem = { label: string; href: string }

type Props = {
  navItems: NavItem[]
  roleLabel: string
  userName: string
}

export default function MobileNav({ navItems, roleLabel, userName }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Hamburger button — mobile only */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden flex h-8 w-8 shrink-0 items-center justify-center rounded text-muted hover:bg-border/60 hover:text-foreground"
        aria-label="Ouvrir le menu"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-background border-r border-border transition-transform duration-200 md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Top accent bar */}
        <div className="h-[3px] shrink-0 bg-accent" />

        {/* Brand + close */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <Image
              src="/logo-small.png"
              alt="Ibn Tofail"
              width={32}
              height={32}
              className="shrink-0 object-contain"
            />
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.10em] text-muted leading-snug truncate">
                Université Ibn Tofail
              </p>
              <p className="text-[10px] uppercase tracking-[0.06em] text-muted/60 leading-snug truncate">
                Études Doctorales
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="ml-2 shrink-0 flex h-7 w-7 items-center justify-center rounded text-muted hover:bg-border/60 hover:text-foreground"
            aria-label="Fermer le menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Role badge */}
        <div className="border-b border-border px-4 py-2.5">
          <span className="inline-block rounded bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
            {roleLabel}
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center rounded px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-border/60"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User / logout */}
        <div className="border-t border-border px-5 py-3">
          <p className="truncate text-xs font-medium text-foreground">{userName}</p>
          <LogoutButton />
        </div>
      </aside>
    </>
  )
}
