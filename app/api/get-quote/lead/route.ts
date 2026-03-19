import { NextRequest, NextResponse } from "next/server"
import { getAdminFirestore } from "@/lib/firebase-admin"

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

    const data = snap.data() as Record<string, unknown>
    return NextResponse.json({
      lead: {
        id: snap.id,
        name: String(data.name || ""),
        email: String(data.email || ""),
        phone: String(data.phone || ""),
        practiceName: String(data.practiceName || ""),
        location: String(data.location || ""),
        practiceCountry: String(data.practiceCountry || "South Africa"),
        practiceProvince: String(data.practiceProvince || ""),
        practiceType: String(data.practiceType || "GP"),
        specialization: String(data.specialization || ""),
        doctors: Number(data.doctors || 0),
        staff: Number(data.staff || 0),
        patientsPerDay: Number(data.patientsPerDay || 0),
        averageConsultationMinutes: Number(data.averageConsultationMinutes || 20),
        yearsInOperation: Number(data.yearsInOperation || 0),
        hasSystem: String(data.hasSystem || "No"),
        currentSystem: String(data.currentSystem || ""),
        additionalNotes: String(data.additionalNotes || ""),
        aiSummary: typeof data.aiSummary === "string" ? data.aiSummary : undefined,
        createdAt: data.createdAt,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load lead"
    console.error("[get-quote/lead] Error:", msg, e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

