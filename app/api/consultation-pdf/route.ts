/**
 * POST: Generate consultation summary PDF and upload to Firebase Storage.
 * Uses NEXT_PUBLIC_FIREBASE_* and FIREBASE_SERVICE_ACCOUNT_JSON (Vercel) or firebase-service-account.json (local).
 * Returns { url } for the stored PDF.
 */

import { NextRequest, NextResponse } from "next/server"
import { apiErrorResponse } from "@/lib/errors"
import { getFirebaseAdmin } from "@/lib/firebase-admin"
import { getConsultationPdfBuffer } from "@/lib/consultation-summary-pdf"
import type { PatientDetailForPdf, BillItemForPdf, ConsultationExtraForPdf } from "@/lib/consultation-summary-pdf"
import { getPatientStoragePath } from "@/lib/utils"

const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

async function getConsultationAndPatient(consultationId: string) {
  const admin = await getFirebaseAdmin()
  const db = admin.firestore()
  const consultationSnap = await db.collection("consultations").doc(consultationId).get()
  if (!consultationSnap.exists) return null
  const consultation = { id: consultationSnap.id, ...consultationSnap.data() } as Record<string, unknown>
  const patientId = consultation.patientId as string
  const patientSnap = await db.collection("patients").doc(patientId).get()
  const patient = patientSnap.exists
    ? { id: patientSnap.id, ...patientSnap.data() } as Record<string, unknown>
    : null
  return { consultation, patient }
}

export async function POST(request: NextRequest) {
  try {
    if (!storageBucket && !projectId) {
      return NextResponse.json(
        { error: "Firebase storage not configured. Set NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET in .env.local" },
        { status: 503 }
      )
    }

    const body = await request.json()
    const consultationId = body?.consultationId
    if (!consultationId || typeof consultationId !== "string") {
      return NextResponse.json({ error: "consultationId required" }, { status: 400 })
    }

    const data = await getConsultationAndPatient(consultationId)
    if (!data) {
      return NextResponse.json({ error: "Consultation not found" }, { status: 404 })
    }

    const { consultation, patient } = data
    const patientName = (patient?.name as string) || (consultation.patientName as string) || "Patient"
    const clinicalSummary =
      (consultation.clinicalSummary as string) ||
      (consultation.aiSummary
        ? (await import("@/lib/consultation-summary-pdf")).parseSummaryAndDiagnosis(consultation.aiSummary as string).clinicalSummary
        : "")
    const diagnosis =
      (consultation.diagnosis as string) ||
      (consultation.aiSummary
        ? (await import("@/lib/consultation-summary-pdf")).parseSummaryAndDiagnosis(consultation.aiSummary as string).diagnosis
        : "")

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
      doctorName: (consultation.doctorName as string) || "DR WC MKHONZA",
    }

    // Bill amount from clerk dashboard: find invoice for this patient + appointment
    let billItems: BillItemForPdf[] | undefined
    const admin = await getFirebaseAdmin()
    const db = admin.firestore()
    const invoicesSnap = await db
      .collection("invoices")
      .where("patientId", "==", consultation.patientId)
      .get()
    const appointmentId = consultation.appointmentId as string | undefined
    const invoices = invoicesSnap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown>))
      .filter((inv) => !appointmentId || inv.appointmentId === appointmentId)
      .sort((a, b) => {
        const aAt = (a.createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date(0)
        const bAt = (b.createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date(0)
        return bAt.getTime() - aAt.getTime()
      })
    const invoice = invoices[0]
    if (invoice?.items && Array.isArray(invoice.items) && invoice.items.length > 0) {
      billItems = (invoice.items as { description?: string; total?: number }[]).map((item) => ({
        description: item.description ?? "Item",
        amount: Number(item.total) || 0,
      }))
    } else if (invoice && typeof (invoice.total as number) === "number") {
      billItems = [{ description: "Consultation (billed)", amount: Number(invoice.total) }]
    }

    const extra: ConsultationExtraForPdf | undefined =
      consultation.presentingComplaint ||
      consultation.onset ||
      consultation.vitalSigns ||
      consultation.physicalExamination ||
      consultation.specialInvestigations
        ? {
            presentingComplaint: consultation.presentingComplaint as string | undefined,
            onset: consultation.onset as string | undefined,
            vitalSigns: consultation.vitalSigns as string | undefined,
            physicalExamination: consultation.physicalExamination as string | undefined,
            specialInvestigations: consultation.specialInvestigations as string | undefined,
          }
        : undefined

    const buffer = await getConsultationPdfBuffer(patientForPdf, clinicalSummary, diagnosis, date, billItems, extra)
    const pdfBuffer = Buffer.from(buffer)

    const bucketName = storageBucket || `${projectId}.appspot.com`
    const bucket = admin.storage().bucket(bucketName)
    const { folder } = getPatientStoragePath(patientName, date)
    const filePath = `${folder}/consultation-summary.pdf`
    const file = bucket.file(filePath)
    await file.save(pdfBuffer, {
      contentType: "application/pdf",
      metadata: { cacheControl: "private, max-age=31536000" },
    })

    // Max allowed expiration for signed URLs is 7 days (604800 seconds)
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
    const [signedUrl] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + sevenDaysMs,
    })

    await db.collection("consultations").doc(consultationId).update({
      pdfStorageUrl: signedUrl,
      updatedAt: admin.firestore.Timestamp.now(),
    })

    return NextResponse.json({ url: signedUrl })
  } catch (e) {
    return apiErrorResponse(e, "consultation-pdf")
  }
}
