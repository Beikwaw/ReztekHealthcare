/**
 * Server-side medical aid outcome receipt/statement PDF (Node runtime).
 * Used for emailing patients after outcomes are recorded.
 */

import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { getLetterheadBackgroundBase64 } from "./consultation-summary-pdf"

type PatientLike = {
  id?: string
  name?: string
  patientNumber?: string
  idNumber?: string
  phone?: string
  email?: string
}

type ClaimLike = {
  id?: string
  schemeName?: string
  membershipNumber?: string
  billAmount?: number
  totalAmountClaimed?: number
  consultationDate?: unknown
}

export type MedicalAidOutcomeLike = {
  type: "PAID" | "PARTIALLY_PAID" | "REJECTED"
  billedAmount: number
  paidAmount: number
  shortfallAmount: number
  outcomeDate: Date
}

function toDate(value: unknown): Date {
  if (!value) return new Date()
  if (value instanceof Date) return value
  if (typeof (value as { toDate?: () => Date })?.toDate === "function") return (value as { toDate: () => Date }).toDate()
  return new Date(value as string | number)
}

export async function getMedicalAidReceiptPdfBuffer(args: {
  patient: PatientLike | null
  claim: ClaimLike
  outcome: MedicalAidOutcomeLike
}): Promise<ArrayBuffer> {
  const { patient, claim, outcome } = args
  const doc = new jsPDF("p", "mm", "a4")
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14

  let y = 10

  const letterheadBase64 = await getLetterheadBackgroundBase64()
  if (letterheadBase64) {
    doc.addImage(letterheadBase64, "PNG", 0, 0, pageWidth, pageHeight, undefined, "FAST", 0)
    y = 88
  } else {
    y = 18
  }

  const consultationDate = toDate(claim.consultationDate)
  const billed = Number.isFinite(outcome.billedAmount) ? outcome.billedAmount : Number(claim.billAmount ?? claim.totalAmountClaimed ?? 0)
  const paid = Number.isFinite(outcome.paidAmount) ? outcome.paidAmount : 0
  const shortfall = Number.isFinite(outcome.shortfallAmount) ? outcome.shortfallAmount : Math.max(0, billed - paid)

  doc.setFontSize(12)
  doc.setTextColor(0, 0, 0)
  doc.setFont("helvetica", "bold")
  doc.text("MEDICAL AID OUTCOME STATEMENT", margin, y)
  y += 8

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.text(`Claim ID: ${String(claim.id ?? "").toUpperCase()}`, margin, y)
  y += 5
  doc.text(`Outcome: ${outcome.type}`, margin, y)
  y += 5
  doc.text(`Outcome date: ${outcome.outcomeDate.toLocaleDateString("en-ZA")}`, margin, y)
  y += 5
  doc.text(`Consultation date: ${consultationDate.toLocaleDateString("en-ZA")}`, margin, y)
  y += 10

  doc.setFont("helvetica", "bold")
  doc.text("Patient", margin, y)
  y += 6
  doc.setFont("helvetica", "normal")
  doc.text(patient?.name ?? "Patient", margin, y)
  y += 5
  doc.text(`ID: ${(patient?.patientNumber || patient?.idNumber || patient?.id) ?? "N/A"}`, margin, y)
  y += 5
  if (patient?.email) {
    doc.text(`Email: ${patient.email}`, margin, y)
    y += 5
  }
  y += 6

  const scheme = String(claim.schemeName ?? "—")
  const member = String(claim.membershipNumber ?? "—")
  autoTable(doc, {
    startY: y,
    head: [["Scheme", "Membership number"]],
    body: [[scheme, member]],
    theme: "striped",
    headStyles: { fillColor: [40, 40, 40], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    margin: { left: margin, right: margin },
  })

  const finalY = (doc as any).lastAutoTable?.finalY ?? y + 18
  y = finalY + 10

  autoTable(doc, {
    startY: y,
    head: [["Billed amount", "Paid amount", "Shortfall"]],
    body: [[`R ${billed.toLocaleString()}`, `R ${paid.toLocaleString()}`, `R ${shortfall.toLocaleString()}`]],
    theme: "striped",
    headStyles: { fillColor: [40, 40, 40], fontSize: 9 },
    bodyStyles: { fontSize: 10 },
    margin: { left: margin, right: margin },
  })

  // Page numbers
  const pageCount = doc.getNumberOfPages()
  doc.setFontSize(9)
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i)
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: "right" })
  }

  return doc.output("arraybuffer") as ArrayBuffer
}

