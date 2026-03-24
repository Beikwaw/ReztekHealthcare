import { NextRequest, NextResponse } from "next/server"
import { ERROR_CODES, ERROR_MESSAGES } from "@/lib/error-messages"
import { apiErrorResponse } from "@/lib/errors"
import { parseSummaryAndDiagnosis } from "@/lib/consultation-summary-pdf"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

type ValidatedBody = {
  patientName: string
  symptoms: string[]
  symptomDetails?: string
  presentingComplaint?: string
  onset?: string
  vitalSigns?: string
  physicalExamination?: string
  specialInvestigations?: string
  allergies?: string[]
  chronicConditions?: string[]
  currentMedications?: string[]
}

// Extract first ICD-10-like code from a diagnosis text (e.g. "ICD-10: J06.9" or "J06.9").
function parseIcd10FromDiagnosis(diagnosis: string | undefined): string | undefined {
  if (!diagnosis) return undefined
  const trimmed = diagnosis.trim()
  if (!trimmed) return undefined
  const match =
    trimmed.match(/(?:ICD-10|ICD10)\s*:?\s*([A-Z]\d{2}(?:\.\d{1,2})?)/i) ||
    trimmed.match(/\b([A-Z]\d{2}(?:\.\d{1,2})?)\b/)
  return match ? match[1].trim() : undefined
}

/** Validate request body: patient name required; symptoms array required; other fields optional */
function validateBody(body: unknown): ValidatedBody | null {
  if (!body || typeof body !== "object") return null
  const b = body as Record<string, unknown>
  const patientName = b.patientName
  const symptoms = b.symptoms
  if (typeof patientName !== "string" || !patientName.trim()) return null
  if (!Array.isArray(symptoms)) return null
  const validSymptoms = symptoms.every((s) => typeof s === "string")
  if (!validSymptoms) return null
  const toStr = (v: unknown) => (typeof v === "string" ? v.trim() || undefined : undefined)
  const toStrArr = (v: unknown): string[] | undefined => {
    if (!Array.isArray(v)) return undefined
    const arr = v.map((s) => (typeof s === "string" ? s.trim() : "")).filter(Boolean)
    return arr.length ? arr : undefined
  }
  return {
    patientName: patientName.trim(),
    symptoms: symptoms.map((s) => String(s).trim()).filter(Boolean),
    symptomDetails: toStr(b.symptomDetails),
    presentingComplaint: toStr(b.presentingComplaint),
    onset: toStr(b.onset),
    vitalSigns: toStr(b.vitalSigns),
    physicalExamination: toStr(b.physicalExamination),
    specialInvestigations: toStr(b.specialInvestigations),
    allergies: toStrArr(b.allergies),
    chronicConditions: toStrArr(b.chronicConditions),
    currentMedications: toStrArr(b.currentMedications),
  }
}

function orNotRecorded(s: string | undefined): string {
  return s && s.trim() ? s.trim() : "Not recorded"
}

/** Build the strict prompt for OpenAI: exactly two sections with exact headings */
function buildPrompt(v: ValidatedBody): string {
  const {
    patientName,
    symptoms,
    symptomDetails,
    presentingComplaint,
    onset,
    vitalSigns,
    physicalExamination,
    specialInvestigations,
    allergies,
    chronicConditions,
    currentMedications,
  } = v

  let prompt = `You are a clinical assistant. Based on the following information, produce exactly two sections in plain text with these exact headings. Do not add any other sections, disclaimers, or "AI-generated" wording. Treat any "Not recorded" or "None" values as missing information (do not repeat them literally in your summary).

Patient name: ${patientName}

Presenting Complaint: ${orNotRecorded(presentingComplaint)}

List of selected symptoms (from a general health questionnaire):
${symptoms.length > 0 ? symptoms.map((s, i) => `${i + 1}. ${s}`).join("\n") : "None selected"}
`
  if (symptomDetails) {
    prompt += `\nAdditional symptom details (onset, duration, severity, triggers):\n${symptomDetails}\n`
  }

  prompt += `
Onset (duration, severity, character, radiation, aggravating/relieving, red flags, previous episodes, current medication, allergies, chronic conditions): ${orNotRecorded(onset)}

Vital Signs: ${orNotRecorded(vitalSigns)}

Physical Examination: ${orNotRecorded(physicalExamination)}

Special Investigations: ${orNotRecorded(specialInvestigations)}

Patient allergies (from record): ${allergies?.length ? allergies.join(", ") : "Not recorded"}
Patient chronic conditions (from record): ${chronicConditions?.length ? chronicConditions.join(", ") : "Not recorded"}
Patient current medications (from record): ${currentMedications?.length ? currentMedications.join(", ") : "Not recorded"}
`

  prompt += `

Instructions:
1. In CLINICAL SUMMARY, describe the patient presentation, relevant positives and negatives from symptoms, comorbidities, history, vitals, exam, and investigations (2–4 sentences). Treat any "Not recorded" or "None" values as missing; do not list them.
2. In DIAGNOSIS / IMPRESSION, provide a brief differential or working diagnosis, suggest next steps or tests if relevant, and include recommended ICD-10 code(s) where possible for medical aid purposes.
3. Output plain text with exactly these two headings. No preamble, no disclaimers, no "AI-generated" wording.

CLINICAL SUMMARY
[2–4 sentences]

DIAGNOSIS / IMPRESSION
[Working diagnosis, next steps, ICD-10 code(s) if applicable]`
  return prompt
}

export async function POST(request: NextRequest) {
  try {
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured. Add OPENAI_API_KEY to .env.local for the consultation summary feature." },
        { status: 503 }
      )
    }

    const body = await request.json()
    const validated = validateBody(body)
    if (!validated) {
      return NextResponse.json(
        { error: "Invalid request: patientName (string) and symptoms (array of strings) are required." },
        { status: 400 }
      )
    }

    const hasContext =
      validated.symptoms.length > 0 ||
      validated.symptomDetails ||
      validated.presentingComplaint ||
      validated.onset ||
      validated.vitalSigns ||
      validated.physicalExamination ||
      validated.specialInvestigations
    if (!hasContext) {
      return NextResponse.json(
        { error: "At least one of: symptoms, symptomDetails, presentingComplaint, onset, vitalSigns, physicalExamination, or specialInvestigations is required." },
        { status: 400 }
      )
    }

    const prompt = buildPrompt(validated)

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
              "You output only the two requested sections (CLINICAL SUMMARY and DIAGNOSIS / IMPRESSION) in plain text with those exact headings. No preamble, no disclaimers, no 'AI-generated' or similar wording. Treat 'Not recorded' and 'None' as missing information in your summary; do not repeat them literally.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 800,
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error("OpenAI API error:", response.status, errText)
      return NextResponse.json(
        { error: ERROR_MESSAGES.AI_PROCESSING, code: ERROR_CODES.AI_ERROR },
        { status: 503 },
      )
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = data.choices?.[0]?.message?.content?.trim()
    if (!content) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.AI_PROCESSING, code: ERROR_CODES.AI_ERROR },
        { status: 503 },
      )
    }

    // Parse CLINICAL SUMMARY / DIAGNOSIS sections and try to extract an ICD-10 code
    const parsed = parseSummaryAndDiagnosis(content)
    const icd10Code = parseIcd10FromDiagnosis(parsed.diagnosis)

    return NextResponse.json({ summary: content, icd10Code })
  } catch (e) {
    return apiErrorResponse(e, "consultation-summary")
  }
}
