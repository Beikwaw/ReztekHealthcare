import { NextRequest, NextResponse } from "next/server"
import { GENERAL_HEALTH_QUESTIONNAIRE } from "@/lib/general-health-questionnaire"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

type TriageRequestBody = {
  presentingComplaint: string
}

type RawTriageResponse = {
  suggestedCategoryIds?: unknown
  priorityCheckboxIds?: unknown
}

type TriageResult = {
  suggestedCategoryIds: string[]
  priorityCheckboxIds: string[]
}

const TRIAGE_MODEL = "gpt-4o-mini"

const validCategoryIds = new Set(GENERAL_HEALTH_QUESTIONNAIRE.map((c) => c.id))

const checkboxById: Record<
  string,
  { categoryId: string; categoryTitle: string; label: string }
> = (() => {
  const map: Record<string, { categoryId: string; categoryTitle: string; label: string }> = {}
  for (const cat of GENERAL_HEALTH_QUESTIONNAIRE) {
    for (const item of cat.items) {
      if (!map[item.id]) {
        map[item.id] = {
          categoryId: cat.id,
          categoryTitle: cat.title,
          label: item.label,
        }
      }
    }
  }
  return map
})()

function parseBody(body: unknown): TriageRequestBody | null {
  if (!body || typeof body !== "object") return null
  const presentingComplaint = (body as { presentingComplaint?: unknown }).presentingComplaint
  if (typeof presentingComplaint !== "string") return null
  const trimmed = presentingComplaint.trim()
  if (!trimmed) return null
  return { presentingComplaint: trimmed }
}

function coerceStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length > 0)
}

function filterTriageResult(raw: RawTriageResponse): TriageResult {
  const suggestedRaw = coerceStringArray(raw.suggestedCategoryIds)
  const priorityRaw = coerceStringArray(raw.priorityCheckboxIds)

  const uniqueSuggested: string[] = []
  const seenSuggested = new Set<string>()
  for (const id of suggestedRaw) {
    if (!validCategoryIds.has(id)) continue
    if (seenSuggested.has(id)) continue
    seenSuggested.add(id)
    uniqueSuggested.push(id)
  }

  const uniquePriority: string[] = []
  const seenPriority = new Set<string>()
  for (const id of priorityRaw) {
    if (!checkboxById[id]) continue
    if (seenPriority.has(id)) continue
    seenPriority.add(id)
    uniquePriority.push(id)
  }

  return {
    suggestedCategoryIds: uniqueSuggested,
    priorityCheckboxIds: uniquePriority,
  }
}

function buildPrompt(pc: string) {
  const categories = GENERAL_HEALTH_QUESTIONNAIRE.map((cat) => ({
    id: cat.id,
    title: cat.title,
    items: cat.items.map((item) => ({ id: item.id, label: item.label })),
  }))

  return `
You are an experienced general practitioner in South Africa helping triage a patient before a full consultation.

You are given:
- A free-text Presenting Complaint (PC) from the doctor or patient.
- A predefined structured General Health Questionnaire with category IDs and checkbox IDs.

Your job:
1. Choose the most relevant questionnaire category IDs given the PC.
2. Choose up to 10 HIGH-PRIORITY checkbox IDs across all categories which the doctor should consider FIRST.
   - Prioritise clinical urgency (life-threatening / red-flag conditions) and relevance.
   - Order the list from most urgent/important to less urgent.

Important:
- Only use categoryIds and checkboxIds that exist in the provided questionnaire.
- Some checkbox IDs are red flags (e.g. chest pain, blood in stool, severe shortness of breath, neurological deficits).
- You are assisting, not replacing the doctor. When in doubt, include but do not invent IDs.

Presenting Complaint (PC):
${pc}

Questionnaire categories and items:
${JSON.stringify(categories, null, 2)}

Output MUST be STRICT JSON only, with NO extra text, NO comments, and NO markdown. Use this exact shape:
{
  "suggestedCategoryIds": ["cardiovascular", "respiratory"],
  "priorityCheckboxIds": ["chestPain", "shortnessOfBreath", "coughingUpBlood"]
}
If you are unsure, you can return empty arrays, but the JSON shape must still be valid.
`
}

async function callOpenAI(body: TriageRequestBody): Promise<TriageResult | null> {
  if (!OPENAI_API_KEY) {
    return null
  }

  const prompt = buildPrompt(body.presentingComplaint)

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: TRIAGE_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a triage assistant for a South African GP clinic. You must respond with STRICT JSON only, no markdown, no comments, no explanations.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 400,
      temperature: 0.2,
    }),
  })

  if (!response.ok) {
    return null
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = data.choices?.[0]?.message?.content
  if (!content) return null

  let jsonText = content.trim()
  // Best-effort: if the model wrapped JSON in code fences, strip them.
  if (jsonText.startsWith("```")) {
    const firstBrace = jsonText.indexOf("{")
    const lastBrace = jsonText.lastIndexOf("}")
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonText = jsonText.slice(firstBrace, lastBrace + 1)
    }
  }

  try {
    const parsed = JSON.parse(jsonText) as RawTriageResponse
    return filterTriageResult(parsed)
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const validated = parseBody(body)
    if (!validated) {
      return NextResponse.json(
        { error: "presentingComplaint (non-empty string) is required." },
        { status: 400 },
      )
    }

    const result = await callOpenAI(validated)
    if (!result) {
      // Graceful fallback: no AI triage available, caller should show full questionnaire.
      return NextResponse.json(
        { suggestedCategoryIds: [] as string[], priorityCheckboxIds: [] as string[] },
        { status: 200 },
      )
    }

    return NextResponse.json(result)
  } catch {
    // On any unexpected error, fail safely with empty suggestions.
    return NextResponse.json(
      { suggestedCategoryIds: [] as string[], priorityCheckboxIds: [] as string[] },
      { status: 200 },
    )
  }
}

