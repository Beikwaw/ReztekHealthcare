import { NextRequest, NextResponse } from "next/server"
import { getFirebaseAdmin } from "@/lib/firebase-admin"

const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

export async function POST(request: NextRequest) {
  try {
    if (!storageBucket && !projectId) {
      return NextResponse.json(
        { error: "Firebase storage not configured. Set NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET in .env.local" },
        { status: 503 },
      )
    }

    const body = await request.json()
    const claimId = body?.claimId as string | undefined
    const type = (body?.type as "pdf" | "xml" | undefined) ?? "pdf"

    if (!claimId) {
      return NextResponse.json({ error: "claimId required" }, { status: 400 })
    }

    const admin = await getFirebaseAdmin()
    const db = admin.firestore()

    const claimSnap = await db.collection("medicalAidClaims").doc(claimId).get()
    if (!claimSnap.exists) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 })
    }

    const data = claimSnap.data() as {
      patientId?: string
      storagePathPdf?: string
      storagePathXml?: string
    }

    const patientId = data.patientId
    if (!patientId) {
      return NextResponse.json({ error: "Claim is missing patientId" }, { status: 400 })
    }

    let storagePath: string
    if (type === "xml") {
      storagePath =
        (data.storagePathXml as string | undefined) ??
        `patients/${patientId}/claims/claim-${claimId}.xml`
    } else {
      storagePath =
        (data.storagePathPdf as string | undefined) ??
        `patients/${patientId}/claims/claim-${claimId}.pdf`
    }

    const bucketName = storageBucket || `${projectId}.appspot.com`
    const bucket = admin.storage().bucket(bucketName)
    const file = bucket.file(storagePath)

    const [exists] = await file.exists()
    if (!exists) {
      return NextResponse.json({ error: "File not found in storage" }, { status: 404 })
    }

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
    const [signedUrl] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + sevenDaysMs,
    })

    return NextResponse.json({ url: signedUrl })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to generate claim URL"
    console.error("[medical-aid-claim-url] Error:", msg, e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

