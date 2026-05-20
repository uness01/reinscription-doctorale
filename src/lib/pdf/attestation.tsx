import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer"

// ── Types ──────────────────────────────────────────────────────────────────

export type AttestationData = {
  prenom: string
  nom: string
  cin: string
  cne: string
  apogee: string
  formationDoctorale: string
  laboratoire: string
  sujetThese: string
  anneeUniversitaire: string
  dateGeneration: string
}

// ── Styles ─────────────────────────────────────────────────────────────────

// oklch(44% 0.15 155) ≈ #2d6a4f — the institutional green
const ACCENT = "#2d6a4f"

const styles = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 56,
    paddingHorizontal: 64,
    fontFamily: "Helvetica",
    fontSize: 11,
    color: "#1a1a1a",
    lineHeight: 1.5,
  },
  topBar: {
    height: 5,
    backgroundColor: ACCENT,
    marginBottom: 28,
  },
  institution: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    color: ACCENT,
    marginBottom: 3,
  },
  subInstitution: {
    fontSize: 10,
    textAlign: "center",
    color: "#555",
    marginBottom: 28,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#d0d0d0",
    marginBottom: 28,
  },
  title: {
    fontSize: 17,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    color: ACCENT,
    marginBottom: 6,
    letterSpacing: 1,
  },
  annee: {
    fontSize: 12,
    textAlign: "center",
    color: "#555",
    marginBottom: 32,
  },
  intro: {
    marginBottom: 16,
  },
  infoBlock: {
    paddingLeft: 16,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 5,
  },
  infoLabel: {
    width: 130,
    fontFamily: "Helvetica-Bold",
    color: "#333",
    fontSize: 10,
  },
  infoValue: {
    flex: 1,
    fontSize: 10,
  },
  body: {
    marginBottom: 16,
  },
  closingText: {
    marginTop: 8,
    marginBottom: 48,
    color: "#333",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  footerDate: {
    fontSize: 10,
    color: "#666",
    paddingTop: 4,
  },
  signatureBlock: {
    width: 180,
    alignItems: "center",
  },
  signatureTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    marginBottom: 44,
    textAlign: "center",
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#888",
    width: 160,
    marginBottom: 4,
  },
  signatureNote: {
    fontSize: 9,
    color: "#777",
    textAlign: "center",
  },
})

// ── PDF document ───────────────────────────────────────────────────────────

function AttestationDoc(data: AttestationData) {
  return (
    <Document
      title={`Attestation de réinscription — ${data.prenom} ${data.nom}`}
      author="Université Ibn Tofail — Centre des Études Doctorales"
      subject={`Réinscription en doctorat ${data.anneeUniversitaire}`}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.topBar} />

        <Text style={styles.institution}>
          UNIVERSITÉ IBN TOFAIL — KÉNITRA
        </Text>
        <Text style={styles.subInstitution}>
          Centre des Études Doctorales
        </Text>

        <View style={styles.divider} />

        <Text style={styles.title}>ATTESTATION DE RÉINSCRIPTION</Text>
        <Text style={styles.annee}>
          Année universitaire {data.anneeUniversitaire}
        </Text>

        <Text style={styles.intro}>
          Le Centre des Études Doctorales de l&apos;Université Ibn Tofail
          certifie que l&apos;étudiant(e) dont les informations suivent :
        </Text>

        <View style={styles.infoBlock}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nom et prénom :</Text>
            <Text style={styles.infoValue}>
              {data.prenom} {data.nom}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>CIN :</Text>
            <Text style={styles.infoValue}>{data.cin}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>CNE :</Text>
            <Text style={styles.infoValue}>{data.cne}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>N° Apogée :</Text>
            <Text style={styles.infoValue}>{data.apogee}</Text>
          </View>
        </View>

        <Text style={styles.body}>
          est régulièrement réinscrit(e) en formation doctorale pour
          l&apos;année universitaire {data.anneeUniversitaire} dans les
          conditions suivantes :
        </Text>

        <View style={styles.infoBlock}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Formation doctorale :</Text>
            <Text style={styles.infoValue}>{data.formationDoctorale}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Laboratoire :</Text>
            <Text style={styles.infoValue}>{data.laboratoire}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Sujet de thèse :</Text>
            <Text style={styles.infoValue}>{data.sujetThese}</Text>
          </View>
        </View>

        <Text style={styles.closingText}>
          La présente attestation est délivrée pour servir et valoir ce que
          de droit.
        </Text>

        <View style={styles.footer}>
          <Text style={styles.footerDate}>
            Fait à Kénitra, le {data.dateGeneration}
          </Text>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureTitle}>Le Doyen</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureNote}>Université Ibn Tofail</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

// ── Generator ──────────────────────────────────────────────────────────────

export async function generateAttestationPdf(
  data: AttestationData
): Promise<Buffer> {
  const result = await renderToBuffer(<AttestationDoc {...data} />)
  return Buffer.from(result)
}
