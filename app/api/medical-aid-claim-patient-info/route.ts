/**
 * GET: Return patient info for a claim (Medical Aid Officer only).
 * Used to enrich claim display with DOB, dependentCode when not on claim.
 */

import { NextRequest, NextResponse } from "next/server"
import { apiErrorResponse } from "@/lib/errors"
import { getFirebaseAdmin } from "@/lib/firebase-admin"

function parseBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization") || request.headers.get("Authorization")
  if (!header) return null
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

export async function GET(request: NextRequest) {
  try {
    const token = parseBearerToken(request)
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = await getFirebaseAdmin()
    const decoded = await admin.auth().verifyIdToken(token)
    const uid = decoded.uid

    const db = admin.firestore()
    const userSnap = await db.collection("users").doc(uid).get()
    const role = userSnap.exists ? (userSnap.data()?.role as string | undefined) : undefined
    if (role !== "medical-aid") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const claimId = request.nextUrl.searchParams.get("claimId")
    if (!claimId) {
      return NextResponse.json({ error: "claimId required" }, { status: 400 })
    }

    const claimSnap = await db.collection("medicalAidClaims").doc(claimId).get()
    if (!claimSnap.exists) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 })
    }

    const claimData = claimSnap.data() as Record<string, unknown>
    const patientId = claimData.patientId as string
    if (!patientId) {
      return NextResponse.json({ error: "Claim has no patientId" }, { status: 400 })
    }

    const patientSnap = await db.collection("patients").doc(patientId).get()
    if (!patientSnap.exists) {
      return NextResponse.json({ dateOfBirth: null, medicalAidInfo: null })
    }

    const patient = patientSnap.data() as Record<string, unknown>
    const dateOfBirth = patient.dateOfBirth
    const medicalAidInfo = patient.medicalAidInfo as Record<string, unknown> | undefined

    const toDate = (v: unknown): string | null => {
      if (!v) return null
      if (v instanceof Date) return v.toISOString().split("T")[0] ?? null
      if (typeof v === "object" && v !== null && "toDate" in v) {
        const d = (v as { toDate: () => Date }).toDate()
        return d instanceof Date ? d.toISOString().split("T")[0] ?? null : null
      }
      if (typeof v === "string") return v.split("T")[0] ?? null
      return null
    }

    return NextResponse.json({
      dateOfBirth: toDate(dateOfBirth),
      dependentCode: medicalAidInfo?.dependentCode ?? null,
      mainMemberName: medicalAidInfo?.mainMemberName ?? medicalAidInfo?.memberName ?? null,
      mainMemberIdNumber: medicalAidInfo?.mainMemberIdNumber ?? null,
      plan: medicalAidInfo?.plan ?? null,
    })
  } catch (e) {
    return apiErrorResponse(e, "medical-aid-claim-patient-info")
  }
}
