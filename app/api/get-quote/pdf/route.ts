import { NextRequest, NextResponse } from "next/server"
import { ERROR_CODES, ERROR_MESSAGES } from "@/lib/error-messages"
import { apiErrorResponse, logZodSafeParseFailure } from "@/lib/errors"
import { getAdminFirestore } from "@/lib/firebase-admin"
import { getQuotePdfBuffer } from "@/lib/get-quote-pdf-server"
import { doctorLeadStoredSchema } from "@/lib/get-quote"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const leadId = (searchParams.get("leadId") || "").trim()
    if (!leadId) {
      return NextResponse.json({ error: "leadId is required" }, { status: 400 })
    }

    const db = await getAdminFirestore()
    const snap = await db.collection("doctor_leads").doc(leadId).get()
    if (!snap.exists) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    const raw = snap.data() as Record<string, unknown>
    const parsed = doctorLeadStoredSchema.safeParse(raw)
    if (!parsed.success) {
      logZodSafeParseFailure(parsed.error, "get-quote/pdf")
      return NextResponse.json(
        { error: ERROR_MESSAGES.VALIDATION_INPUT, code: ERROR_CODES.VALIDATION_ERROR },
        { status: 400 },
      )
    }

    const lead = { id: snap.id, ...parsed.data }
    const pdfArrayBuffer = await getQuotePdfBuffer(lead)
    const pdfBuffer = Buffer.from(pdfArrayBuffer)

    const filename = `reztek-quote-${leadId}.pdf`
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, max-age=0, no-store",
      },
    })
  } catch (e) {
    return apiErrorResponse(e, "get-quote/pdf")
  }
}

