import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer"

// @react-pdf/renderer v4 requires SourceDataBuffer { data: Buffer, format } for
// embedded images — raw data URL strings are unreliable in server-side rendering.
function sigSrc(dataUrl: string): { data: Buffer; format: "png" } {
  const comma = dataUrl.indexOf(",")
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
  return { data: Buffer.from(base64, "base64"), format: "png" }
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
    marginBottom: 20,
    color: "#333",
  },
  footerDate: {
    fontSize: 9,
    color: "#666",
    textAlign: "right",
    marginBottom: 14,
  },
  // ── Signatures section ────────────────────────────────────────────────────
  sigDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#d0d0d0",
    marginBottom: 10,
  },
  sigSectionLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#aaa",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  signaturesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sigBlock: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 3,
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

        <Text style={styles.footerDate}>
          Fait à Kénitra, le {data.dateGeneration}
        </Text>

        {/* Signatures of all validators */}
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
