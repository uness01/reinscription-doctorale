import { createClient } from "@supabase/supabase-js"
import { PrismaClient, Role, DossierStatus } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import * as dotenv from "dotenv"

dotenv.config()

// Admin client — uses the secret key to bypass email confirmation
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Prisma 7 requires a driver adapter (Rust engine removed)
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const PASSWORD = "Test1234!"

// One test account per role — all use @uit.ac.ma per the login page validation
const USERS: {
  email: string
  nom: string
  prenom: string
  role: Role
}[] = [
  { email: "doctorant@uit.ac.ma", nom: "Bennani", prenom: "Ahmed", role: Role.DOCTORANT },
  { email: "encadrant@uit.ac.ma", nom: "Alaoui", prenom: "Fatima", role: Role.ENCADRANT },
  { email: "admin@uit.ac.ma", nom: "Chakir", prenom: "Youssef", role: Role.ADMIN },
  { email: "directeur@uit.ac.ma", nom: "Mansouri", prenom: "Hassan", role: Role.DIRECTEUR_LABO },
  { email: "doyen@uit.ac.ma", nom: "Tazi", prenom: "Nadia", role: Role.DOYEN },
]

// Stable ID so the Laboratoire upsert is idempotent across re-runs
const LABO_SEED_ID = "seed-labo-01"

async function ensureSupabaseUser(email: string): Promise<void> {
  const { error } = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true, // skip verification email in development
  })

  if (!error) {
    console.log(`  ✓ auth created  ${email}`)
    return
  }

  // HTTP 422 = the email is already registered — safe to continue
  if (error.status === 422 || error.message.toLowerCase().includes("already")) {
    console.log(`  · auth exists   ${email}`)
    return
  }

  throw new Error(`Supabase error for ${email}: ${error.message}`)
}

async function main() {
  // ── 1. Supabase Auth ──────────────────────────────────────────────────────
  console.log("Step 1 — Supabase Auth users")
  for (const u of USERS) {
    await ensureSupabaseUser(u.email)
  }

  // ── 2. Prisma User rows ───────────────────────────────────────────────────
  console.log("\nStep 2 — Prisma User rows")
  for (const u of USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { email: u.email, nom: u.nom, prenom: u.prenom, role: u.role },
    })
    console.log(`  ✓ ${u.role.padEnd(14)} ${u.email}`)
  }

  // ── 3. Laboratoire ────────────────────────────────────────────────────────
  console.log("\nStep 3 — Laboratoire")
  const labo = await prisma.laboratoire.upsert({
    where: { id: LABO_SEED_ID },
    update: {},
    create: {
      id: LABO_SEED_ID,
      nom: "Laboratoire Informatique et Systèmes",
    },
  })
  console.log(`  ✓ ${labo.nom}`)

  // ── 4. Doctorant profile ──────────────────────────────────────────────────
  console.log("\nStep 4 — Doctorant profile")
  const doctorantUser = await prisma.user.findUniqueOrThrow({
    where: { email: "doctorant@uit.ac.ma" },
  })

  const doctorant = await prisma.doctorant.upsert({
    where: { userId: doctorantUser.id },
    update: {},
    create: {
      userId: doctorantUser.id,
      cin: "BK123456",
      cne: "R135792468",
      apogee: "12345678",
      dateNaissance: new Date("1998-06-15"),
      telephone: "0612345678",
      formationDoctorale: "Informatique et Mathématiques Appliquées",
      laboratoireId: labo.id,
      sujetThese:
        "Intelligence artificielle appliquée à l'optimisation des réseaux",
      anneePremiereInscription: 2022,
    },
  })
  console.log("  ✓ Doctorant profile linked to Ahmed Bennani")

  // ── 5. Encadrant profile ──────────────────────────────────────────────────
  console.log("\nStep 5 — Encadrant profile")
  const encadrantUser = await prisma.user.findUniqueOrThrow({
    where: { email: "encadrant@uit.ac.ma" },
  })

  const encadrant = await prisma.encadrant.upsert({
    where: { userId: encadrantUser.id },
    update: {},
    create: { userId: encadrantUser.id },
  })
  console.log("  ✓ Encadrant profile linked to Fatima Alaoui")

  // ── 6. Completed past dossiers for Ahmed Bennani ─────────────────────────
  console.log("\nStep 6 — Past reinscription dossiers")
  const pastYears = ["2022-2023", "2023-2024", "2024-2025"]
  for (const annee of pastYears) {
    const existing = await prisma.dossier.findFirst({
      where: { doctorantId: doctorant.id, anneeUniversitaire: annee },
      select: { id: true, status: true },
    })
    if (existing) {
      if (existing.status !== DossierStatus.REINSCRIPTION_EFFECTUEE) {
        await prisma.dossier.update({
          where: { id: existing.id },
          data: { status: DossierStatus.REINSCRIPTION_EFFECTUEE },
        })
        console.log(`  ↩ updated  ${annee} → REINSCRIPTION_EFFECTUEE`)
      } else {
        console.log(`  · exists   ${annee}`)
      }
    } else {
      await prisma.dossier.create({
        data: {
          doctorantId: doctorant.id,
          laboratoireId: labo.id,
          anneeUniversitaire: annee,
          status: DossierStatus.REINSCRIPTION_EFFECTUEE,
        },
      })
      console.log(`  ✓ created  ${annee}`)
    }
  }

  // ── 7. 2025-2026 dossier assigned to Fatima Alaoui, awaiting her decision ──
  // updateMany covers every 2025-2026 dossier for Ahmed (there may be more than
  // one if the form was used before seeding), so the encadrantId is never missed.
  console.log("\nStep 7 — 2025-2026 dossier for encadrant testing")
  const annee2526 = "2025-2026"
  const { count } = await prisma.dossier.updateMany({
    where: { doctorantId: doctorant.id, anneeUniversitaire: annee2526 },
    data: {
      encadrantId: encadrant.id,
      status: DossierStatus.EN_ATTENTE_ENCADRANT,
    },
  })
  if (count > 0) {
    console.log(`  ✓ updated  ${count} dossier(s) ${annee2526} → EN_ATTENTE_ENCADRANT, encadrant assigned`)
  } else {
    await prisma.dossier.create({
      data: {
        doctorantId: doctorant.id,
        laboratoireId: labo.id,
        anneeUniversitaire: annee2526,
        encadrantId: encadrant.id,
        status: DossierStatus.EN_ATTENTE_ENCADRANT,
      },
    })
    console.log(`  ✓ created  ${annee2526} → EN_ATTENTE_ENCADRANT, encadrant assigned`)
  }

  console.log("\nSeed complete. Test credentials:")
  console.log("  Password for all accounts: Test1234!")
  for (const u of USERS) {
    console.log(`  ${u.role.padEnd(14)} → ${u.email}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
