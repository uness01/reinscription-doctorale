import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import ProfilForm from "./ProfilForm"

export default async function ProfilPage() {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  if (user.role !== "DOCTORANT") redirect("/dashboard")

  const doctorant = await prisma.doctorant.findUnique({
    where: { userId: user.id },
    include: {
      user: { select: { email: true } },
      laboratoire: { select: { nom: true } },
      encadrant: { include: { user: { select: { nom: true, prenom: true } } } },
    },
  })

  if (!doctorant) {
    return (
      <div className="max-w-2xl">
        <div className="mb-1 h-[3px] w-8 bg-accent" />
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">
          Mon profil
        </h1>
        <div className="rounded border border-border px-5 py-4">
          <p className="text-sm text-muted">
            Aucun profil doctorant associé à ce compte. Contactez
            l&apos;administration.
          </p>
        </div>
      </div>
    )
  }

  const dateNaissance = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(doctorant.dateNaissance))

  const encadrantNom = doctorant.encadrant
    ? `${doctorant.encadrant.user.prenom} ${doctorant.encadrant.user.nom}`
    : "—"

  return (
    <div className="max-w-2xl">
      <div className="mb-1 h-[3px] w-8 bg-accent" />
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">
        Mon profil
      </h1>
      <p className="mb-8 text-sm text-muted">
        Seuls le téléphone et le sujet de thèse sont modifiables. Pour toute
        autre correction, contactez l&apos;administration.
      </p>

      {/* Identity — read-only */}
      <section className="mb-5 rounded border border-border">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            Informations personnelles
          </h2>
        </div>
        <dl>
          <InfoRow label="Nom" value={user.nom} />
          <InfoRow label="Prénom" value={user.prenom} />
          <InfoRow label="Email" value={doctorant.user.email} />
          <InfoRow label="CIN" value={doctorant.cin} />
          <InfoRow label="CNE" value={doctorant.cne} />
          <InfoRow label="N° Apogée" value={doctorant.apogee} />
          <InfoRow label="Date de naissance" value={dateNaissance} />
        </dl>
      </section>

      {/* Doctoral info — read-only */}
      <section className="mb-5 rounded border border-border">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            Informations doctorales
          </h2>
        </div>
        <dl>
          <InfoRow label="Formation" value={doctorant.formationDoctorale} />
          <InfoRow label="Laboratoire" value={doctorant.laboratoire.nom} />
          <InfoRow label="Encadrant" value={encadrantNom} />
          <InfoRow
            label="Première inscription"
            value={String(doctorant.anneePremiereInscription)}
          />
        </dl>
      </section>

      {/* Editable fields */}
      <section className="rounded border border-border">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            Informations modifiables
          </h2>
        </div>
        <div className="px-5 py-5">
          <ProfilForm
            telephone={doctorant.telephone}
            sujetThese={doctorant.sujetThese}
          />
        </div>
      </section>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border px-5 py-3 last:border-b-0 sm:flex-row sm:gap-6">
      <dt className="text-xs text-muted sm:w-36 sm:shrink-0">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  )
}
