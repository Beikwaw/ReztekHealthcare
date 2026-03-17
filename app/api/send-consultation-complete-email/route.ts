import { NextRequest, NextResponse } from "next/server"
import { getFirebaseAdmin } from "@/lib/firebase-admin"

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL =
  process.env.CONSULTATION_EMAIL_FROM || "Reztek Healthcare Practice <noreply@reztekhealth.example.com>"

function getEmailLogoUrl(request: NextRequest): string {
  const envLogo = process.env.EMAIL_LOGO_URL
  if (envLogo && envLogo.trim()) {
    return envLogo.trim()
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  const path = "/reztek-logo.svg"
  if (siteUrl && siteUrl.trim()) {
    return `${siteUrl.replace(/\/+$/, "")}${path}`
  }
  // Fallback to production domain
  return `https://reztekhealth.example.com${path}`
}

type Mode = "medical-aid" | "cash"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const consultationId = body?.consultationId as string | undefined
    const bodyMode = body?.mode as Mode | undefined

    if (!consultationId) {
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

    const patientEmail = (patient?.email as string | undefined)?.trim()
    if (!patientEmail) {
      return NextResponse.json({ error: "Patient has no email address on file." }, { status: 400 })
    }

    const patientName = (patient?.name as string) || (consultation.patientName as string) || "Patient"
    const paymentMethod = (patient?.paymentMethod as string | undefined) ?? (consultation.paymentMethod as string | undefined)
    const medicalAidInfo = patient?.medicalAidInfo as { name?: string; memberNumber?: string } | undefined
    const insuranceInfo = patient?.insuranceInfo as { provider?: string } | undefined

    const isMedicalAid =
      paymentMethod === "medical-aid" ||
      Boolean(medicalAidInfo?.name) ||
      Boolean(medicalAidInfo?.memberNumber) ||
      Boolean(insuranceInfo?.provider)

    const resolvedMode: Mode = bodyMode === "medical-aid" || bodyMode === "cash"
      ? bodyMode
      : isMedicalAid
      ? "medical-aid"
      : "cash"

    const createdAt = consultation.createdAt
    const consultationDate =
      createdAt && typeof (createdAt as { toDate?: () => Date }).toDate === "function"
        ? (createdAt as { toDate: () => Date }).toDate()
        : createdAt
          ? new Date(createdAt as string | number)
          : new Date()

    const followUpDateRaw = consultation.followUpAppointmentDate as
      | { toDate?: () => Date }
      | string
      | number
      | undefined
    const followUpTimeRaw = (consultation.followUpAppointmentTime as string | undefined) || ""

    const followUpDate =
      followUpDateRaw && typeof followUpDateRaw === "object" && typeof followUpDateRaw.toDate === "function"
        ? followUpDateRaw.toDate()
        : followUpDateRaw
          ? new Date(followUpDateRaw)
          : null

    const followUpTime = followUpTimeRaw.trim()

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

    if (!RESEND_API_KEY) {
      console.warn("[send-consultation-complete-email] RESEND_API_KEY not set.")
      return NextResponse.json(
        {
          error: "Email not configured. Add RESEND_API_KEY in environment variables.",
        },
        { status: 503 },
      )
    }

    const Resend = (await import("resend")).Resend
    const resend = new Resend(RESEND_API_KEY)

    const formattedDate = consultationDate.toLocaleString("en-ZA", {
      dateStyle: "medium",
      timeStyle: "short",
    })

    let followUpSection = ""
    if (followUpDate && followUpTime) {
      const followUpDateStr = followUpDate.toLocaleDateString("en-ZA", {
        dateStyle: "medium",
      })
      followUpSection = `
        <p style="font-size:14px; color:#374151; margin-top:16px;">
          <strong>Next appointment:</strong> ${followUpDateStr} at ${followUpTime}
        </p>
      `
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

    let subject: string
    let bodyHtml: string

    if (resolvedMode === "medical-aid") {
      subject = "Consultation completed - Medical Aid processing"
      bodyHtml = `
        ${baseHeader}
        <p style="font-size:14px; color:#111827;">Dear ${patientName},</p>
        <p style="font-size:14px; color:#374151;">
          This email confirms that your consultation at <strong>${practiceContacts.name}</strong> has been completed.
        </p>
        <p style="font-size:14px; color:#374151; margin-top:12px;">
          <strong>Patient:</strong> ${patientName}<br/>
          <strong>Date &amp; time:</strong> ${formattedDate}
        </p>
        ${followUpSection}
        <p style="font-size:14px; color:#374151; margin-top:16px;">
          Your medical aid provider will be contacted regarding this consultation.
          Any billing amount due (if applicable) will be issued once processed.
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
      `
    } else {
      subject = "Billing confirmation - Thank you for your visit"
      bodyHtml = `
        ${baseHeader}
        <p style="font-size:14px; color:#111827;">Dear ${patientName},</p>
        <p style="font-size:14px; color:#374151;">
          Thank you for your visit to <strong>${practiceContacts.name}</strong>.
        </p>
        <p style="font-size:14px; color:#374151; margin-top:12px;">
          <strong>Patient:</strong> ${patientName}<br/>
          <strong>Date &amp; time:</strong> ${formattedDate}
        </p>
        ${followUpSection}
        <p style="font-size:14px; color:#374151; margin-top:16px;">
          This email confirms that your consultation and billing have been recorded.
          If you have any questions about your charges or payment, please contact the practice using the details below.
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
      `
    }

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [patientEmail],
      subject,
      html: bodyHtml,
    })

    if (error) {
      console.error("[send-consultation-complete-email] Resend API error:", error)
      const statusCode = (error as { statusCode?: number }).statusCode
      const message = (error as { message?: string }).message || "Failed to send email"

      if (statusCode === 403 || statusCode === 422) {
        return NextResponse.json(
          {
            error:
              "Email configuration is invalid. Please verify the sending domain and FROM address in Resend.",
          },
          { status: 503 },
        )
      }

      return NextResponse.json({ error: message }, { status: 502 })
    }

    await db.collection("consultations").doc(consultationId).update({
      lastCompletionEmailMode: resolvedMode,
      lastCompletionEmailAt: admin.firestore.Timestamp.now(),
    })

    return NextResponse.json({ success: true, id: data?.id })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to send completion email"
    console.error("[send-consultation-complete-email] Unexpected error:", e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

