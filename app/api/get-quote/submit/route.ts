import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"

import {
  ABOUT_REZTEK,
  CONTACT_DETAILS,
  DATA_SECURITY_NOTICE,
  INCLUDED_FEATURES,
  OUTCOME_BENEFITS,
  QUOTE_PRICING,
  doctorLeadSchema,
} from "@/lib/get-quote"
import { getAdminFirestore } from "@/lib/firebase-admin"

export const runtime = "nodejs"

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL =
  process.env.GET_QUOTE_EMAIL_FROM ||
  process.env.CONSULTATION_EMAIL_FROM ||
  "Reztek Healthcare <noreply@reztekhealth.example.com>"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

function buildAiPrompt(input: {
  practiceName: string
  practiceType: string
  specialization: string
  location?: string
  doctors?: number
  staff?: number
  patientsPerDay?: number
  averageConsultationMinutes?: number
  yearsInOperation?: number
  hasSystem: string
  currentSystem?: string
}) {
  return `You are writing a short persuasive onboarding summary for a medical practice evaluating Reztek's healthcare SaaS platform.

Return exactly 2-3 sentences (max 85 words). No bullet points. No disclaimers. No "AI" wording.

Practice:
- Name: ${input.practiceName}
- Type: ${input.practiceType}
- Specialization: ${input.specialization}
- Location: ${input.location || "Not provided"}
- Doctors: ${input.doctors ?? 0}
- Staff: ${input.staff ?? 0}
- Avg patients/day: ${input.patientsPerDay ?? 0}
- Avg consultation time (minutes): ${input.averageConsultationMinutes ?? 20}
- Years operating: ${input.yearsInOperation ?? 0}
- Uses digital system: ${input.hasSystem}${input.hasSystem === "Yes" && input.currentSystem ? ` (${input.currentSystem})` : ""}

The summary must mention that consultation time can be cut by about half and that daily consultations can increase. Make it advert-style and explain why Reztek is needed based on healthcare professional count, patient volume, staff volume, location, and practice type.`
}

async function generatePracticeSummary(input: {
  practiceName: string
  practiceType: string
  specialization: string
  location?: string
  doctors?: number
  staff?: number
  patientsPerDay?: number
  averageConsultationMinutes?: number
  yearsInOperation?: number
  hasSystem: string
  currentSystem?: string
}): Promise<string | null> {
  if (!OPENAI_API_KEY) return null

  const prompt = buildAiPrompt(input)
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You write concise professional onboarding summaries for medical practices. Output only the summary sentence(s), no other text.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 120,
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => "")
    console.error("[get-quote/submit] OpenAI error:", response.status, errText)
    return null
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) return null

  // Hard trim to keep emails tight.
  return content.replace(/\s+/g, " ").slice(0, 320)
}

function renderEmailHtml(args: {
  name: string
  practiceName: string
  specialization: string
  doctors: number
  patientsPerDay: number
  aiSummary: string | null
}) {
  const doctorsSurcharge = args.doctors >= 2 ? 350 : 0
  const highPatientSurcharge = args.patientsPerDay > 500 ? 350 : 0
  const monthlyTotal = QUOTE_PRICING.monthlyCostZar + doctorsSurcharge + highPatientSurcharge
  const monthly = `R${monthlyTotal.toLocaleString("en-ZA")}`
  const setup = `R${QUOTE_PRICING.setupFeeZar.toLocaleString("en-ZA")}`

  const featureList = INCLUDED_FEATURES.map((x) => `<li style="margin:6px 0;">${x}</li>`).join("")
  const benefitList = OUTCOME_BENEFITS.map((x) => `<li style="margin:6px 0;">${x}</li>`).join("")

  return `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#0f172a; line-height:1.6;">
      <h2 style="margin:0 0 10px;">Thank you, ${args.name}.</h2>
      <p style="margin:0 0 14px;">
        We’ve received your request for a quote for <strong>${args.practiceName}</strong> (${args.specialization}).
      </p>
      ${
        args.aiSummary
          ? `<div style="margin:16px 0; padding:14px; border:1px solid #e2e8f0; border-radius:12px; background:#f8fafc;">
               <div style="font-size:12px; color:#475569; text-transform:uppercase; letter-spacing:.06em;">Practice summary</div>
               <div style="margin-top:8px; font-size:14px;">${args.aiSummary}</div>
             </div>`
          : ""
      }
      <div style="margin:16px 0; padding:16px; border:1px solid #e2e8f0; border-radius:12px; background:#ffffff;">
        <div style="font-size:12px; color:#475569; text-transform:uppercase; letter-spacing:.06em;">Quote</div>
        <p style="margin:10px 0 0; font-size:16px;">
          <strong>Monthly Cost:</strong> ${monthly} / month<br/>
          <strong>Initial System Setup &amp; Customization Fee:</strong> ${setup} (once-off)
        </p>
      </div>

      <h3 style="margin:18px 0 10px;">Included features</h3>
      <ul style="margin:0 0 14px; padding-left:18px;">${featureList}</ul>

      <h3 style="margin:18px 0 10px;">Key outcomes</h3>
      <ul style="margin:0 0 14px; padding-left:18px;">${benefitList}</ul>

      <div style="margin:16px 0; padding:14px; border-left:4px solid #0ea5e9; background:#f0f9ff;">
        <strong>Data protection:</strong> ${DATA_SECURITY_NOTICE}
      </div>

      <p style="margin:16px 0 10px;">${ABOUT_REZTEK}</p>

      <div style="margin:16px 0; padding:14px; border:1px solid #e2e8f0; border-radius:12px; background:#ffffff;">
        <div style="font-size:12px; color:#475569; text-transform:uppercase; letter-spacing:.06em;">Contact</div>
        <p style="margin:10px 0 0; font-size:14px;">
          Email: <a href="mailto:${CONTACT_DETAILS.email}">${CONTACT_DETAILS.email}</a><br/>
          Phone: <a href="tel:${CONTACT_DETAILS.phone}">${CONTACT_DETAILS.phone}</a><br/>
          Alternate Phone: <a href="tel:${CONTACT_DETAILS.altPhone}">${CONTACT_DETAILS.altPhone}</a>
        </p>
      </div>

      <p style="margin:18px 0 0;">Kind regards,<br/><strong>Reztek</strong></p>
    </div>
  `
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) return { sent: false, reason: "RESEND_API_KEY missing" } as const
  const Resend = (await import("resend")).Resend
  const resend = new Resend(RESEND_API_KEY)
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [to],
    subject,
    html,
  })
  if (error) {
    console.error("[get-quote/submit] Resend error:", error)
    return { sent: false, reason: "resend_error" } as const
  }
  return { sent: true } as const
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const parsed = doctorLeadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid form submission. Please check required fields." },
        { status: 400 },
      )
    }

    const input = parsed.data

    const db = await getAdminFirestore()

    // Best-effort AI summary (do not block lead capture)
    let aiSummary: string | null = null
    try {
      aiSummary = await generatePracticeSummary({
        practiceName: input.practiceName,
        practiceType: input.practiceType,
        specialization: input.specialization,
        location: input.location,
        doctors: input.doctors,
        staff: input.staff,
        patientsPerDay: input.patientsPerDay,
        averageConsultationMinutes: input.averageConsultationMinutes,
        yearsInOperation: input.yearsInOperation,
        hasSystem: input.hasSystem,
        currentSystem: input.currentSystem,
      })
    } catch (e) {
      console.error("[get-quote/submit] AI summary failed:", e)
    }

    const leadRef = await db.collection("doctor_leads").add({
      ...input,
      ...(aiSummary ? { aiSummary } : {}),
      createdAt: FieldValue.serverTimestamp(),
    })

    // Best-effort email (do not block lead capture)
    try {
      const html = renderEmailHtml({
        name: input.name,
        practiceName: input.practiceName,
        specialization: input.specialization,
        doctors: input.doctors ?? 0,
        patientsPerDay: input.patientsPerDay ?? 0,
        aiSummary,
      })
      await sendEmail(input.email, "Your Reztek quote & next steps", html)
    } catch (e) {
      console.error("[get-quote/submit] email send failed:", e)
    }

    return NextResponse.json({ leadId: leadRef.id })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to submit quote request"
    console.error("[get-quote/submit] Error:", msg, e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

