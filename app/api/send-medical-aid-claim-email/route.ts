/**
 * POST: Send medical aid claim PDF to the configured clerk email.
 * Body: { claimId }. Regenerates PDF from claim data and attaches to email.
 */

import { NextRequest, NextResponse } from "next/server"
import { ERROR_CODES, ERROR_MESSAGES } from "@/lib/error-messages"
import { apiErrorResponse } from "@/lib/errors"
import { getFirebaseAdmin } from "@/lib/firebase-admin"
import { claimToConsultationPdfPayload, getMedicalAidConsultationPdfBuffer } from "@/lib/medical-aid-consultation-pdf"
import type { MedicalAidClaim } from "@/lib/types"

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL =
  process.env.CONSULTATION_EMAIL_FROM || "Reztek Healthcare Practice <noreply@reztekhealth.example.com>"
const CLERK_EMAIL = "clerk1drmkhonza@gmail.com"

function toDate(v: unknown): Date {
  if (v instanceof Date) return v
  if (v && typeof (v as { toDate?: () => Date }).toDate === "function") return (v as { toDate: () => Date }).toDate()
  if (typeof v === "string" || typeof v === "number") return new Date(v)
  return new Date()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const claimId = body?.claimId
    if (!claimId || typeof claimId !== "string") {
      return NextResponse.json({ error: "claimId required" }, { status: 400 })
    }

    const admin = await getFirebaseAdmin()
    const db = admin.firestore()
    const claimSnap = await db.collection("medicalAidClaims").doc(claimId).get()
    if (!claimSnap.exists) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 })
    }

    const data = claimSnap.data() as Record<string, unknown>
    const claim: MedicalAidClaim = {
      id: claimSnap.id,
      ...data,
      consultationDate: toDate(data.consultationDate),
      dateOfService: toDate(data.dateOfService),
    } as MedicalAidClaim

    const payload = claimToConsultationPdfPayload(claim)
    const buffer = await getMedicalAidConsultationPdfBuffer(payload)
    const pdfBuffer = Buffer.from(buffer)

    if (!RESEND_API_KEY) {
      return NextResponse.json(
        {
          error: "Email not configured. Set RESEND_API_KEY in environment.",
          mailto: `mailto:${CLERK_EMAIL}?subject=${encodeURIComponent("Medical Aid Claim")}&body=Claim ID: ${claimId}`,
        },
        { status: 503 }
      )
    }

    const Resend = (await import("resend")).Resend
    const resend = new Resend(RESEND_API_KEY)

    const { data: res, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [CLERK_EMAIL],
      subject: `Medical Aid Claim – ${claim.patientName || "Patient"} (${claimId})`,
      html: `
        <p>Please find attached the medical aid claim PDF.</p>
        <p><strong>Patient:</strong> ${claim.patientName ?? "—"}</p>
        <p><strong>Consultation date:</strong> ${payload.consultationDate.toLocaleDateString("en-ZA")}</p>
        <p><strong>Scheme:</strong> ${claim.schemeName ?? "—"}</p>
        <p><strong>Amount claimed:</strong> R ${(claim.totalAmountClaimed ?? 0).toFixed(2)}</p>
        <p>Claim ID: ${claimId}</p>
      `,
      attachments: [
        {
          filename: `medical-aid-claim-${claimId}.pdf`,
          content: pdfBuffer.toString("base64"),
        },
      ],
    })

    if (error) {
      console.error("[send-medical-aid-claim-email]", error)
      return NextResponse.json(
        { error: ERROR_MESSAGES.EMAIL_SEND_FAILED, code: ERROR_CODES.EMAIL_ERROR },
        { status: 502 },
      )
    }

    return NextResponse.json({ ok: true, messageId: res?.id })
  } catch (e) {
    return apiErrorResponse(e, "send-medical-aid-claim-email")
  }
}
