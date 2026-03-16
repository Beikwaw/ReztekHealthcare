import { NextRequest, NextResponse } from "next/server"
import { getFirebaseAdmin } from "@/lib/firebase-admin"
import { getInvoicePdfBuffer } from "@/lib/invoice-pdf-server"
import { getMedicalAidReceiptPdfBuffer } from "@/lib/medical-aid-receipt-pdf"

export const runtime = "nodejs"

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL =
  process.env.CONSULTATION_EMAIL_FROM || "Reztek Healthcare Practice <noreply@reztek-health.co.za>"

function getEmailLogoUrl(request: NextRequest): string {
  const envLogo = process.env.EMAIL_LOGO_URL
  if (envLogo && envLogo.trim()) return envLogo.trim()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  const path = "/reztek-logo.png"
  if (siteUrl && siteUrl.trim()) return `${siteUrl.replace(/\/+$/, "")}${path}`
  const host = request.headers.get("x-forwarded-host")
  const proto = request.headers.get("x-forwarded-proto") || "https"
  if (host) return `${proto}://${host}${path}`
  return `https://reztek-health.co.za${path}`
}

function parseBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization") || request.headers.get("Authorization")
  if (!header) return null
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

type OutcomeType = "PAID" | "PARTIALLY_PAID" | "REJECTED"

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n)
}

function formatCurrency(n: number): string {
  return `R ${Number(n || 0).toLocaleString()}`
}

function toSafeJsDate(value: unknown, fallback: Date = new Date()): Date {
  if (!value) return fallback
  if (value instanceof Date) return value
  // Firestore Timestamp (from Admin SDK or client SDK)
  if (typeof value === "object" && value !== null && "toDate" in value && typeof (value as { toDate: () => Date }).toDate === "function") {
    try {
      const d = (value as { toDate: () => Date }).toDate()
      if (d instanceof Date && !Number.isNaN(d.getTime())) return d
    } catch {
      // fall through to generic parsing
    }
  }
  const d = new Date(value as string)
  return Number.isNaN(d.getTime()) ? fallback : d
}

function buildBaseHeader(logoUrl: string): string {
  const practiceContacts = {
    name: "DR WC MKHONZA HEALTH PRACTICE",
    main: {
      address: "Shop 13 Collero Centre, 241 Utrecht Street, Vryheid 3100",
      tel1: "Tel: 034 980 2675",
      tel2: "034 980 1250",
    },
    email: "winston.mkhonza@gmail.com",
  }

  return `
    <div style="text-align:center; padding: 16px 0;">
      <img src="${logoUrl}" alt="Practice logo" style="max-height:80px; margin-bottom:8px;" />
      <div style="font-size:14px; color:#374151; font-weight:600;">${practiceContacts.name}</div>
      <div style="font-size:12px; color:#6B7280;">
        ${practiceContacts.main.address}<br/>
        ${practiceContacts.main.tel1} | ${practiceContacts.main.tel2}<br/>
        ${practiceContacts.email}
      </div>
    </div>
    <hr style="border:none; border-top:1px solid #E5E7EB; margin:16px 0;" />
  `
}

export async function POST(request: NextRequest) {
  try {
    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: "Email not configured. Add RESEND_API_KEY in environment variables." }, { status: 503 })
    }

    const token = parseBearerToken(request)
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = await getFirebaseAdmin()
    const decoded = await admin.auth().verifyIdToken(token)
    const uid = decoded.uid

    const db = admin.firestore()
    const userSnap = await db.collection("users").doc(uid).get()
    const role = userSnap.exists ? (userSnap.data()?.role as string | undefined) : undefined
    if (role !== "medical-aid") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const claimId = body?.claimId as string | undefined
    const type = body?.type as OutcomeType | undefined
    const paidAmountRaw = body?.paidAmount
    const notes = typeof body?.notes === "string" ? body.notes.trim() : null

    if (!claimId || typeof claimId !== "string") {
      return NextResponse.json({ error: "claimId required" }, { status: 400 })
    }
    if (type !== "PAID" && type !== "PARTIALLY_PAID" && type !== "REJECTED") {
      return NextResponse.json({ error: "type must be PAID, PARTIALLY_PAID, or REJECTED" }, { status: 400 })
    }

    const claimRef = db.collection("medicalAidClaims").doc(claimId)
    const claimSnap = await claimRef.get()
    if (!claimSnap.exists) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 })
    }

    const claim = { id: claimSnap.id, ...(claimSnap.data() as Record<string, unknown>) }
    const patientId = claim.patientId as string | undefined
    if (!patientId) {
      return NextResponse.json({ error: "Claim is missing patientId" }, { status: 400 })
    }

    const billedAmount =
      typeof claim.billAmount === "number"
        ? Number(claim.billAmount)
        : typeof claim.totalAmountClaimed === "number"
          ? Number(claim.totalAmountClaimed)
          : 0

    if (!Number.isFinite(billedAmount) || billedAmount < 0) {
      return NextResponse.json({ error: "Claim has invalid billed amount" }, { status: 400 })
    }

    const patientSnap = await db.collection("patients").doc(patientId).get()
    const patient = patientSnap.exists ? ({ id: patientSnap.id, ...(patientSnap.data() as Record<string, unknown>) } as Record<string, unknown>) : null

    const patientEmailFromClaim = typeof claim.patientEmail === "string" ? claim.patientEmail.trim() : ""
    const patientEmailFromPatient = typeof patient?.email === "string" ? String(patient?.email).trim() : ""
    const patientEmail = patientEmailFromClaim || patientEmailFromPatient

    if (!patientEmail) {
      return NextResponse.json({ error: "Patient has no email address on file." }, { status: 400 })
    }

    const patientName = (patient?.name as string) || (claim.patientName as string) || "Patient"

    let paidAmount = 0
    if (type === "PAID") {
      paidAmount = isFiniteNumber(paidAmountRaw) ? Number(paidAmountRaw) : billedAmount
      if (!Number.isFinite(paidAmount) || paidAmount < 0) paidAmount = billedAmount
      if (paidAmount > billedAmount) paidAmount = billedAmount
    } else if (type === "PARTIALLY_PAID") {
      if (!isFiniteNumber(paidAmountRaw)) {
        return NextResponse.json({ error: "paidAmount required for PARTIALLY_PAID" }, { status: 400 })
      }
      paidAmount = Number(paidAmountRaw)
      if (!Number.isFinite(paidAmount) || paidAmount < 0 || paidAmount >= billedAmount) {
        return NextResponse.json({ error: "paidAmount must be >= 0 and less than billed amount" }, { status: 400 })
      }
    } else {
      paidAmount = 0
    }

    const shortfallAmount = Math.max(0, billedAmount - paidAmount)

    // Create invoice for outstanding amount when applicable
    let invoiceId: string | null = null
    let invoicePdfBase64: string | null = null

    if (type === "PARTIALLY_PAID" || type === "REJECTED") {
      const outstanding = type === "REJECTED" ? billedAmount : shortfallAmount
      const description = type === "REJECTED" ? "Outstanding amount (medical aid rejected)" : "Medical aid shortfall"
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      const invoiceRef = db.collection("invoices").doc()
      invoiceId = invoiceRef.id

      const invoiceDoc = {
        patientId,
        items: [
          {
            description,
            quantity: 1,
            unitPrice: outstanding,
            total: outstanding,
          },
        ],
        subtotal: outstanding,
        tax: 0,
        discount: 0,
        total: outstanding,
        status: "completed",
        dueDate: admin.firestore.Timestamp.fromDate(dueDate),
        createdAt: admin.firestore.Timestamp.now(),
        medicalAidClaimId: claimId,
        createdBy: uid,
        source: "medical-aid-outcome",
      }

      await invoiceRef.set(invoiceDoc)

      const invoicePdf = await getInvoicePdfBuffer(
        {
          id: invoiceId,
          items: invoiceDoc.items,
          subtotal: invoiceDoc.subtotal,
          tax: invoiceDoc.tax,
          discount: invoiceDoc.discount,
          total: invoiceDoc.total,
          createdAt: invoiceDoc.createdAt,
          dueDate: invoiceDoc.dueDate,
        },
        patient
          ? {
              id: patientId,
              name: patientName,
              patientNumber: (patient.patientNumber as string | undefined) || undefined,
              idNumber: (patient.idNumber as string | undefined) || undefined,
              phone: (patient.phone as string | undefined) || (patient.cellPhone as string | undefined) || undefined,
              email: patientEmail,
            }
          : null
      )
      invoicePdfBase64 = Buffer.from(invoicePdf).toString("base64")
    }

    // Receipt PDF for PAID
    let receiptPdfBase64: string | null = null
    if (type === "PAID") {
      const receiptPdf = await getMedicalAidReceiptPdfBuffer({
        patient: patient
          ? {
              id: patientId,
              name: patientName,
              patientNumber: (patient.patientNumber as string | undefined) || undefined,
              idNumber: (patient.idNumber as string | undefined) || undefined,
              phone: (patient.phone as string | undefined) || (patient.cellPhone as string | undefined) || undefined,
              email: patientEmail,
            }
          : null,
        claim: {
          id: claimId,
          schemeName: claim.schemeName as string | undefined,
          membershipNumber: claim.membershipNumber as string | undefined,
          billAmount: billedAmount,
          totalAmountClaimed: billedAmount,
          consultationDate: claim.consultationDate,
        },
        outcome: {
          type,
          billedAmount,
          paidAmount,
          shortfallAmount,
          outcomeDate: new Date(),
        },
      })
      receiptPdfBase64 = Buffer.from(receiptPdf).toString("base64")
    }

    // Update claim + write audit outcome
    const now = admin.firestore.Timestamp.now()
    await claimRef.update({
      status: type,
      paidAmount: type === "REJECTED" ? 0 : paidAmount,
      shortfallAmount: type === "PAID" ? 0 : shortfallAmount,
      shortfallInvoiceId: invoiceId,
      outcomeRecordedAt: now,
      outcomeRecordedBy: uid,
      patientEmail,
      outcomeNotes: notes || null,
    })

    await claimRef.collection("outcomes").add({
      type,
      billedAmount,
      paidAmount: type === "REJECTED" ? 0 : paidAmount,
      shortfallAmount: type === "PAID" ? 0 : shortfallAmount,
      notes: notes || null,
      createdAt: now,
      createdBy: uid,
    })

    // If this is a fully paid medical-aid claim, mark the original scheme invoice as completed.
    if (type === "PAID" && shortfallAmount === 0) {
      const billInvoiceId = (claim.billInvoiceId as string | undefined) ?? undefined
      if (billInvoiceId) {
        try {
          const invoiceRef = db.collection("invoices").doc(billInvoiceId)
          const invoiceSnap = await invoiceRef.get()
          if (invoiceSnap.exists) {
            await invoiceRef.update({
              status: "completed",
              paidDate: now,
              paymentMethod: "medical-aid",
            })
          }
        } catch (err) {
          console.error("[medical-aid-claim-outcome] Failed to mark invoice completed:", err)
        }
      }
    }

    const Resend = (await import("resend")).Resend
    const resend = new Resend(RESEND_API_KEY)

    const logoUrl = getEmailLogoUrl(request)
    const header = buildBaseHeader(logoUrl)

    const invoiceNumber = String(invoiceId ?? claimId).toUpperCase()
    const consultationDateObj = toSafeJsDate(claim.consultationDate)
    const consultationDateStr = consultationDateObj.toLocaleDateString("en-ZA")
    const consultationTimeStr = consultationDateObj.toLocaleTimeString("en-ZA", {
      hour: "2-digit",
      minute: "2-digit",
    })
    const doctorName =
      typeof claim.createdByName === "string" && claim.createdByName.trim()
        ? (claim.createdByName as string)
        : "Dr WC Mkhonza"

    const amountsHtml = `
      <table style="width:100%; border-collapse: collapse; margin-top: 16px;">
        <tbody>
          <tr>
            <td style="padding:8px; border:1px solid #E5E7EB; font-size:13px;">Billed</td>
            <td style="padding:8px; border:1px solid #E5E7EB; font-size:13px; text-align:right;">${formatCurrency(billedAmount)}</td>
          </tr>
          <tr>
            <td style="padding:8px; border:1px solid #E5E7EB; font-size:13px;">Paid</td>
            <td style="padding:8px; border:1px solid #E5E7EB; font-size:13px; text-align:right;">${formatCurrency(type === "REJECTED" ? 0 : paidAmount)}</td>
          </tr>
          <tr>
            <td style="padding:8px; border:1px solid #E5E7EB; font-size:13px;">Shortfall</td>
            <td style="padding:8px; border:1px solid #E5E7EB; font-size:13px; text-align:right;">${formatCurrency(type === "PAID" ? 0 : shortfallAmount)}</td>
          </tr>
        </tbody>
      </table>
    `

    const bodyIntro = `
      <p style="font-size:14px; color:#111827;">Dear ${patientName},</p>
      <p style="font-size:14px; color:#374151; margin-top:12px;">
        We refer to your consultation with <strong>Dr ${doctorName}</strong> on
        <strong> ${consultationDateStr}</strong> at <strong>${consultationTimeStr}</strong>.
      </p>
    `

    let subject = "Medical aid claim outcome"
    let html = ""
    const attachments: Array<{ filename: string; content: string }> = []

    if (type === "PAID") {
      subject = `Medical Aid Claim Paid in Full | Invoice ${invoiceNumber}`
      html = `
        ${header}
        <div style="max-width:640px; margin:0 auto; padding:0 16px; font-family:system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
          ${bodyIntro}
          <p style="font-size:14px; color:#374151; margin-top:12px;">
            We are pleased to inform you that your medical aid claim has been processed and <strong>paid in full</strong>.
          </p>
          <p style="font-size:14px; color:#374151; margin-top:12px;">
            Please find your receipt/statement attached for your records.
          </p>
          ${amountsHtml}
          <p style="font-size:14px; color:#374151; margin-top:16px;">
            If you have any queries or would like to verify the payment, please contact the practice directly and quote your invoice reference number:
            <strong> ${invoiceNumber}</strong>.
          </p>
          <p style="margin-top:16px; font-size:14px; color:#374151;">
            Kind regards,<br/>
            <strong>Practice Administration</strong>
          </p>
        </div>
      `
      if (receiptPdfBase64) {
        attachments.push({
          filename: `medical-aid-receipt-${claimId}.pdf`,
          content: receiptPdfBase64,
        })
      }
    } else if (type === "PARTIALLY_PAID") {
      subject = `Medical Aid Claim Update – Partial Payment | Invoice ${invoiceNumber}`
      html = `
        ${header}
        <div style="max-width:640px; margin:0 auto; padding:0 16px; font-family:system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
          ${bodyIntro}
          <p style="font-size:14px; color:#374151; margin-top:12px;">
            Your medical aid claim has been processed and reflects a <strong>partial payment</strong>.
            An outstanding balance of <strong>${formatCurrency(shortfallAmount)}</strong> remains payable by you.
          </p>
          <p style="font-size:14px; color:#374151; margin-top:12px;">
            Please find the shortfall invoice attached for your reference.
          </p>
          ${amountsHtml}
          <p style="font-size:14px; color:#374151; margin-top:16px;">
            Kindly arrange payment at your earliest convenience. Should you wish to verify the payment or require any clarification,
            please contact the practice directly and quote your invoice reference number:
            <strong> ${invoiceNumber}</strong>.
          </p>
          <p style="margin-top:16px; font-size:14px; color:#374151;">
            Kind regards,<br/>
            <strong>Practice Administration</strong>
          </p>
        </div>
      `
      if (invoicePdfBase64 && invoiceId) {
        attachments.push({
          filename: `invoice-${String(invoiceId).toUpperCase()}.pdf`,
          content: invoicePdfBase64,
        })
      }
    } else {
      subject = `Medical Aid Claim Rejected | Invoice ${invoiceNumber}`
      html = `
        ${header}
        <div style="max-width:640px; margin:0 auto; padding:0 16px; font-family:system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
          ${bodyIntro}
          <p style="font-size:14px; color:#374151; margin-top:12px;">
            Your medical aid claim has unfortunately been <strong>rejected</strong> by your medical scheme.
            The full outstanding amount of <strong>${formatCurrency(billedAmount)}</strong> is therefore payable by you.
          </p>
          <p style="font-size:14px; color:#374151; margin-top:12px;">
            Please find the invoice attached for your reference.
          </p>
          ${amountsHtml}
          <p style="font-size:14px; color:#374151; margin-top:16px;">
            We kindly request that payment be made at your earliest convenience. Should you require clarification or wish to verify this information,
            please contact the practice directly and quote your invoice reference number:
            <strong> ${invoiceNumber}</strong>.
          </p>
          <p style="margin-top:16px; font-size:14px; color:#374151;">
            Kind regards,<br/>
            <strong>Practice Administration</strong>
          </p>
        </div>
      `
      if (invoicePdfBase64 && invoiceId) {
        attachments.push({
          filename: `invoice-${String(invoiceId).toUpperCase()}.pdf`,
          content: invoicePdfBase64,
        })
      }
    }

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [patientEmail],
      subject,
      html,
      ...(attachments.length > 0 ? { attachments } : {}),
    })

    if (error) {
      console.error("[medical-aid-claim-outcome] Resend error:", error)
      return NextResponse.json({ error: error.message || "Failed to send email" }, { status: 502 })
    }

    return NextResponse.json({ ok: true, invoiceId })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to process medical aid claim outcome"
    console.error("[medical-aid-claim-outcome] Error:", msg, e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

