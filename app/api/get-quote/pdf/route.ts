import { NextRequest, NextResponse } from "next/server"
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
      return NextResponse.json({ error: "Lead data is invalid" }, { status: 500 })
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
    const msg = e instanceof Error ? e.message : "Failed to generate PDF"
    console.error("[get-quote/pdf] Error:", msg, e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

