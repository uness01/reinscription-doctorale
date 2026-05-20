import { cache } from "react"
import { createClient } from "./supabase/server"
import { prisma } from "./prisma"

// Cached per request — layout + page share one DB round-trip
export const getSessionUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) return null

  return prisma.user.findUnique({
    where: { email: user.email },
    select: { id: true, nom: true, prenom: true, role: true },
  })
})
