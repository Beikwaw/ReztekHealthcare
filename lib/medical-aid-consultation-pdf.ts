import { jsPDF } from "jspdf"
import { getLetterheadBackgroundBase64 } from "./consultation-summary-pdf"
import type {
  MedicalAidClaim,
  MedicalAidClaimDiagnosisLine,
  MedicalAidClaimMaterials,
  MedicalAidClaimMedication,
} from "./types"

export interface MedicalAidConsultationPdfPayload {
  // Main member / scheme
  mainMemberFullName: string
  mainMemberSurname: string
  mainMemberSex?: string
  mainMemberIdNumber?: string
  mainMemberTel?: string
  mainMemberAddress?: string
  mainMemberEmail?: string
  schemeName: string
  membershipNumber: string

  // Patient
  patientFullName: string
  patientDateOfBirth?: Date
  patientSex?: string

  // Consultation
  consultationDate: Date

  // Diagnosis rows (1–4) + chronic codes
  diagnoses: MedicalAidClaimDiagnosisLine[]

  // Text blocks
  injectionsText?: string
  proceduresText?: string

  // Materials section
  materials: MedicalAidClaimMaterials

  // Medication table
  medications: MedicalAidClaimMedication[]
}

function toDate(value: Date | string | number | undefined): Date {
  if (!value) return new Date()
  if (value instanceof Date) return value
  // Firestore Timestamp has toDate()
  const v = value as { toDate?: () => Date }
  if (typeof v?.toDate === "function") return v.toDate()
  const d = new Date(value as string | number)
  return Number.isNaN(d.getTime()) ? new Date() : d
}

function formatDob(value: Date | string | number | undefined): string {
  if (!value) return ""
  const d = toDate(value)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString("en-ZA", { year: "numeric", month: "2-digit", day: "2-digit" })
}

function safeText(value: string | undefined | null, fallback = ""): string {
  return (value ?? "").toString().trim() || fallback
}

function capFirst(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

const LABEL_FONT = "helvetica"
const LABEL_SIZE = 9
const VALUE_SIZE = 10
const LINE_HEIGHT = 5

function addParagraph(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
): number {
  doc.setFont(LABEL_FONT, "normal")
  doc.setFontSize(LABEL_SIZE)
  doc.text(`${label} ${value || "—"}`, x, y)
  return y + LINE_HEIGHT
}

export async function buildMedicalAidConsultationPdf(
  payload: MedicalAidConsultationPdfPayload,
): Promise<jsPDF> {
  const doc = new jsPDF("p", "mm", "a4")
  const margin = 14
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const letterheadBase64 = await getLetterheadBackgroundBase64()
  let y: number
  if (letterheadBase64) {
    doc.addImage(letterheadBase64, "PNG", 0, 0, pageWidth, pageHeight, undefined, "FAST", 0)
    y = 88
  } else {
    // Fallback: simple header line when letterhead is not available
    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.text("REZTEK HEALTHCARE PRACTICE – MEDICAL AID CONSULTATION", pageWidth / 2, 20, {
      align: "center",
    })
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.2)
    doc.line(margin, 26, pageWidth - margin, 26)
    y = 32
  }

  // ----- Main member (structured paragraphs, no boxes) -----
  doc.setFont(LABEL_FONT, "normal")
  doc.setFontSize(LABEL_SIZE)
  y = addParagraph(doc, "Main Members Surname:", safeText(payload.mainMemberSurname), margin, y)
  y = addParagraph(doc, "Sex:", capFirst(safeText(payload.mainMemberSex)), margin, y)
  y = addParagraph(doc, "Full Main Members Name:", safeText(payload.mainMemberFullName), margin, y)
  y = addParagraph(doc, "ID No:", safeText(payload.mainMemberIdNumber), margin, y)
  y = addParagraph(doc, "Tel:", safeText(payload.mainMemberTel), margin, y)
  y = addParagraph(doc, "Address:", safeText(payload.mainMemberAddress), margin, y)
  y = addParagraph(doc, "E-mail Address:", safeText(payload.mainMemberEmail), margin, y)
  y = addParagraph(doc, "Medical Aid:", safeText(payload.schemeName), margin, y)
  y = addParagraph(doc, "Membership No:", safeText(payload.membershipNumber), margin, y)
  y += LINE_HEIGHT * 0.5

  // ----- Patient details -----
  doc.setFont(LABEL_FONT, "bold")
  doc.setFontSize(10)
  doc.text("Patient", margin, y)
  y += LINE_HEIGHT

  doc.setFont(LABEL_FONT, "normal")
  doc.setFontSize(LABEL_SIZE)
  y = addParagraph(doc, "Patient's Name:", safeText(payload.patientFullName), margin, y)
  y = addParagraph(doc, "Dep No:", "", margin, y)
  const dobStr = formatDob(payload.patientDateOfBirth)
  y = addParagraph(doc, "Patient D.O.B:", dobStr, margin, y)
  y = addParagraph(doc, "Sex:", capFirst(safeText(payload.patientSex)), margin, y)
  y += LINE_HEIGHT * 0.5

  // ----- Consultation date + Chronic code -----
  doc.setFont(LABEL_FONT, "bold")
  doc.setFontSize(10)
  const consultDate = toDate(payload.consultationDate)
  const consultDateStr = Number.isNaN(consultDate.getTime())
    ? ""
    : consultDate.toLocaleDateString("en-ZA", { year: "numeric", month: "2-digit", day: "2-digit" })
  const chronicCode =
    payload.diagnoses.find((d) => d.icd10?.trim())?.icd10?.trim() ??
    payload.diagnoses[0]?.icd10?.trim() ??
    ""
  doc.text(`Consultation Date: ${consultDateStr}`, margin, y)
  doc.text(`Chronic Code: ${chronicCode}`, margin + 90, y)
  y += LINE_HEIGHT * 1.2

  // ----- Diagnosis Chronic Code (paragraph form, numbered 1–4) -----
  doc.setFont(LABEL_FONT, "bold")
  doc.setFontSize(10)
  doc.text("Diagnosis Chronic Code:", margin, y)
  y += LINE_HEIGHT

  doc.setFont(LABEL_FONT, "normal")
  doc.setFontSize(VALUE_SIZE)
  const maxDiag = 4
  for (let i = 0; i < maxDiag; i++) {
    const d = payload.diagnoses[i]
    const line = d?.line?.trim() ?? ""
    const code = d?.icd10?.trim() ?? ""
    const combined = line && code ? `${line} (${code})` : line || code || ""
    if (combined) {
      const lines = doc.splitTextToSize(`${i + 1}. ${combined}`, pageWidth - margin * 2 - 8)
      doc.text(lines, margin, y)
      y += lines.length * (LINE_HEIGHT - 0.5)
    } else {
      doc.text(`${i + 1}.`, margin, y)
      y += LINE_HEIGHT - 0.5
    }
  }
  y += LINE_HEIGHT * 0.8

  // ----- Injections (paragraph) -----
  doc.setFont(LABEL_FONT, "bold")
  doc.setFontSize(10)
  doc.text("Injections:", margin, y)
  y += LINE_HEIGHT
  doc.setFont(LABEL_FONT, "normal")
  doc.setFontSize(VALUE_SIZE)
  const injText = safeText(payload.injectionsText)
  if (injText) {
    const lines = doc.splitTextToSize(injText, pageWidth - margin * 2)
    doc.text(lines, margin, y)
    y += lines.length * (LINE_HEIGHT - 0.5)
  }
  y += LINE_HEIGHT * 0.8

  // ----- Materials (label: value paragraphs, no boxes) -----
  doc.setFont(LABEL_FONT, "bold")
  doc.setFontSize(10)
  doc.text("Materials:", margin, y)
  y += LINE_HEIGHT
  doc.setFont(LABEL_FONT, "normal")
  doc.setFontSize(LABEL_SIZE)
  const mat = payload.materials ?? {}
  y = addParagraph(doc, "Syringe & Needle:", safeText(mat.syringeNeedle), margin, y)
  y = addParagraph(doc, "Swab:", safeText(mat.swab), margin, y)
  y = addParagraph(doc, "Glove:", safeText(mat.glove), margin, y)
  y = addParagraph(doc, "Bandage:", safeText(mat.bandage), margin, y)
  y = addParagraph(doc, "Other:", safeText(mat.other), margin, y)
  y += LINE_HEIGHT * 0.5

  // ----- Procedures (paragraph) -----
  doc.setFont(LABEL_FONT, "bold")
  doc.setFontSize(10)
  doc.text("Procedures:", margin, y)
  y += LINE_HEIGHT
  doc.setFont(LABEL_FONT, "normal")
  doc.setFontSize(VALUE_SIZE)
  const procText = safeText(payload.proceduresText)
  if (procText) {
    const lines = doc.splitTextToSize(procText, pageWidth - margin * 2)
    doc.text(lines, margin, y)
    y += lines.length * (LINE_HEIGHT - 0.5)
  }
  y += LINE_HEIGHT * 0.8

  // ----- Medicine Description (paragraph list) -----
  if (y > pageHeight - 50) {
    doc.addPage()
    y = margin
  }
  doc.setFont(LABEL_FONT, "bold")
  doc.setFontSize(10)
  doc.text("Medicine Description:", margin, y)
  y += LINE_HEIGHT
  doc.setFont(LABEL_FONT, "normal")
  doc.setFontSize(VALUE_SIZE)
  const meds = payload.medications ?? []
  if (meds.length > 0) {
    for (const med of meds) {
      const parts: string[] = []
      if (med.name) parts.push(med.name)
      if (med.quantity) parts.push(`Qty: ${med.quantity}`)
      if (med.duration) parts.push(`Duration: ${med.duration}`)
      if (med.dosage) parts.push(med.dosage)
      if (med.instructions) parts.push(med.instructions)
      const line = parts.join(" – ")
      if (line) {
        const lines = doc.splitTextToSize(line, pageWidth - margin * 2)
        doc.text(lines, margin, y)
        y += lines.length * (LINE_HEIGHT - 0.5)
      }
    }
  } else {
    doc.text("—", margin, y)
    y += LINE_HEIGHT - 0.5
  }

  return doc
}

export async function getMedicalAidConsultationPdfBuffer(
  payload: MedicalAidConsultationPdfPayload,
): Promise<ArrayBuffer> {
  const doc = await buildMedicalAidConsultationPdf(payload)
  return doc.output("arraybuffer") as ArrayBuffer
}

export function claimToConsultationPdfPayload(claim: MedicalAidClaim): MedicalAidConsultationPdfPayload {
  const patientName =
    claim.patientName || `${claim.firstName ?? ""} ${claim.lastName ?? ""}`.trim() || "Patient"
  const mainMemberFull =
    claim.mainMemberFullName ||
    claim.patientName ||
    `${claim.firstName ?? ""} ${claim.lastName ?? ""}`.trim() ||
    "Main member"

  const diagnoses: MedicalAidClaimDiagnosisLine[] =
    (claim.diagnosisLines && claim.diagnosisLines.length > 0
      ? claim.diagnosisLines
      : [
          {
            line: claim.clinicalSummaryShort || "",
            icd10: claim.icd10Code || undefined,
          },
        ]).slice(0, 4)

  const materials: MedicalAidClaimMaterials = claim.materials ?? {}
  const medications: MedicalAidClaimMedication[] = Array.isArray(claim.medications)
    ? claim.medications
    : []

  return {
    mainMemberFullName: mainMemberFull,
    mainMemberSurname: claim.mainMemberSurname || claim.lastName || "",
    mainMemberSex: claim.mainMemberSex,
    mainMemberIdNumber: claim.mainMemberIdNumber || claim.idNumber,
    mainMemberTel: claim.mainMemberTel,
    mainMemberAddress: claim.mainMemberAddress,
    mainMemberEmail: claim.mainMemberEmail || claim.patientEmail || undefined,
    schemeName: claim.schemeName,
    membershipNumber: claim.membershipNumber,

    patientFullName: patientName,
    patientDateOfBirth: claim.patientDateOfBirth,
    patientSex: claim.patientSex,

    consultationDate: claim.consultationDate,

    diagnoses,
    injectionsText: claim.injectionsText || undefined,
    proceduresText: claim.proceduresText || undefined,
    materials,
    medications,
  }
}

