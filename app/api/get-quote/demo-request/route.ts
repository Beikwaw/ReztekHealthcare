import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"

import { demoRequestSchema } from "@/lib/get-quote"
import { getAdminFirestore } from "@/lib/firebase-admin"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const parsed = demoRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid demo request. Please check all fields." }, { status: 400 })
    }

    const input = parsed.data
    const db = await getAdminFirestore()

    await db.collection("demo_requests").add({
      name: input.name,
      email: input.email,
      practiceName: input.practiceName,
      date: input.date,
      time: input.time,
      address: input.address,
      leadId: input.leadId,
      createdAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to submit demo request"
    console.error("[get-quote/demo-request] Error:", msg, e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

