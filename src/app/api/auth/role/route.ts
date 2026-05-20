import { createServerClient } from "@supabase/ssr"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {
          // read-only — token refresh not needed for a simple role lookup
        },
      },
    }
  )

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user?.email) {
    return NextResponse.json({ role: null }, { status: 401 })
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
    select: { role: true },
  })

  if (!dbUser) {
    return NextResponse.json({ role: null }, { status: 404 })
  }

  return NextResponse.json({ role: dbUser.role })
}
