"use client"

/**
 * Invoice PDF generation (Reztek Healthcare Practice letterhead).
 * Used when the user clicks "Download PDF" on the invoice detail page:
 * Dashboard → Billing → [invoice row] → View & Download PDF → Download PDF button.
 * PDFs are generated in the browser and downloaded; they are not stored in Firestore.
 */

import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import type { Invoice } from "./types"
import type { Patient } from "./types"
import { format } from "date-fns"
import { getLetterheadBackgroundBase64 } from "./consultation-summary-pdf"

// Reztek Healthcare Practice letterhead (neutral/mock practice details)
const LETTERHEAD = {
  doctorName: "Reztek Healthcare Practice",
  qualifications: "Comprehensive Primary Care Services",
  practiceNumber: "Pr. No. 0000000",
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

export async function generateInvoicePdf(
  invoice: Invoice,
  patient: Patient | null,
  _options?: { practiceName?: string }
): Promise<void> {
  const doc = new jsPDF("p", "mm", "a4")
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14
  let y: number

  const letterheadBase64 = await getLetterheadBackgroundBase64()
  if (letterheadBase64) {
    const pageHeight = doc.internal.pageSize.getHeight()
    doc.addImage(letterheadBase64, "PNG", 0, 0, pageWidth, pageHeight, undefined, "FAST", 0)
    y = 78 + 10
  } else {
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.4)
    doc.rect(margin, 10, pageWidth - margin * 2, 62)
    doc.rect(margin + 2, 12, pageWidth - margin * 2 - 4, 58)
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text(LETTERHEAD.doctorName, pageWidth / 2, 22, { align: "center" })
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
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

  doc.setFontSize(10)
  doc.setTextColor(80, 80, 80)
  doc.text("INVOICE", margin, y)
  y += 7

  doc.setTextColor(0, 0, 0)
  doc.setFontSize(11)
  doc.text(`Invoice No: ${String(invoice.id).toUpperCase()}`, margin, y)
  y += 6
  doc.text(`Date: ${format(new Date(invoice.createdAt), "dd/MM/yyyy")}`, margin, y)
  doc.text(`Due: ${format(new Date(invoice.dueDate), "dd/MM/yyyy")}`, margin, y + 5)
  y += 12

  doc.setFontSize(11)
  doc.text("Bill To", margin, y)
  y += 6
  doc.setFontSize(10)
  doc.text(patient?.name ?? "Patient", margin, y)
  y += 5
  doc.text(`ID: ${(patient?.patientNumber || patient?.idNumber || patient?.id) ?? "N/A"}`, margin, y)
  y += 5
  if (patient?.phone) {
    doc.text(`Phone: ${patient.phone}`, margin, y)
    y += 5
  }
  if (patient?.email) {
    doc.text(`Email: ${patient?.email}`, margin, y)
    y += 5
  }
  y += 8

  const tableData = invoice.items.map((item) => [
    item.description,
    String(item.quantity),
    `R ${item.unitPrice.toLocaleString()}`,
    `R ${item.total.toLocaleString()}`,
  ])

  autoTable(doc, {
    startY: y,
    head: [["Description", "Qty", "Unit Price", "Total"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [40, 40, 40], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    margin: { left: margin },
  })

  const finalY = (doc as any).lastAutoTable?.finalY ?? y + 20
  y = finalY + 10

  // Ensure totals never run off the bottom of the page
  if (y > pageHeight - 30) {
    doc.addPage()
    y = margin
  }

  doc.setFontSize(10)
  doc.text(`Subtotal: R ${invoice.subtotal.toLocaleString()}`, margin, y)
  y += 6
  if (invoice.discount > 0) {
    doc.text(`Discount: -R ${invoice.discount.toLocaleString()}`, margin, y)
    y += 6
  }
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text(`Total Due: R ${invoice.total.toLocaleString()}`, margin, y + 2)
  doc.setFont("helvetica", "normal")
  // Add page numbers ("Page X of Y") on every page
  const pageCount = doc.getNumberOfPages()
  doc.setFontSize(9)
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i)
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: "right" })
  }

  doc.save(`invoice-${String(invoice.id).toUpperCase()}.pdf`)
}
