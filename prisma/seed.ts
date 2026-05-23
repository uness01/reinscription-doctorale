import { createClient } from "@supabase/supabase-js"
import { PrismaClient, Role, DossierStatus } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import * as dotenv from "dotenv"

dotenv.config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const PASSWORD = "Test1234!"

const USERS: { email: string; nom: string; prenom: string; role: Role }[] = [
  { email: "doctorant@uit.ac.ma", nom: "Bennani",  prenom: "Ahmed",  role: Role.DOCTORANT },
  { email: "encadrant@uit.ac.ma", nom: "Alaoui",   prenom: "Fatima", role: Role.ENCADRANT },
  { email: "admin@uit.ac.ma",     nom: "Chakir",   prenom: "Youssef",role: Role.ADMIN },
  { email: "directeur@uit.ac.ma", nom: "Mansouri", prenom: "Hassan", role: Role.DIRECTEUR_LABO },
  { email: "doyen@uit.ac.ma",     nom: "Tazi",     prenom: "Nadia",  role: Role.DOYEN },
]

const LABO_SEED_ID   = "seed-labo-01"
const LABO_MATHS_ID  = "seed-labo-02"
const LABO_PHYSIQUE_ID = "seed-labo-03"

// ── Helpers ────────────────────────────────────────────────────────────────

async function ensureSupabaseUser(email: string): Promise<void> {
  const { error } = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  })
  if (!error) { console.log(`  ✓ auth created  ${email}`); return }
  if (error.status === 422 || error.message.toLowerCase().includes("already")) {
    console.log(`  · auth exists   ${email}`); return
  }
  throw new Error(`Supabase error for ${email}: ${error.message}`)
}

// Upsert a single dossier using the @@unique([doctorantId, anneeUniversitaire]) key.
// forceStatus=true writes the status even when the row already exists.
async function upsertDossier(
  doctorantId: string,
  laboratoireId: string,
  anneeUniversitaire: string,
  status: DossierStatus,
  extra: { travauxRealises?: string; etatAvancement?: string } = {},
  forceStatus = false
): Promise<string> {
  const d = await prisma.dossier.upsert({
    where: { doctorantId_anneeUniversitaire: { doctorantId, anneeUniversitaire } },
    create: { doctorantId, laboratoireId, anneeUniversitaire, status, ...extra },
    update: forceStatus ? { status, ...extra } : {},
  })
  return d.id
}

// Delete ALL existing dossiers for a doctorant (and their related records), then
// recreate them from scratch. This guarantees no duplicates on repeated seed runs.
async function wipeAndCreateDossiers(
  doctorantId: string,
  laboratoireId: string,
  specs: {
    annee: string
    status: DossierStatus
    travaux?: string
    avancement?: string
    pubs?: { titre: string; type: string; auteurs: string; revue?: string; annee: number; doi?: string; statut: string }[]
  }[]
): Promise<void> {
  const existing = await prisma.dossier.findMany({
    where: { doctorantId },
    select: { id: true },
  })
  if (existing.length > 0) {
    const ids = existing.map((d) => d.id)
    await prisma.validation.deleteMany({ where: { dossierId: { in: ids } } })
    await prisma.attestation.deleteMany({ where: { dossierId: { in: ids } } })
    await prisma.publication.deleteMany({ where: { dossierId: { in: ids } } })
    await prisma.activiteScientifique.deleteMany({ where: { dossierId: { in: ids } } })
    await prisma.dossier.deleteMany({ where: { id: { in: ids } } })
  }
  for (const spec of specs) {
    const d = await prisma.dossier.create({
      data: {
        doctorantId,
        laboratoireId,
        anneeUniversitaire: spec.annee,
        status: spec.status,
        travauxRealises: spec.travaux ?? null,
        etatAvancement: spec.avancement ?? null,
      },
    })
    if (spec.pubs && spec.pubs.length > 0) {
      await prisma.publication.createMany({
        data: spec.pubs.map((p) => ({ ...p, dossierId: d.id })),
      })
    }
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  // ── 1. Supabase Auth ──────────────────────────────────────────────────────
  console.log("Step 1 — Supabase Auth users")
  for (const u of USERS) await ensureSupabaseUser(u.email)

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

  // ── 3. Laboratoires ───────────────────────────────────────────────────────
  console.log("\nStep 3 — Laboratoires")
  const labo = await prisma.laboratoire.upsert({
    where: { id: LABO_SEED_ID },
    update: {},
    create: { id: LABO_SEED_ID, nom: "Laboratoire Informatique et Systèmes" },
  })
  const laboMaths = await prisma.laboratoire.upsert({
    where: { id: LABO_MATHS_ID },
    update: {},
    create: { id: LABO_MATHS_ID, nom: "Laboratoire de Mathématiques et Applications" },
  })
  const laboPhysique = await prisma.laboratoire.upsert({
    where: { id: LABO_PHYSIQUE_ID },
    update: {},
    create: { id: LABO_PHYSIQUE_ID, nom: "Laboratoire Physique des Matériaux" },
  })
  console.log(`  ✓ ${labo.nom}`)
  console.log(`  ✓ ${laboMaths.nom}`)
  console.log(`  ✓ ${laboPhysique.nom}`)

  // ── 4. Doctorant profile (Ahmed Bennani) ──────────────────────────────────
  console.log("\nStep 4 — Doctorant profile (Ahmed Bennani)")
  const doctorantUser = await prisma.user.findUniqueOrThrow({ where: { email: "doctorant@uit.ac.ma" } })
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
      sujetThese: "Intelligence artificielle appliquée à l'optimisation des réseaux",
      anneePremiereInscription: 2022,
    },
  })
  console.log("  ✓ Ahmed Bennani")

  // ── 5. Encadrant profile ──────────────────────────────────────────────────
  console.log("\nStep 5 — Encadrant profile")
  const encadrantUser = await prisma.user.findUniqueOrThrow({ where: { email: "encadrant@uit.ac.ma" } })
  const encadrant = await prisma.encadrant.upsert({
    where: { userId: encadrantUser.id },
    update: {},
    create: { userId: encadrantUser.id },
  })
  console.log("  ✓ Fatima Alaoui")

  // ── 6. Completed past dossiers for Ahmed Bennani ─────────────────────────
  console.log("\nStep 6 — Past dossiers (Ahmed Bennani)")
  for (const annee of ["2022-2023", "2023-2024", "2024-2025"]) {
    await upsertDossier(doctorant.id, labo.id, annee, DossierStatus.REINSCRIPTION_EFFECTUEE, {}, true)
    console.log(`  ✓ upserted  ${annee} → REINSCRIPTION_EFFECTUEE`)
  }

  // ── 7. 2025-2026 dossier — reset to BROUILLON ────────────────────────────
  console.log("\nStep 7 — 2025-2026 dossier reset to BROUILLON")
  const annee2526 = "2025-2026"
  const dossiers2526 = await prisma.dossier.findMany({
    where: { doctorantId: doctorant.id, anneeUniversitaire: annee2526 },
    select: { id: true },
  })
  if (dossiers2526.length > 0) {
    const ids = dossiers2526.map((d) => d.id)
    const { count: v } = await prisma.validation.deleteMany({ where: { dossierId: { in: ids } } })
    if (v > 0) console.log(`  ✓ deleted  ${v} validation(s)`)
    const { count: a } = await prisma.attestation.deleteMany({ where: { dossierId: { in: ids } } })
    if (a > 0) console.log(`  ✓ deleted  ${a} attestation(s)`)
    const { count: p } = await prisma.publication.deleteMany({ where: { dossierId: { in: ids } } })
    if (p > 0) console.log(`  ✓ deleted  ${p} publication(s)`)
    const { count: ac } = await prisma.activiteScientifique.deleteMany({ where: { dossierId: { in: ids } } })
    if (ac > 0) console.log(`  ✓ deleted  ${ac} activité(s)`)
    const { count } = await prisma.dossier.updateMany({
      where: { doctorantId: doctorant.id, anneeUniversitaire: annee2526 },
      data: { encadrantId: encadrant.id, status: DossierStatus.BROUILLON, travauxRealises: null, etatAvancement: null, difficultes: null, objectifsFuturs: null },
    })
    console.log(`  ✓ updated  ${count} dossier(s) → BROUILLON, encadrant assigned`)
  } else {
    await prisma.dossier.upsert({
      where: { doctorantId_anneeUniversitaire: { doctorantId: doctorant.id, anneeUniversitaire: annee2526 } },
      create: { doctorantId: doctorant.id, laboratoireId: labo.id, anneeUniversitaire: annee2526, encadrantId: encadrant.id, status: DossierStatus.BROUILLON },
      update: {},
    })
    console.log(`  ✓ upserted  ${annee2526} → BROUILLON`)
  }

  // ── 8. Supabase Auth for extra doctorants ─────────────────────────────────
  console.log("\nStep 8 — Supabase Auth for extra doctorants")
  const extraEmails = [
    "sara.elfassi@uit.ac.ma",
    "karim.zouiri@uit.ac.ma",
    "nour.alami@uit.ac.ma",
    "younes.rachidi@uit.ac.ma",
    "fatine.berrada@uit.ac.ma",
  ]
  for (const email of extraEmails) await ensureSupabaseUser(email)

  // ── 9. Extra doctorant profiles — wipe all their dossiers then recreate ───
  // wipeAndCreateDossiers deletes every existing dossier (+ related records) for
  // the doctorant before creating them fresh, so running the seed multiple times
  // can never produce duplicate dossiers for these entries.
  console.log("\nStep 9 — Extra doctorants (wipe + recreate dossiers)")

  // Sara El Fassi — Mathématiques et Applications — Labo Maths ──────────────
  {
    const u = await prisma.user.upsert({
      where: { email: "sara.elfassi@uit.ac.ma" },
      update: {},
      create: { email: "sara.elfassi@uit.ac.ma", nom: "El Fassi", prenom: "Sara", role: Role.DOCTORANT },
    })
    const d = await prisma.doctorant.upsert({
      where: { userId: u.id },
      update: {},
      create: {
        userId: u.id, cin: "BK234567", cne: "R246801357", apogee: "23456789",
        dateNaissance: new Date("1997-03-22"), telephone: "0623456789",
        formationDoctorale: "Mathématiques et Applications",
        laboratoireId: laboMaths.id,
        sujetThese: "Analyse spectrale des opérateurs aux dérivées partielles",
        anneePremiereInscription: 2021,
      },
    })
    await wipeAndCreateDossiers(d.id, laboMaths.id, [
      { annee: "2021-2022", status: DossierStatus.REINSCRIPTION_EFFECTUEE },
      { annee: "2022-2023", status: DossierStatus.REINSCRIPTION_EFFECTUEE },
      { annee: "2023-2024", status: DossierStatus.REINSCRIPTION_EFFECTUEE },
      { annee: "2024-2025", status: DossierStatus.REINSCRIPTION_EFFECTUEE },
      {
        annee: "2025-2026", status: DossierStatus.VALIDE_DEFINITIVEMENT,
        travaux: "Résolution de deux conjectures ouvertes sur les opérateurs spectraux.",
        avancement: "Rédaction de la thèse en cours, 3 articles publiés.",
        pubs: [
          { titre: "Analyse spectrale des opérateurs différentiels non-autoadjoints", type: "article", auteurs: "El Fassi S., Mansouri H.", revue: "Journal of Mathematical Analysis", annee: 2024, doi: "10.1016/jmaa.2024.001", statut: "Publié" },
          { titre: "Méthodes de résolution numérique pour les EDP elliptiques", type: "article", auteurs: "El Fassi S.", revue: "Numerical Mathematics", annee: 2023, statut: "Publié" },
          { titre: "Opérateurs spectraux en dimension infinie", type: "communication", auteurs: "El Fassi S.", revue: "Colloque International de Mathématiques, Rabat", annee: 2024, statut: "Présenté" },
        ],
      },
    ])
    console.log("  ✓ Sara El Fassi — Maths — 2025-2026: VALIDE_DEFINITIVEMENT")
  }

  // Karim Zouiri — Génie Civil et Environnement — Labo Maths ────────────────
  {
    const u = await prisma.user.upsert({
      where: { email: "karim.zouiri@uit.ac.ma" },
      update: {},
      create: { email: "karim.zouiri@uit.ac.ma", nom: "Zouiri", prenom: "Karim", role: Role.DOCTORANT },
    })
    const d = await prisma.doctorant.upsert({
      where: { userId: u.id },
      update: {},
      create: {
        userId: u.id, cin: "BJ345678", cne: "R357912468", apogee: "34567890",
        dateNaissance: new Date("1996-11-08"), telephone: "0634567890",
        formationDoctorale: "Génie Civil et Environnement",
        laboratoireId: laboMaths.id,
        sujetThese: "Traitement des eaux usées par procédés membranaires couplés",
        anneePremiereInscription: 2022,
      },
    })
    await wipeAndCreateDossiers(d.id, laboMaths.id, [
      { annee: "2022-2023", status: DossierStatus.REINSCRIPTION_EFFECTUEE },
      { annee: "2023-2024", status: DossierStatus.REINSCRIPTION_EFFECTUEE },
      { annee: "2024-2025", status: DossierStatus.REFUSE },
      {
        annee: "2025-2026", status: DossierStatus.SOUMIS,
        travaux: "Mise au point du pilote de traitement membranaire à l'échelle laboratoire.",
        avancement: "Tests en cours, résultats préliminaires encourageants.",
        pubs: [
          { titre: "Efficacité des membranes céramiques pour le traitement tertiaire", type: "poster", auteurs: "Zouiri K., Benali M.", revue: "Water Science & Technology Conference", annee: 2025, statut: "Soumis" },
        ],
      },
    ])
    console.log("  ✓ Karim Zouiri — Génie Civil — 2024-2025: REFUSE, 2025-2026: SOUMIS")
  }

  // Nour El Houda Alami — Informatique et Maths — Labo Informatique ─────────
  {
    const u = await prisma.user.upsert({
      where: { email: "nour.alami@uit.ac.ma" },
      update: {},
      create: { email: "nour.alami@uit.ac.ma", nom: "Alami", prenom: "Nour El Houda", role: Role.DOCTORANT },
    })
    const d = await prisma.doctorant.upsert({
      where: { userId: u.id },
      update: {},
      create: {
        userId: u.id, cin: "BH456789", cne: "R468023579", apogee: "45678901",
        dateNaissance: new Date("1999-07-14"), telephone: "0645678901",
        formationDoctorale: "Informatique et Mathématiques Appliquées",
        laboratoireId: labo.id,
        sujetThese: "Apprentissage profond pour la détection d'anomalies dans les réseaux IoT",
        anneePremiereInscription: 2023,
      },
    })
    await wipeAndCreateDossiers(d.id, labo.id, [
      { annee: "2023-2024", status: DossierStatus.REINSCRIPTION_EFFECTUEE },
      { annee: "2024-2025", status: DossierStatus.REINSCRIPTION_EFFECTUEE },
      {
        annee: "2025-2026", status: DossierStatus.VALIDE_ENCADRANT,
        travaux: "Développement d'un modèle GNN pour la détection d'intrusions en temps réel.",
        avancement: "Modèle entraîné sur 3 datasets publics, accuracy 97.3%.",
        pubs: [
          { titre: "Graph Neural Networks for Real-Time IoT Intrusion Detection", type: "article", auteurs: "Alami N., Chakir Y.", revue: "IEEE Internet of Things Journal", annee: 2024, doi: "10.1109/jiot.2024.0123", statut: "Publié" },
          { titre: "Federated Learning for Anomaly Detection in Distributed IoT", type: "chapitre", auteurs: "Alami N.", revue: "Handbook of AI in Cybersecurity", annee: 2024, statut: "Publié" },
        ],
      },
    ])
    console.log("  ✓ Nour Alami — Informatique — 2025-2026: VALIDE_ENCADRANT")
  }

  // Younes Rachidi — Physique des Matériaux — Labo Physique ─────────────────
  {
    const u = await prisma.user.upsert({
      where: { email: "younes.rachidi@uit.ac.ma" },
      update: {},
      create: { email: "younes.rachidi@uit.ac.ma", nom: "Rachidi", prenom: "Younes", role: Role.DOCTORANT },
    })
    const d = await prisma.doctorant.upsert({
      where: { userId: u.id },
      update: {},
      create: {
        userId: u.id, cin: "BL567890", cne: "R579134680", apogee: "56789012",
        dateNaissance: new Date("1997-09-30"), telephone: "0656789012",
        formationDoctorale: "Physique des Matériaux",
        laboratoireId: laboPhysique.id,
        sujetThese: "Synthèse et caractérisation de nanocomposites magnétiques pour applications biomédicales",
        anneePremiereInscription: 2022,
      },
    })
    await wipeAndCreateDossiers(d.id, laboPhysique.id, [
      { annee: "2022-2023", status: DossierStatus.REINSCRIPTION_EFFECTUEE },
      { annee: "2023-2024", status: DossierStatus.REINSCRIPTION_EFFECTUEE },
      { annee: "2024-2025", status: DossierStatus.REINSCRIPTION_EFFECTUEE },
      {
        annee: "2025-2026", status: DossierStatus.SIGNE_DIRECTEUR,
        travaux: "Synthèse de nanoparticules Fe3O4 fonctionnalisées et tests in vitro.",
        avancement: "Résultats cytotoxicité très prometteurs, article en révision.",
        pubs: [
          { titre: "Propriétés magnétiques et biocompatibilité des nanoparticules Fe3O4 fonctionnalisées", type: "article", auteurs: "Rachidi Y., Tazi N.", revue: "Journal of Magnetism and Magnetic Materials", annee: 2024, doi: "10.1016/jmmm.2024.172", statut: "En révision" },
          { titre: "Synthèse par coprécipitation de ferrites de zinc substitués", type: "article", auteurs: "Rachidi Y.", revue: "Materials Chemistry and Physics", annee: 2023, statut: "Publié" },
        ],
      },
    ])
    console.log("  ✓ Younes Rachidi — Physique — 2025-2026: SIGNE_DIRECTEUR")
  }

  // Fatine Berrada — Mathématiques et Applications — Labo Maths ─────────────
  {
    const u = await prisma.user.upsert({
      where: { email: "fatine.berrada@uit.ac.ma" },
      update: {},
      create: { email: "fatine.berrada@uit.ac.ma", nom: "Berrada", prenom: "Fatine", role: Role.DOCTORANT },
    })
    const d = await prisma.doctorant.upsert({
      where: { userId: u.id },
      update: {},
      create: {
        userId: u.id, cin: "BM678901", cne: "R680245791", apogee: "67890123",
        dateNaissance: new Date("2000-01-25"), telephone: "0667890123",
        formationDoctorale: "Mathématiques et Applications",
        laboratoireId: laboMaths.id,
        sujetThese: "Théorie des jeux différentiels et contrôle optimal stochastique",
        anneePremiereInscription: 2023,
      },
    })
    await wipeAndCreateDossiers(d.id, laboMaths.id, [
      { annee: "2023-2024", status: DossierStatus.REINSCRIPTION_EFFECTUEE },
      {
        annee: "2024-2025", status: DossierStatus.CORRECTION_DEMANDEE,
        travaux: "Étude bibliographique complète. Début implémentation numérique.",
        avancement: "Implémentation partielle — section résultats à compléter.",
        pubs: [
          { titre: "Équilibres de Nash dans les jeux différentiels à horizon infini", type: "communication", auteurs: "Berrada F., El Fassi S.", revue: "Journées des Doctorants UIT 2024", annee: 2024, statut: "Présenté" },
          { titre: "Contrôle optimal stochastique avec information partielle", type: "poster", auteurs: "Berrada F.", revue: "Conférence Internationale de Mathématiques Appliquées", annee: 2024, statut: "Présenté" },
        ],
      },
      { annee: "2025-2026", status: DossierStatus.BROUILLON },
    ])
    console.log("  ✓ Fatine Berrada — Maths — 2024-2025: CORRECTION_DEMANDEE")
  }

  // ── 10. Blocked doctorant — eligibility-check test ───────────────────────
  // Karim Mansouri enrolled in 2024 (anneePremiereInscription = 2024).
  // His 2024-2025 reinscription dossier is stuck at CORRECTION_DEMANDEE.
  // Because prevAnnee ("2024-2025") is not completed, the eligibility check
  // blocks him from starting a 2025-2026 dossier with the warning banner.
  console.log("\nStep 10 — Blocked doctorant (Karim Mansouri)")
  await ensureSupabaseUser("blocked.doctorant@uit.ac.ma")
  {
    const u = await prisma.user.upsert({
      where: { email: "blocked.doctorant@uit.ac.ma" },
      update: {},
      create: {
        email: "blocked.doctorant@uit.ac.ma",
        nom: "Mansouri",
        prenom: "Karim",
        role: Role.DOCTORANT,
      },
    })
    const d = await prisma.doctorant.upsert({
      where: { userId: u.id },
      update: {},
      create: {
        userId: u.id,
        cin: "BN789012",
        cne: "R791356802",
        apogee: "78901234",
        dateNaissance: new Date("2000-04-10"),
        telephone: "0678901234",
        formationDoctorale: "Informatique et Mathématiques Appliquées",
        laboratoireId: labo.id,
        encadrantId: encadrant.id,
        sujetThese: "Méthodes d'apprentissage automatique pour la reconnaissance de formes",
        anneePremiereInscription: 2024,
      },
    })
    await wipeAndCreateDossiers(d.id, labo.id, [
      {
        annee: "2024-2025",
        status: DossierStatus.CORRECTION_DEMANDEE,
        travaux: "Revue bibliographique complète et étude des méthodes existantes.",
        avancement: "Ébauche du chapitre 1 rédigée — section résultats à compléter.",
      },
      // No 2025-2026 entry: when this user logs in and visits the dashboard,
      // the eligibility check fires because prevAnnee ("2024-2025") is not
      // completed, showing "Réinscription non disponible" instead of the CTA.
    ])
    console.log("  ✓ Karim Mansouri — 2024-2025: CORRECTION_DEMANDEE (no 2025-2026 dossier)")
  }

  console.log("\nSeed complete. Test credentials:")
  console.log("  Password for all accounts: Test1234!")
  for (const u of USERS) {
    console.log(`  ${u.role.padEnd(14)} → ${u.email}`)
  }
  console.log("  DOCTORANT      → blocked.doctorant@uit.ac.ma  (eligibility-blocked test)")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect(); await pool.end() })
