import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"

import { ERROR_CODES, ERROR_MESSAGES } from "@/lib/error-messages"
import { apiErrorResponse, logZodSafeParseFailure } from "@/lib/errors"
import { demoRequestSchema } from "@/lib/get-quote"
import { getAdminFirestore } from "@/lib/firebase-admin"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const parsed = demoRequestSchema.safeParse(body)
    if (!parsed.success) {
      logZodSafeParseFailure(parsed.error, "get-quote/demo-request")
      return NextResponse.json(
        { error: ERROR_MESSAGES.VALIDATION_INPUT, code: ERROR_CODES.VALIDATION_ERROR },
        { status: 400 },
      )
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
    return apiErrorResponse(e, "get-quote/demo-request")
  }
}

