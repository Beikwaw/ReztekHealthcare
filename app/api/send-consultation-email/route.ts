/**
 * POST: Send consultation summary email to patient.
 * Uses RESEND_API_KEY and FIREBASE_SERVICE_ACCOUNT_JSON (Vercel) or firebase-service-account.json (local).
 * Requires consultation to have pdfStorageUrl (generate/store PDF first).
 */

import { NextRequest, NextResponse } from "next/server"
import { ERROR_CODES, ERROR_MESSAGES } from "@/lib/error-messages"
import { apiErrorResponse } from "@/lib/errors"
import { getFirebaseAdmin } from "@/lib/firebase-admin"
import { getPrescriptionPdfBuffer, type PatientDetailForPdf } from "@/lib/consultation-summary-pdf"
import { getPatientStoragePath } from "@/lib/utils"

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL =
  process.env.CONSULTATION_EMAIL_FROM || "Reztek Healthcare Practice <noreply@reztekhealth.example.com>"
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const consultationId = body?.consultationId
    if (!consultationId || typeof consultationId !== "string") {
      return NextResponse.json({ error: "consultationId required" }, { status: 400 })
    }

    const admin = await getFirebaseAdmin()
    const db = admin.firestore()
    const consultationSnap = await db.collection("consultations").doc(consultationId).get()
    if (!consultationSnap.exists) {
      return NextResponse.json({ error: "Consultation not found" }, { status: 404 })
    }
    const consultation = consultationSnap.data() as Record<string, unknown>
    const patientId = consultation.patientId as string
    const patientSnap = await db.collection("patients").doc(patientId).get()
    const patient = patientSnap.exists ? (patientSnap.data() as Record<string, unknown>) : null
    const patientEmail = (patient?.email as string)?.trim()
    if (!patientEmail) {
      return NextResponse.json(
        { error: "Patient has no email address on file." },
        { status: 400 }
      )
    }

    const patientName = (patient?.name as string) || (consultation.patientName as string) || "Patient"
    const appointmentId = consultation.appointmentId as string | undefined

    // Look up latest invoice for this patient (and appointment if available)
    let invoice: Record<string, unknown> | null = null
    try {
      const invoicesSnap = await db
        .collection("invoices")
        .where("patientId", "==", patientId)
        .get()

      const invoices = invoicesSnap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown>))
        .filter((inv) => !appointmentId || inv.appointmentId === appointmentId)
        .sort((a, b) => {
          const aAt = (a.createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date(0)
          const bAt = (b.createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date(0)
          return bAt.getTime() - aAt.getTime()
        })

      invoice = invoices[0] ?? null
    } catch (e) {
      console.error("Failed to load invoice for email:", e)
    }

    // Generate prescription/script PDF buffer directly for email attachment
    const createdAt = consultation.createdAt
    const consultationDate =
      createdAt && typeof (createdAt as { toDate?: () => Date }).toDate === "function"
        ? (createdAt as { toDate: () => Date }).toDate()
        : createdAt
          ? new Date(createdAt as string | number)
          : new Date()

    const patientForPdf: PatientDetailForPdf = {
      name: patientName,
      phone: patient?.phone as string | undefined,
      email: patientEmail,
      address: patient?.address as string | undefined,
      dateOfBirth: patient?.dateOfBirth as Date | string | undefined,
      patientNumber: patient?.patientNumber as string | undefined,
      doctorName: (consultation.doctorName as string) || "Reztek Healthcare Practice",
    }

    const scriptTextFromConsultation = (consultation.scriptText as string) || ""
    const structuredItems = Array.isArray(consultation.prescription)
      ? (consultation.prescription as { medication?: string; dosage?: string; frequency?: string; duration?: string; instructions?: string }[])
      : []

    const scriptFromItems =
      structuredItems.length > 0
        ? structuredItems
            .map((item, index) => {
              const med = item.medication || "Medicine"
              const dosage = item.dosage || ""
              const freq = item.frequency ? `, ${item.frequency}` : ""
              const duration = item.duration ? ` for ${item.duration}` : ""
              const instructions = item.instructions ? ` – ${item.instructions}` : ""
              return `${index + 1}. ${med} ${dosage}${freq}${duration}${instructions}`.trim()
            })
            .join("\n")
        : ""

    const combinedScriptText =
      scriptTextFromConsultation.trim() || scriptFromItems || "Prescription as discussed during consultation."

    let prescriptionPdfBuffer: Buffer
    try {
      const prescriptionArrayBuffer = await getPrescriptionPdfBuffer(
        patientForPdf,
        combinedScriptText,
        consultationDate,
      )
      prescriptionPdfBuffer = Buffer.from(prescriptionArrayBuffer)
    } catch (e) {
      console.error("Failed to generate prescription PDF for email:", e)
      return NextResponse.json(
        { error: ERROR_MESSAGES.PDF_GENERATION_FAILED, code: ERROR_CODES.INTERNAL_ERROR },
        { status: 500 },
      )
    }

    // Generate invoice PDF buffer if invoice exists; upload to Storage and save URL on consultation
    let invoicePdfBuffer: Buffer | null = null
    let billPdfStorageUrl: string | null = null
    if (invoice) {
      try {
        const { getInvoicePdfBuffer } = await import("@/lib/invoice-pdf-server")
        const invoiceArrayBuffer = await getInvoicePdfBuffer(invoice, patient)
        invoicePdfBuffer = Buffer.from(invoiceArrayBuffer)
        if (storageBucket || projectId) {
          const adminForStorage = await getFirebaseAdmin()
          const bucketName = storageBucket || `${projectId}.appspot.com`
          const bucket = adminForStorage.storage().bucket(bucketName)
          const { folder } = getPatientStoragePath(patientName, consultationDate)
          const filePath = `${folder}/invoice.pdf`
          const file = bucket.file(filePath)
          await file.save(invoicePdfBuffer, {
            contentType: "application/pdf",
            metadata: { cacheControl: "private, max-age=31536000" },
          })
          const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
          const [signedUrl] = await file.getSignedUrl({
            version: "v4",
            action: "read",
            expires: Date.now() + sevenDaysMs,
          })
          billPdfStorageUrl = signedUrl
        }
      } catch (e) {
        console.error("Failed to generate or store invoice PDF for email:", e)
      }
    }

    if (!RESEND_API_KEY) {
      console.warn(
        "[send-consultation-email] RESEND_API_KEY not set. On Vercel: add it in Project Settings → Environment Variables.",
      )
      return NextResponse.json(
        {
          error: ERROR_MESSAGES.EMAIL_NOT_CONFIGURED,
          code: ERROR_CODES.EMAIL_ERROR,
          mailto: `mailto:${patientEmail}?subject=${encodeURIComponent(
            "Your prescription and invoice - Reztek Healthcare Practice",
          )}&body=${encodeURIComponent(
            `Dear ${patientName},\n\nYour prescription and invoice are available in the patient portal.\n\nKind regards,\nReztek Healthcare Practice`,
          )}`,
        },
        { status: 503 },
      )
    }

    const Resend = (await import("resend")).Resend
    const resend = new Resend(RESEND_API_KEY)

    const attachments: { filename: string; content: string; contentType: string }[] = [
      {
        filename: `prescription-${consultationId}.pdf`,
        content: prescriptionPdfBuffer.toString("base64"),
        contentType: "application/pdf",
      },
    ]

    if (invoicePdfBuffer) {
      attachments.push({
        filename: `invoice-${invoice?.id ?? "latest"}.pdf`,
        content: invoicePdfBuffer.toString("base64"),
        contentType: "application/pdf",
      })
    }

    // Practice contact details for email
    const practiceContacts = {
      surgery: {
        address: "123 Reztek Medical Centre, Central District, Johannesburg 2000",
        telFax: "Tel/Fax: 010 000 0000",
      },
      main: {
        address: "456 Health Avenue, Johannesburg 2000",
        tel1: "Tel: 010 000 0001",
        tel2: "010 000 0002",
      },
      email: "info@reztekhealth.example.com",
    }

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [patientEmail],
      subject: "Your prescription & invoice - Reztek Healthcare Practice",
      html: `
        <p>Dear ${patientName},</p>
        <p>Please find attached your prescription script and billing invoice (PDF documents).</p>
        <p>If you have any questions about your visit or charges, please contact the practice:</p>
        <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-left: 4px solid #0066cc;">
          <p style="margin: 5px 0;"><strong>SURGERY:</strong><br/>
          ${practiceContacts.surgery.address}<br/>
          ${practiceContacts.surgery.telFax}</p>
          <p style="margin: 5px 0;"><strong>MAIN PRACTICE:</strong><br/>
          ${practiceContacts.main.address}<br/>
          ${practiceContacts.main.tel1}, ${practiceContacts.main.tel2}</p>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${practiceContacts.email}</p>
        </div>
        <p>Kind regards,<br/><strong>DR WC MKHONZA HEALTH PRACTICE</strong></p>
      `,
      attachments,
    })

    if (error) {
      console.error("[send-consultation-email] Resend API error:", error)
      const statusCode = (error as { statusCode?: number }).statusCode

      // Domain or from-address validation issues – treat as configuration and return a softer 503
      if (statusCode === 403 || statusCode === 422) {
        return NextResponse.json(
          {
            error: ERROR_MESSAGES.EMAIL_CONFIG_INVALID,
            code: ERROR_CODES.EMAIL_ERROR,
          },
          { status: 503 },
        )
      }

      return NextResponse.json(
        { error: ERROR_MESSAGES.EMAIL_SEND_FAILED, code: ERROR_CODES.EMAIL_ERROR },
        { status: 502 },
      )
    }

    const updateData: Record<string, unknown> = {
      pdfSentAt: admin.firestore.Timestamp.now(),
      pdfSentTo: patientEmail,
      updatedAt: admin.firestore.Timestamp.now(),
    }
    if (billPdfStorageUrl) {
      updateData.billPdfStorageUrl = billPdfStorageUrl
    }
    await db.collection("consultations").doc(consultationId).update(updateData)

    return NextResponse.json({
      success: true,
      id: data?.id,
      attachedInvoice: Boolean(invoicePdfBuffer),
    })
  } catch (e) {
    return apiErrorResponse(e, "send-consultation-email")
  }
}
