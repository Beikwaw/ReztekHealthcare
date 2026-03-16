import { NextRequest, NextResponse } from "next/server"
import { getFirebaseAdmin } from "@/lib/firebase-admin"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const { claimId } = (await request.json().catch(() => ({}))) as { claimId?: string }
    if (!claimId) {
      return NextResponse.json({ error: "Missing claimId" }, { status: 400 })
    }

    const admin = await getFirebaseAdmin()
    const db = admin.firestore()

    const docRef = db.collection("medicalAidClaims").doc(claimId)
    const snap = await docRef.get()
    if (!snap.exists) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 })
    }

    await docRef.update({
      status: "SUBMITTED",
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to submit medical aid claim"
    console.error("[medical-aid-claim-submit] Error:", msg, e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

