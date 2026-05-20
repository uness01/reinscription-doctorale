"use server"

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

// Returns the role of the currently authenticated user by reading the session
// cookie that Supabase sets after a successful signInWithPassword call.
export async function getUserRole(): Promise<{
  role: string | null
  error: string | null
}> {
  const supabase = await createClient()

  // Read the authenticated user from the session cookie
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user?.email) {
    return { role: null, error: "Non authentifié" }
  }

  // Look up the user's role in the database using their email
  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
    select: { role: true },
  })

  if (!dbUser) {
    return { role: null, error: "Aucun compte trouvé pour cet email" }
  }

  return { role: dbUser.role, error: null }
}
