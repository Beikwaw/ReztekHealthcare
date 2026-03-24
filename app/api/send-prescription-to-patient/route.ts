/**
 * POST: Send prescription PDF to patient by email (for pharmacy portal).
 * Pharmacy can email the prescription to patient for external pharmacy fulfillment.
 * Email template matches billing/consultation completion (logo + practice details).
 */

import { NextRequest, NextResponse } from "next/server"
import { ERROR_CODES, ERROR_MESSAGES } from "@/lib/error-messages"
import { apiErrorResponse } from "@/lib/errors"
import { getFirebaseAdmin, type FirebaseAdmin } from "@/lib/firebase-admin"
import { getPrescriptionPdfBuffer, type PatientDetailForPdf } from "@/lib/consultation-summary-pdf"
import { Resend } from "resend"

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL =
  (process.env.CONSULTATION_EMAIL_FROM ?? "") || "Reztek Healthcare Practice <noreply@reztekhealth.example.com>"

function trimStr(s: unknown): string {
  if (typeof s !== "string") return ""
  const t = s as { trim?: () => string }
  return typeof t.trim === "function" ? t.trim() : s
}

function getEmailLogoUrl(_request: NextRequest): string {
  const envLogo = process.env.EMAIL_LOGO_URL
  if (envLogo && trimStr(envLogo)) return trimStr(envLogo)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  const path = "/reztek-logo.svg"
  if (siteUrl && trimStr(siteUrl)) {
    const base = trimStr(siteUrl)
    const re = /\/+$/
    const repl = base.replace ? base.replace(re, "") : base
    return `${repl}${path}`
  }
  return `https://reztekhealth.example.com${path}`
}

type ConsultationData = { [key: string]: unknown }

export async function POST(request: NextRequest) {
  try {
    if (!RESEND_API_KEY || !trimStr(RESEND_API_KEY)) {
      return NextResponse.json(
        { error: "Email not configured. Set RESEND_API_KEY in environment." },
        { status: 503 }
      )
    }

    const body = (await request.json()) as { consultationId?: unknown; email?: unknown }
    const consultationId = body?.consultationId
    if (!consultationId || typeof consultationId !== "string") {
      return NextResponse.json({ error: "consultationId required" }, { status: 400 })
    }

    const admin = (await getFirebaseAdmin()) as FirebaseAdmin
    const db = admin.firestore()
    const consultationSnap = await db.collection("consultations").doc(consultationId).get()
    if (!consultationSnap.exists) {
      return NextResponse.json({ error: "Consultation not found" }, { status: 404 })
    }
    const consultation = consultationSnap.data() as ConsultationData
    const patientId = consultation.patientId as string
    const patientSnap = await db.collection("patients").doc(patientId).get()
    const patient = patientSnap.exists ? (patientSnap.data() as ConsultationData) : null
    const patientEmail = trimStr(body?.email) || trimStr(patient?.email)
    if (!patientEmail) {
      return NextResponse.json(
        { error: "Patient has no email on file. Provide email in request body." },
        { status: 400 }
      )
    }

    const patientName = (patient?.name as string) || (consultation.patientName as string) || "Patient"
    const createdAt = consultation.createdAt
    const consultationDate: Date =
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

    type PrescriptionItem = { medication?: string; dosage?: string; frequency?: string; duration?: string; instructions?: string }
    const scriptTextFromConsultation = (consultation.scriptText as string) || ""
    const rawPrescription = consultation.prescription
    const isArrayLike = (v: unknown): v is unknown[] =>
      typeof v === "object" && v !== null && "length" in v && typeof (v as unknown[]).length === "number"
    const structuredItems: PrescriptionItem[] = isArrayLike(rawPrescription)
      ? (rawPrescription as PrescriptionItem[])
      : []

    const scriptFromItems =
      structuredItems.length > 0
        ? structuredItems
            .map((item: PrescriptionItem, index: number) => {
              const med = item.medication || "Medicine"
              const dosage = item.dosage || ""
              const freq = item.frequency ? `, ${item.frequency}` : ""
              const duration = item.duration ? ` for ${item.duration}` : ""
              const instructions = item.instructions ? ` – ${item.instructions}` : ""
              return trimStr(`${index + 1}. ${med} ${dosage}${freq}${duration}${instructions}`)
            })
            .join("\n")
        : ""

    const combinedScriptText =
      trimStr(scriptTextFromConsultation) || scriptFromItems || "Prescription as discussed during consultation."

    const buffer = await getPrescriptionPdfBuffer(patientForPdf, combinedScriptText, consultationDate)
    const pdfBuffer = Buffer.from(buffer)

    const logoUrl = getEmailLogoUrl(request)
    const practiceContacts = {
      name: "Reztek Healthcare Practice",
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
    const baseHeader = `
      <div style="text-align:center; padding: 16px 0;">
        <img src="${logoUrl}" alt="Practice logo" style="max-height:80px; margin-bottom:8px;" />
        <div style="font-size:14px; color:#374151; font-weight:600;">${practiceContacts.name}</div>
        <div style="font-size:12px; color:#6B7280;">
          ${practiceContacts.main.address}<br/>
          ${practiceContacts.main.tel1} | ${practiceContacts.main.tel2}
        </div>
      </div>
      <hr style="border:none; border-top:1px solid #E5E7EB; margin:16px 0;" />
    `
    const formattedDate = consultationDate.toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })

    const resend = new Resend(trimStr(RESEND_API_KEY))
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: patientEmail,
      subject: `Your Prescription - Reztek Healthcare Practice`,
      html: `
        ${baseHeader}
        <p style="font-size:14px; color:#111827;">Dear ${patientName},</p>
        <p style="font-size:14px; color:#374151;">
          Please find your prescription attached. You may take this to any pharmacy to have your medication dispensed.
        </p>
        <p style="font-size:14px; color:#374151; margin-top:12px;">
          <strong>Patient:</strong> ${patientName}<br/>
          <strong>Date:</strong> ${formattedDate}
        </p>
        <p style="font-size:14px; color:#374151; margin-top:16px;">
          If you have any questions, please contact the practice using the details below.
        </p>
        <div style="margin-top:20px; padding:12px 16px; background-color:#F3F4F6; border-radius:8px; font-size:12px; color:#4B5563;">
          <p style="margin:4px 0;"><strong>SURGERY:</strong> ${practiceContacts.surgery.address}</p>
          <p style="margin:4px 0;">${practiceContacts.surgery.telFax}</p>
          <p style="margin:4px 0;"><strong>MAIN PRACTICE:</strong> ${practiceContacts.main.address}</p>
          <p style="margin:4px 0;">${practiceContacts.main.tel1}, ${practiceContacts.main.tel2}</p>
          <p style="margin:4px 0;"><strong>Email:</strong> ${practiceContacts.email}</p>
        </div>
        <p style="margin-top:16px; font-size:14px; color:#374151;">
          Kind regards,<br/>
          <strong>${practiceContacts.name}</strong>
        </p>
      `,
      attachments: [
        {
          filename: `prescription-${(patientName as string).replace(/\s+/g, "-")}.pdf`,
          content: pdfBuffer,
        },
      ],
    })
  

    if (error) {
      console.error("[send-prescription-to-patient] Resend error:", error)
      return NextResponse.json(
        { error: ERROR_MESSAGES.EMAIL_SEND_FAILED, code: ERROR_CODES.EMAIL_ERROR },
        { status: 502 },
      )
    }

    return NextResponse.json({ success: true, message: "Prescription sent to patient." })
  } catch (e: unknown) {
    return apiErrorResponse(e, "send-prescription-to-patient")
  }
}
