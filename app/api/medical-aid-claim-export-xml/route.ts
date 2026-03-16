/**
 * POST: Export medical aid claim as XML (Medical Aid Officer only).
 * Generates structured XML, uploads to Storage, marks claim as completed.
 */

import { NextRequest, NextResponse } from "next/server"
import { Timestamp } from "firebase-admin/firestore"
import { getFirebaseAdmin } from "@/lib/firebase-admin"
import { buildMedicalAidClaimXml } from "@/lib/medical-aid-claim-xml"
import type { MedicalAidClaim } from "@/lib/types"

function parseBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization") || request.headers.get("Authorization")
  if (!header) return null
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

function toSafeJsDate(value: unknown): Date | undefined {
  if (!value) return undefined
  if (value instanceof Date) return value
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    const d = (value as { toDate: () => Date }).toDate()
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : undefined
  }
  const d = new Date(value as string)
  return Number.isNaN(d.getTime()) ? undefined : d
}

export async function POST(request: NextRequest) {
  try {
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    if (!storageBucket && !projectId) {
      return NextResponse.json(
        { error: "Firebase storage not configured" },
        { status: 503 }
      )
    }

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

    const body = await request.json().catch(() => ({}))
    const claimId = body?.claimId as string | undefined

    if (!claimId || typeof claimId !== "string") {
      return NextResponse.json({ error: "claimId required" }, { status: 400 })
    }

    const claimRef = db.collection("medicalAidClaims").doc(claimId)
    const claimSnap = await claimRef.get()
    if (!claimSnap.exists) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 })
    }

    const raw = claimSnap.data() as Record<string, unknown>
    const patientId = raw.patientId as string

    // Fetch patient to enrich claim with DOB, dependentCode, etc. if missing
    let patientData: Record<string, unknown> | null = null
    const patientSnap = await db.collection("patients").doc(patientId).get()
    if (patientSnap.exists) {
      patientData = patientSnap.data() as Record<string, unknown>
    }
    const medicalAidInfo = patientData?.medicalAidInfo as Record<string, unknown> | undefined

    const claim: MedicalAidClaim = {
      id: claimSnap.id,
      patientId,
      consultationId: raw.consultationId as string,
      patientName: raw.patientName as string,
      firstName: raw.firstName as string,
      lastName: raw.lastName as string,
      idNumber: raw.idNumber as string | undefined,
      practiceNumber: raw.practiceNumber as string,
      doctorHpcsaNumber: raw.doctorHpcsaNumber as string,
      schemeName: raw.schemeName as string,
      membershipNumber: raw.membershipNumber as string,
      consultationDate: toSafeJsDate(raw.consultationDate) ?? new Date(),
      dateOfService: toSafeJsDate(raw.dateOfService) ?? new Date(),
      billAmount: Number(raw.billAmount ?? raw.totalAmountClaimed ?? 0),
      totalAmountClaimed: Number(raw.totalAmountClaimed ?? raw.billAmount ?? 0),
      icd10Code: (raw.icd10Code as string) ?? "",
      clinicalSummaryShort: (raw.clinicalSummaryShort as string) ?? "",
      servicesRendered: (raw.servicesRendered as string) ?? "",
      createdAt: toSafeJsDate(raw.createdAt) ?? new Date(),
      createdBy: raw.createdBy as string,
      createdByName: raw.createdByName as string | undefined,
      patientEmail: raw.patientEmail as string | null | undefined,
      status: raw.status as MedicalAidClaim["status"],
      paidAmount: raw.paidAmount as number | null | undefined,
      shortfallAmount: raw.shortfallAmount as number | null | undefined,
      shortfallInvoiceId: raw.shortfallInvoiceId as string | null | undefined,
      outcomeRecordedAt: raw.outcomeRecordedAt as Date | null | undefined,
      outcomeRecordedBy: raw.outcomeRecordedBy as string | null | undefined,
      pdfStorageUrl: raw.pdfStorageUrl as string | undefined,
      xmlStorageUrl: raw.xmlStorageUrl as string | undefined,
      storagePathPdf: raw.storagePathPdf as string | undefined,
      storagePathXml: raw.storagePathXml as string | undefined,
      fileLabel: raw.fileLabel as string | undefined,
      mainMemberFullName: raw.mainMemberFullName as string | undefined,
      mainMemberSurname: raw.mainMemberSurname as string | undefined,
      mainMemberSex: raw.mainMemberSex as string | undefined,
      mainMemberIdNumber: raw.mainMemberIdNumber as string | undefined,
      mainMemberTel: raw.mainMemberTel as string | undefined,
      mainMemberAddress: raw.mainMemberAddress as string | undefined,
      mainMemberEmail: raw.mainMemberEmail as string | undefined,
      patientDateOfBirth:
        toSafeJsDate(raw.patientDateOfBirth) ?? toSafeJsDate(patientData?.dateOfBirth),
      patientSex: raw.patientSex as string | undefined,
      diagnosisLines: raw.diagnosisLines as MedicalAidClaim["diagnosisLines"],
      injectionsText: raw.injectionsText as string | undefined,
      proceduresText: raw.proceduresText as string | undefined,
      procedureCode: raw.procedureCode as string | null | undefined,
      materials: raw.materials as MedicalAidClaim["materials"],
      medications: raw.medications as MedicalAidClaim["medications"],
      billInvoiceId: raw.billInvoiceId as string | null | undefined,
      billItems: raw.billItems as MedicalAidClaim["billItems"],
      xmlExportedAt: raw.xmlExportedAt as Date | null | undefined,
    }

    // Enrich with patient medicalAidInfo for dependentCode, plan if missing
    const enrichedClaim = { ...claim } as MedicalAidClaim & { dependentCode?: string; plan?: string }
    if (medicalAidInfo) {
      if (!enrichedClaim.dependentCode) enrichedClaim.dependentCode = medicalAidInfo.dependentCode as string
      if (!enrichedClaim.plan) enrichedClaim.plan = medicalAidInfo.plan as string
    }

    const xml = buildMedicalAidClaimXml(enrichedClaim)

    const bucketName = storageBucket || `${projectId}.appspot.com`
    const bucket = admin.storage().bucket(bucketName)
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
    const xmlPath = `patients/${patientId}/medical-aid-claims/${claimId}_export_${timestamp}.xml`
    const xmlFile = bucket.file(xmlPath)
    await xmlFile.save(Buffer.from(xml, "utf-8"), {
      contentType: "application/xml",
      metadata: { cacheControl: "private, max-age=31536000" },
    })

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
    const [signedXmlUrl] = await xmlFile.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + sevenDaysMs,
    })

    await claimRef.update({
      xmlStorageUrl: signedXmlUrl,
      storagePathXml: xmlPath,
      fileLabel: `${claimId}_export_${timestamp}.xml`,
      xmlExportedAt: Timestamp.now(),
    })

    return NextResponse.json({ url: signedXmlUrl, claimId })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to export XML"
    console.error("[medical-aid-claim-export-xml] Error:", msg, e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
