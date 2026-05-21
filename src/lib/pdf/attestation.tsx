import fs from "fs"
import path from "path"
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer"

// ── Image helpers ──────────────────────────────────────────────────────────

// @react-pdf/renderer v4 requires SourceDataBuffer { data: Buffer, format } for
// embedded images — raw data URL strings are unreliable in server-side rendering.
function sigSrc(dataUrl: string): { data: Buffer; format: "png" } {
  const comma = dataUrl.indexOf(",")
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
  return { data: Buffer.from(base64, "base64"), format: "png" }
}

function logoSrc(): { data: Buffer; format: "png" } {
  const data = fs.readFileSync(path.join(process.cwd(), "public", "logo.png"))
  return { data, format: "png" }
}

// ── Types ──────────────────────────────────────────────────────────────────

export type ValidatorEntry = {
  roleLabel: string
  prenom: string
  nom: string
  date: string
  signature: string | null
}

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
  validators: ValidatorEntry[]
}

// ── Styles ─────────────────────────────────────────────────────────────────

const ACCENT = "#1B3A8C"

const styles = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 56,
    paddingHorizontal: 0,
    fontFamily: "Helvetica",
    fontSize: 11,
    color: "#1a1a1a",
    lineHeight: 1.5,
  },
  // ── Top accent bar ─────────────────────────────────────────────────────
  topBar: {
    height: 6,
    backgroundColor: ACCENT,
    marginBottom: 0,
  },
  // ── Institution header row ─────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 64,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    marginBottom: 28,
  },
  headerLogo: {
    width: 110,
    height: 48,
    objectFit: "contain",
    marginRight: 20,
  },
  headerDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#d0d0d0",
    marginRight: 20,
  },
  headerTextBlock: {
    flex: 1,
  },
  institution: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: ACCENT,
    marginBottom: 3,
    letterSpacing: 0.3,
  },
  subInstitution: {
    fontSize: 9,
    color: "#555",
    letterSpacing: 0.2,
  },
  // ── Page body ──────────────────────────────────────────────────────────
  body: {
    paddingHorizontal: 64,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#d0d0d0",
    marginBottom: 24,
  },
  // ── Title block ────────────────────────────────────────────────────────
  titleWrapper: {
    alignItems: "center",
    marginBottom: 28,
  },
  titleBar: {
    width: 40,
    height: 3,
    backgroundColor: ACCENT,
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    color: ACCENT,
    marginBottom: 5,
    letterSpacing: 1.2,
  },
  annee: {
    fontSize: 11,
    textAlign: "center",
    color: "#555",
  },
  // ── Content ────────────────────────────────────────────────────────────
  intro: {
    marginBottom: 16,
    fontSize: 11,
  },
  infoBlock: {
    paddingLeft: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: ACCENT,
    backgroundColor: "#f7f9fc",
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 5,
  },
  infoLabel: {
    width: 140,
    fontFamily: "Helvetica-Bold",
    color: "#333",
    fontSize: 10,
  },
  infoValue: {
    flex: 1,
    fontSize: 10,
    color: "#1a1a1a",
  },
  bodyText: {
    marginBottom: 16,
    fontSize: 11,
  },
  closingText: {
    marginTop: 8,
    marginBottom: 20,
    color: "#333",
    fontSize: 11,
  },
  footerDate: {
    fontSize: 9,
    color: "#666",
    textAlign: "right",
    marginBottom: 14,
  },
  // ── Signatures section ────────────────────────────────────────────────
  sigDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#d0d0d0",
    marginBottom: 12,
  },
  sigSectionLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: ACCENT,
    letterSpacing: 1.2,
    marginBottom: 12,
    textAlign: "center",
  },
  signaturesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sigBlock: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 4,
  },
  sigRole: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: ACCENT,
    textAlign: "center",
    marginBottom: 2,
  },
  sigName: {
    fontSize: 7,
    textAlign: "center",
    color: "#333",
    marginBottom: 1,
  },
  sigDate: {
    fontSize: 6,
    textAlign: "center",
    color: "#999",
    marginBottom: 6,
  },
  sigImage: {
    width: 90,
    height: 38,
    objectFit: "contain",
    marginBottom: 2,
  },
  sigLine: {
    width: 90,
    height: 38,
    borderBottomWidth: 1,
    borderBottomColor: "#bbb",
    marginBottom: 2,
  },
})

// ── PDF document ───────────────────────────────────────────────────────────

function AttestationDoc(data: AttestationData) {
  const logo = logoSrc()

  return (
    <Document
      title={`Attestation de réinscription — ${data.prenom} ${data.nom}`}
      author="Université Ibn Tofail — Centre des Études Doctorales"
      subject={`Réinscription en doctorat ${data.anneeUniversitaire}`}
    >
      <Page size="A4" style={styles.page}>

        {/* Top accent bar */}
        <View style={styles.topBar} />

        {/* Institution header: logo | divider | name + sub */}
        <View style={styles.header}>
          <Image src={logo} style={styles.headerLogo} />
          <View style={styles.headerDivider} />
          <View style={styles.headerTextBlock}>
            <Text style={styles.institution}>UNIVERSITÉ IBN TOFAIL — KÉNITRA</Text>
            <Text style={styles.subInstitution}>Centre des Études Doctorales</Text>
          </View>
        </View>

        {/* Body content */}
        <View style={styles.body}>

          {/* Title */}
          <View style={styles.titleWrapper}>
            <View style={styles.titleBar} />
            <Text style={styles.title}>ATTESTATION DE RÉINSCRIPTION</Text>
            <Text style={styles.annee}>
              Année universitaire {data.anneeUniversitaire}
            </Text>
          </View>

          <View style={styles.divider} />

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

          <Text style={styles.bodyText}>
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

          <Text style={styles.footerDate}>
            Fait à Kénitra, le {data.dateGeneration}
          </Text>

          {/* Validator signatures */}
          {data.validators.length > 0 && (
            <>
              <View style={styles.sigDivider} />
              <Text style={styles.sigSectionLabel}>
                SIGNATURES DES VALIDEURS
              </Text>
              <View style={styles.signaturesRow}>
                {data.validators.map((v, i) => (
                  <View key={i} style={styles.sigBlock}>
                    <Text style={styles.sigRole}>{v.roleLabel}</Text>
                    <Text style={styles.sigName}>
                      {v.prenom} {v.nom}
                    </Text>
                    <Text style={styles.sigDate}>{v.date}</Text>
                    {v.signature ? (
                      <Image
                        src={sigSrc(v.signature)}
                        style={styles.sigImage}
                      />
                    ) : (
                      <View style={styles.sigLine} />
                    )}
                  </View>
                ))}
              </View>
            </>
          )}

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
