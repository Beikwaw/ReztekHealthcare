"use client"

import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { format } from "date-fns"

export type MedicalAidBillingReportRow = {
  claimId: string
  patientName: string
  schemeName?: string
  invoiceId?: string | null
  billedAmount: number
  paidAmount: number
  shortfallAmount: number
  status: string
  outcomeDate?: Date | null
}

export type MedicalAidBillingReportTotals = {
  totalBilled: number
  totalPaid: number
  totalPartiallyPaid: number
  totalRejected: number
  totalOutstandingShortfall: number
}

export async function generateMedicalAidBillingReportPdf(params: {
  rows: MedicalAidBillingReportRow[]
  totals: MedicalAidBillingReportTotals
  title?: string
  filtersDescription?: string
}) {
  const { rows, totals, title = "Medical Aid Claim Billing Report", filtersDescription } = params

  const doc = new jsPDF("p", "mm", "a4")
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14
  let y = margin

  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.text(title, pageWidth / 2, y, { align: "center" })
  y += 8

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  const todayStr = format(new Date(), "dd MMM yyyy HH:mm")
  doc.text(`Generated: ${todayStr}`, margin, y)
  y += 6

  if (filtersDescription && filtersDescription.trim().length > 0) {
    const split = doc.splitTextToSize(filtersDescription, pageWidth - margin * 2)
    doc.text(split, margin, y)
    y += split.length * 5 + 2
  }

  // Summary totals
  doc.setFont("helvetica", "bold")
  doc.text("Summary totals", margin, y)
  y += 6
  doc.setFont("helvetica", "normal")

  const summaryLines = [
    `Total billed to medical aid: R ${totals.totalBilled.toFixed(2)}`,
    `Total paid by medical aid: R ${totals.totalPaid.toFixed(2)}`,
    `Total partially paid: R ${totals.totalPartiallyPaid.toFixed(2)}`,
    `Total rejected: R ${totals.totalRejected.toFixed(2)}`,
    `Total outstanding shortfall: R ${totals.totalOutstandingShortfall.toFixed(2)}`,
  ]

  summaryLines.forEach((line) => {
    doc.text(line, margin, y)
    y += 5
  })

  y += 4

  // Table of rows
  const tableBody = rows.map((row) => [
    row.claimId,
    row.patientName,
    row.schemeName ?? "—",
    row.invoiceId ?? "—",
    row.billedAmount.toFixed(2),
    row.paidAmount.toFixed(2),
    row.shortfallAmount.toFixed(2),
    row.status,
    row.outcomeDate ? format(row.outcomeDate, "dd MMM yyyy") : "—",
  ])

  autoTable(doc, {
    startY: y,
    head: [
      [
        "Claim ID",
        "Patient",
        "Scheme",
        "Invoice",
        "Billed",
        "Paid",
        "Shortfall",
        "Status",
        "Outcome date",
      ],
    ],
    body: tableBody,
    theme: "striped",
    headStyles: { fillColor: [40, 40, 40], fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    margin: { left: margin, right: margin },
  })

  // Page numbers
  const pageCount = doc.getNumberOfPages()
  doc.setFontSize(9)
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i)
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: "right" })
  }

  doc.save(`medical-aid-billing-${format(new Date(), "yyyyMMdd-HHmm")}.pdf`)
}

