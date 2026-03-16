/**
 * Medical Aid Claim PDF – Section 2 structure, SA medical aid compliant.
 * Uses same letterhead/layout as consultation summary PDF for consistency.
 */

import { jsPDF } from "jspdf"
import { getLetterheadBackgroundBase64 } from "./consultation-summary-pdf"
import type { MedicalAidClaim } from "./types"

const PRACTICE_NUMBER = "0000000"
const PRACTICE_NUMBER_DISPLAY = "Pr. No. 0000000"
const DOCTOR_HPCSA = "Treating Practitioner"
const CONSULTATION_TYPE = "GP Outpatient Consultation"

const LETTERHEAD = {
  doctorName: "Reztek Healthcare Practice",
  qualifications: "Comprehensive Primary Care Services",
  practiceNumber: PRACTICE_NUMBER_DISPLAY,
  surgery: {
    label: "CLINIC",
    address: "123 Reztek Medical Centre",
    location: "Central District",
    city: "Johannesburg 2000",
    telFax: "Tel/Fax 010 000 0000",
  },
  main: {
    shop: "Reztek Healthcare Practice",
    address: "456 Health Avenue",
    city: "Johannesburg 2000",
    tel1: "Tel: 010 000 0001",
    tel2: "010 000 0002",
  },
  postal: {
    label: "POSTAL",
    poBox: "P.O. Box 1000",
    city: "Johannesburg 2000",
  },
  email: "E-mail: info@reztekhealth.example.com",
}

export interface MedicalAidClaimPdfPayload {
  practiceNumber: string
  doctorHpcsaNumber: string
  firstName: string
  lastName: string
  idNumber?: string
  schemeName: string
  membershipNumber: string
  consultationDate: Date
  billAmount: number
  icd10Code: string
  clinicalSummaryShort: string
  servicesRendered: string
  totalAmountClaimed: number
}

function toDateStr(d: Date): string {
  const date = d instanceof Date ? d : new Date(d)
  return date.toLocaleDateString("en-ZA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function toTimeStamp(d: Date): string {
  const date = d instanceof Date ? d : new Date(d)
  return date.toLocaleString("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

/**
 * Build Medical Aid Claim PDF (Section 2 structure). Uses same letterhead as consultation summary.
 * Returns jsPDF instance.
 */
export async function buildMedicalAidClaimPdf(payload: MedicalAidClaimPdfPayload): Promise<jsPDF> {
  const doc = new jsPDF("p", "mm", "a4")
  const margin = 14
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const letterheadBase64 = await getLetterheadBackgroundBase64()
  let y: number
  if (letterheadBase64) {
    doc.addImage(letterheadBase64, "PNG", 0, 0, pageWidth, pageHeight, undefined, "FAST", 0)
    y = 78 + 10
  } else {
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.5)
    const boxTop = 10
    const boxHeight = 62
    const boxWidth = pageWidth - margin * 2
    doc.rect(margin, boxTop, boxWidth, boxHeight)
    doc.rect(margin + 2, boxTop + 2, boxWidth - 4, boxHeight - 4)
    doc.setFontSize(18)
    doc.setFont("times", "bold")
    doc.text(LETTERHEAD.doctorName, pageWidth / 2, 22, { align: "center" })
    doc.setFontSize(10)
    doc.setFont("times", "normal")
    doc.text(LETTERHEAD.qualifications, pageWidth / 2, 28, { align: "center" })
    doc.text(LETTERHEAD.practiceNumber, pageWidth - margin, 28, { align: "right" })
    const col1 = margin + 5
    const col2 = pageWidth / 2 - 8
    const col3 = pageWidth - margin - 5
    let colY = 36
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.text(LETTERHEAD.surgery.label, col1, colY)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.text(LETTERHEAD.surgery.address, col1, colY + 5)
    doc.text(LETTERHEAD.surgery.location, col1, colY + 10)
    doc.text(LETTERHEAD.surgery.city, col1, colY + 15)
    doc.text(LETTERHEAD.surgery.telFax, col1, colY + 20)
    doc.setFont("helvetica", "bold")
    doc.text("MAIN PRACTICE", col2, colY)
    doc.setFont("helvetica", "normal")
    doc.text(LETTERHEAD.main.shop, col2, colY + 5)
    doc.text(LETTERHEAD.main.address, col2, colY + 10)
    doc.text(LETTERHEAD.main.city, col2, colY + 15)
    doc.text(LETTERHEAD.main.tel1, col2, colY + 20)
    doc.text(LETTERHEAD.main.tel2, col2, colY + 25)
    doc.setFont("helvetica", "bold")
    doc.text(LETTERHEAD.postal.label, col3, colY, { align: "right" })
    doc.setFont("helvetica", "normal")
    doc.text(LETTERHEAD.postal.poBox, col3, colY + 5, { align: "right" })
    doc.text(LETTERHEAD.postal.city, col3, colY + 10, { align: "right" })
    doc.text(LETTERHEAD.email, col3, colY + 20, { align: "right" })
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.2)
    doc.line(margin, 78, pageWidth - margin, 78)
    y = 78 + 10
  }

  // ----- Title -----
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.text("MEDICAL AID CLAIM", margin, y)
  y += 8

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.text(`Practice Number: ${payload.practiceNumber}`, margin, y)
  y += 5
  doc.text(`Doctor HPCSA Number: ${payload.doctorHpcsaNumber}`, margin, y)
  y += 7

  // ----- Patient & Scheme -----
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.text("Patient & Scheme Details", margin, y)
  y += 6
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.text(`Patient Name: ${payload.firstName} ${payload.lastName}`, margin, y)
  y += 5
  if (payload.idNumber) {
    doc.text(`ID Number: ${payload.idNumber}`, margin, y)
    y += 5
  }
  doc.text(`Medical Aid Scheme: ${payload.schemeName}`, margin, y)
  y += 5
  doc.text(`Membership Number: ${payload.membershipNumber}`, margin, y)
  y += 7

  // ----- Claim particulars -----
  doc.setFont("helvetica", "bold")
  doc.text("Claim Particulars", margin, y)
  y += 6
  doc.setFont("helvetica", "normal")
  doc.text(`Date of Service: ${toDateStr(payload.consultationDate)}`, margin, y)
  y += 5
  doc.text(`Bill Amount: R ${payload.billAmount.toFixed(2)}`, margin, y)
  y += 5
  doc.text(`ICD-10 Code: ${payload.icd10Code || "—"}`, margin, y)
  y += 10

  // ----- Medical Aid Claim Summary -----
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.text("Medical Aid Claim Summary", margin, y)
  y += 6
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)

  const summaryItems = [
    `1. Date of Service: ${toTimeStamp(payload.consultationDate)}`,
    `2. Practice Details: ${LETTERHEAD.doctorName}, ${LETTERHEAD.qualifications}. ${LETTERHEAD.surgery.address}, ${LETTERHEAD.surgery.city}. ${LETTERHEAD.main.shop}, ${LETTERHEAD.main.address}, ${LETTERHEAD.main.city}. ${LETTERHEAD.email}`,
    `3. Treating Practitioner HPCSA: ${DOCTOR_HPCSA}  ${PRACTICE_NUMBER_DISPLAY}`,
    `4. Consultation Type: ${CONSULTATION_TYPE}`,
    `5. ICD-10 Diagnosis Code: ${payload.icd10Code || "—"}`,
    `6. Clinical Summary (justification): ${payload.clinicalSummaryShort || "—"}`,
    `7. Services Rendered: ${payload.servicesRendered || CONSULTATION_TYPE}`,
    `8. Total Amount Claimed: R ${payload.totalAmountClaimed.toFixed(2)}`,
  ]

  const lineHeight = 5
  const bottomMargin = 20
  for (const line of summaryItems) {
    if (y > pageHeight - 25) {
      doc.addPage()
      y = 20
      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
    }
    const lines = doc.splitTextToSize(line, pageWidth - 2 * margin)
    let idx = 0
    while (idx < lines.length) {
      const remainingHeight = pageHeight - bottomMargin - y
      const linesThatFit = Math.max(1, Math.floor(remainingHeight / lineHeight))
      const chunk = lines.slice(idx, idx + linesThatFit)
      doc.text(chunk, margin, y)
      y += chunk.length * lineHeight + 2
      idx += chunk.length
      if (idx < lines.length) {
        doc.addPage()
        y = 20
        doc.setFont("helvetica", "normal")
        doc.setFontSize(10)
      }
    }
  }

  // Add page numbers
  const pageCount = doc.getNumberOfPages()
  doc.setFontSize(9)
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i)
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: "right" })
  }

  return doc
}

/**
 * Generate claim PDF as ArrayBuffer for server-side upload.
 */
export async function getMedicalAidClaimPdfBuffer(payload: MedicalAidClaimPdfPayload): Promise<ArrayBuffer> {
  const doc = await buildMedicalAidClaimPdf(payload)
  return doc.output("arraybuffer") as ArrayBuffer
}

/**
 * Build payload from MedicalAidClaim (e.g. for re-download).
 */
export function claimToPdfPayload(claim: MedicalAidClaim): MedicalAidClaimPdfPayload {
  return {
    practiceNumber: claim.practiceNumber,
    doctorHpcsaNumber: claim.doctorHpcsaNumber,
    firstName: claim.firstName,
    lastName: claim.lastName,
    idNumber: claim.idNumber,
    schemeName: claim.schemeName,
    membershipNumber: claim.membershipNumber,
    consultationDate: claim.consultationDate instanceof Date ? claim.consultationDate : new Date(claim.consultationDate),
    billAmount: claim.billAmount,
    icd10Code: claim.icd10Code,
    clinicalSummaryShort: claim.clinicalSummaryShort,
    servicesRendered: claim.servicesRendered,
    totalAmountClaimed: claim.totalAmountClaimed,
  }
}
