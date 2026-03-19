/**
 * Server-side PDF generation for /get-quote (Node runtime).
 */

import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

import {
  ABOUT_REZTEK,
  CONTACT_DETAILS,
  DATA_SECURITY_NOTICE,
  INCLUDED_FEATURES,
  OUTCOME_BENEFITS,
  QUOTE_PRICING,
  type DoctorLeadStored,
} from "@/lib/get-quote"

async function getReztekLogoBase64(): Promise<string | null> {
  try {
    const fs = await import("fs")
    const path = await import("path")
    const logoPath = path.join(process.cwd(), "public", "reztek-logo.png")
    if (fs.existsSync(logoPath)) {
      const imageBuffer = fs.readFileSync(logoPath)
      return `data:image/png;base64,${imageBuffer.toString("base64")}`
    }
    return null
  } catch (e) {
    console.error("[get-quote-pdf] Failed to load Reztek logo:", e)
    return null
  }
}

export async function getQuotePdfBuffer(lead: DoctorLeadStored): Promise<ArrayBuffer> {
  const doc = new jsPDF("p", "mm", "a4")
  const margin = 14
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // Reztek-branded header with logo
  let y = 20
  const logoBase64 = await getReztekLogoBase64()
  if (logoBase64) {
    const logoWidth = 50
    const logoHeight = 20
    const logoX = (pageWidth - logoWidth) / 2
    doc.addImage(logoBase64, "PNG", logoX, 10, logoWidth, logoHeight, undefined, "FAST", 0)
    y = 38
  }

  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.text("Reztek Healthcare Practice", pageWidth / 2, y, { align: "center" })
  y += 6
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text("Healthcare Software Solutions • Premium SaaS Platform", pageWidth / 2, y, { align: "center" })
  y += 10
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.2)
  doc.line(margin, y, pageWidth - margin, y)
  y += 10

  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.text("QUOTE SUMMARY", margin, y)
  y += 8

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(80, 80, 80)
  doc.text(`Generated: ${new Date().toLocaleDateString("en-ZA")}`, margin, y)
  doc.setTextColor(0, 0, 0)
  y += 8

  // Lead summary
  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
    margin: { left: margin, right: margin },
    head: [["Doctor / Practice details", "Value"]],
    body: [
      ["Full Name", lead.name],
      ["Email", lead.email],
      ["Phone", lead.phone],
      ["Practice Name", lead.practiceName],
      ["Location (City)", lead.location || "—"],
      ["Country", lead.practiceCountry || "—"],
      ["Province / Region", lead.practiceProvince || "—"],
      ["Practice Type", lead.practiceType],
      ["Specialization", lead.specialization],
      ["Number of Healthcare professionals", String(lead.doctors ?? 0)],
      ["Number of Staff", String(lead.staff ?? 0)],
      ["Average Patients Per Day", String(lead.patientsPerDay ?? 0)],
      ["Average consultation time (minutes)", String(lead.averageConsultationMinutes ?? 20)],
      ["Years in Operation", String(lead.yearsInOperation ?? 0)],
      ["Uses a digital system?", String(lead.hasSystem ?? "No")],
      ["Current system", lead.currentSystem || "—"],
    ],
  })

  y = ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y + 60) + 8

  // Quote box – dynamic based on lead
  const doctorsCount = Number.isFinite(Number(lead.doctors)) ? Number(lead.doctors) : 0
  const patientsCount = Number.isFinite(Number(lead.patientsPerDay)) ? Number(lead.patientsPerDay) : 0
  const doctorsSurcharge = doctorsCount >= 2 ? 350 : 0
  const highPatientSurcharge = patientsCount > 500 ? 350 : 0
  const monthlyTotal = QUOTE_PRICING.monthlyCostZar + doctorsSurcharge + highPatientSurcharge

  const monthly = `R ${monthlyTotal.toLocaleString("en-ZA")} / month`
  const setup = `R ${QUOTE_PRICING.setupFeeZar.toLocaleString("en-ZA")} (once-off)`
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.text("QUOTE", margin, y)
  y += 6
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.text(`Monthly Cost: ${monthly}`, margin, y)
  y += 5
  doc.text(
    `Includes base package (R ${QUOTE_PRICING.monthlyCostZar.toLocaleString(
      "en-ZA",
    )}), healthcare professionals (R ${doctorsSurcharge.toLocaleString(
      "en-ZA",
    )}), and high patient volume adjustment (R ${highPatientSurcharge.toLocaleString("en-ZA")}).`,
    margin,
    y,
  )
  y += 8
  doc.text(`Initial System Setup & Customization Fee: ${setup}`, margin, y)
  y += 8

  if (lead.aiSummary) {
    doc.setFont("helvetica", "bold")
    doc.text("Practice summary", margin, y)
    y += 5
    doc.setFont("helvetica", "normal")
    const lines = doc.splitTextToSize(lead.aiSummary, pageWidth - margin * 2)
    doc.text(lines, margin, y)
    y += lines.length * 5 + 6
  }

  // Included features
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.text("INCLUDED FEATURES", margin, y)
  y += 4
  autoTable(doc, {
    startY: y,
    theme: "striped",
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
    margin: { left: margin, right: margin },
    head: [["Included (no individual prices)"]],
    body: INCLUDED_FEATURES.map((f) => [f]),
  })
  y = ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y + 60) + 8

  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.text("KEY OUTCOMES", margin, y)
  y += 4
  autoTable(doc, {
    startY: y,
    theme: "striped",
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
    margin: { left: margin, right: margin },
    head: [["Outcome benefits"]],
    body: OUTCOME_BENEFITS.map((b) => [b]),
  })
  y = ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y + 60) + 8

  // Long blocks at end: security + about + contact; add pages as needed
  const ensureSpace = (neededMm: number) => {
    const bottom = pageHeight - 14
    if (y + neededMm > bottom) {
      doc.addPage()
      y = 20
    }
  }

  ensureSpace(28)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.text("DATA SECURITY", margin, y)
  y += 6
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  const secLines = doc.splitTextToSize(DATA_SECURITY_NOTICE, pageWidth - margin * 2)
  doc.text(secLines, margin, y)
  y += secLines.length * 5 + 6

  ensureSpace(28)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.text("ABOUT US", margin, y)
  y += 6
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  const aboutLines = doc.splitTextToSize(ABOUT_REZTEK, pageWidth - margin * 2)
  doc.text(aboutLines, margin, y)
  y += aboutLines.length * 5 + 6

  ensureSpace(22)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.text("CONTACT", margin, y)
  y += 6
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.text(`Email: ${CONTACT_DETAILS.email}`, margin, y)
  y += 5
  doc.text(`Phone: ${CONTACT_DETAILS.phone}`, margin, y)
  y += 5
  doc.text(`Alternate Phone: ${CONTACT_DETAILS.altPhone}`, margin, y)

  // Page numbers
  const pageCount = doc.getNumberOfPages()
  doc.setFontSize(9)
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i)
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: "right" })
  }

  return doc.output("arraybuffer") as ArrayBuffer
}

