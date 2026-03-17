import { NextRequest, NextResponse } from "next/server"
import { getFirebaseAdmin } from "@/lib/firebase-admin"
import { getPrescriptionPdfBuffer, type PatientDetailForPdf } from "@/lib/consultation-summary-pdf"
import { getPatientStoragePath } from "@/lib/utils"

const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const consultationId = body?.consultationId
    const storeOnly = body?.store === true
    if (!consultationId || typeof consultationId !== "string") {
      return NextResponse.json({ error: "consultationId required" }, { status: 400 })
    }

    const admin = await getFirebaseAdmin()
    const db = admin.firestore()

    const consultationSnap = await db.collection("consultations").doc(consultationId).get()
    if (!consultationSnap.exists) {
      return NextResponse.json({ error: "Consultation not found" }, { status: 404 })
    }
    const consultation = consultationSnap.data() as Record<string, unknown>

    const patientId = consultation.patientId as string
    const patientSnap = await db.collection("patients").doc(patientId).get()
    const patient = patientSnap.exists ? (patientSnap.data() as Record<string, unknown>) : null

    const patientName = (patient?.name as string) || (consultation.patientName as string) || "Patient"
    const createdAt = consultation.createdAt
    const date =
      createdAt && typeof (createdAt as { toDate?: () => Date }).toDate === "function"
        ? (createdAt as { toDate: () => Date }).toDate()
        : createdAt
          ? new Date(createdAt as string | number)
          : new Date()

    const patientForPdf: PatientDetailForPdf = {
      name: patientName,
      phone: patient?.phone as string | undefined,
      email: patient?.email as string | undefined,
      address: patient?.address as string | undefined,
      dateOfBirth: patient?.dateOfBirth as Date | string | undefined,
      patientNumber: patient?.patientNumber as string | undefined,
      doctorName: (consultation.doctorName as string) || "Reztek Healthcare Practice",
    }

    const scriptTextFromConsultation = (consultation.scriptText as string) || ""
    const structuredItems = Array.isArray(consultation.prescription)
      ? (consultation.prescription as { medication?: string; dosage?: string; frequency?: string; duration?: string; instructions?: string }[])
      : []

    const scriptFromItems =
      structuredItems.length > 0
        ? structuredItems
            .map((item, index) => {
              const med = item.medication || "Medicine"
              const dosage = item.dosage || ""
              const freq = item.frequency ? `, ${item.frequency}` : ""
              const duration = item.duration ? ` for ${item.duration}` : ""
              const instructions = item.instructions ? ` – ${item.instructions}` : ""
              return `${index + 1}. ${med} ${dosage}${freq}${duration}${instructions}`.trim()
            })
            .join("\n")
        : ""

    const combinedScriptText =
      scriptTextFromConsultation.trim() || scriptFromItems || "Prescription as discussed during consultation."

    const buffer = await getPrescriptionPdfBuffer(patientForPdf, combinedScriptText, date)
    const pdfBuffer = Buffer.from(buffer)

    if (storeOnly) {
      if (!storageBucket && !projectId) {
        return NextResponse.json(
          { error: "Firebase storage not configured. Set NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET in .env.local" },
          { status: 503 }
        )
      }

      const admin = await getFirebaseAdmin()
      const bucketName = storageBucket || `${projectId}.appspot.com`
      const bucket = admin.storage().bucket(bucketName)
      const { folder } = getPatientStoragePath(patientName, date)
      const filePath = `${folder}/prescription.pdf`
      const file = bucket.file(filePath)
      await file.save(pdfBuffer, {
        contentType: "application/pdf",
        metadata: { cacheControl: "private, max-age=31536000" },
      })

      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
      const [signedUrl] = await file.getSignedUrl({
        version: "v4",
        action: "read",
        expires: Date.now() + sevenDaysMs,
      })

      return NextResponse.json({ url: signedUrl })
    }

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="prescription-${consultationId}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to generate prescription PDF"
    console.error("[prescription-pdf] Error:", msg, e)
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    )
  }
}

