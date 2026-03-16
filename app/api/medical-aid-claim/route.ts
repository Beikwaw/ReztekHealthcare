/**
 * POST: Create a medical aid claim for a consultation (medical-aid patients only),
 * generate claim PDF, upload to Storage, and return claim id and PDF URL.
 */

import { NextRequest, NextResponse } from "next/server"
import { Timestamp } from "firebase-admin/firestore"
import { getAdminFirestore, getFirebaseAdmin } from "@/lib/firebase-admin"
import { parseSummaryAndDiagnosis } from "@/lib/consultation-summary-pdf"
import { getMedicalAidConsultationPdfBuffer } from "@/lib/medical-aid-consultation-pdf"
import { buildMedicalAidClaimXml } from "@/lib/medical-aid-claim-xml"
import type { MedicalAidClaim } from "@/lib/types"

const PRACTICE_NUMBER = "1557149"
const DOCTOR_HPCSA = "DR WC MKHONZA, PR NO: 1557149"
const CONSULTATION_TYPE = "GP Outpatient Consultation"

const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

function isMedicalAidPatient(patient: Record<string, unknown>): boolean {
  if (patient.paymentMethod === "medical-aid") return true
  const medicalAidInfo = patient.medicalAidInfo as Record<string, unknown> | undefined
  if (medicalAidInfo?.name || medicalAidInfo?.memberNumber) return true
  const insuranceInfo = patient.insuranceInfo as Record<string, unknown> | undefined
  if (insuranceInfo?.provider) return true
  return false
}

/** Extract first ICD-10-like code from text (e.g. "ICD-10: J06.9" or "J06.9" or "(J06.9)") */
function parseIcd10FromDiagnosis(diagnosis: string | undefined): string {
  if (!diagnosis || !diagnosis.trim()) return ""
  const icd10Match = diagnosis.match(/(?:ICD-10|ICD10)\s*:?\s*([A-Z]\d{2}(?:\.\d{1,2})?)/i)
    || diagnosis.match(/\b([A-Z]\d{2}(?:\.\d{1,2})?)\b/)
  return icd10Match ? icd10Match[1].trim() : ""
}

/** First 5-6 lines of text as short summary */
function toShortSummary(text: string | undefined, maxLines = 6): string {
  if (!text || !text.trim()) return ""
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  return lines.slice(0, maxLines).join("\n")
}

async function getConsultationAndPatient(consultationId: string) {
  const db = await getAdminFirestore()
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
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 })
    }

    if (!isMedicalAidPatient(patient)) {
      return NextResponse.json(
        { error: "Patient is not a medical aid patient. Claims are only for medical aid/insurance patients." },
        { status: 400 }
      )
    }

    const db = await getAdminFirestore()

    // Invoice for bill amount
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
    const billInvoiceId = typeof invoice?.id === "string" ? (invoice.id as string) : null
    const billAmount = typeof invoice?.total === "number" ? Number(invoice.total) : 0

    const consultationCreatedAt = consultation.createdAt
    const consultationDate =
      consultationCreatedAt && typeof (consultationCreatedAt as { toDate?: () => Date }).toDate === "function"
        ? (consultationCreatedAt as { toDate: () => Date }).toDate()
        : consultationCreatedAt
          ? new Date(consultationCreatedAt as string | number)
          : new Date()

    const clinicalSummaryFull =
      (consultation.clinicalSummary as string) ||
      (consultation.aiSummary
        ? parseSummaryAndDiagnosis(consultation.aiSummary as string).clinicalSummary
        : "")
    const icd10FromConsultation = (consultation.icd10Code as string) || parseIcd10FromDiagnosis(consultation.diagnosis as string)
    const icd10Code = (body.icd10Code as string)?.trim() || icd10FromConsultation
    const clinicalSummaryShort = (body.clinicalSummaryShort as string)?.trim() || toShortSummary(clinicalSummaryFull)
    const createdBy = (body.createdBy as string) || (consultation.doctorId as string) || ""
    const createdByName = (body.createdByName as string) || (consultation.doctorName as string) || "DR WC MKHONZA"

    const patientName = (patient.name as string) || (consultation.patientName as string) || "Patient"
    const nameParts = (patientName || "").trim().split(/\s+/)
    const firstName = nameParts[0] || "Patient"
    const lastName = nameParts.slice(1).join(" ") || "Unknown"
    const medicalAidInfo = patient.medicalAidInfo as Record<string, unknown> | undefined
    const insuranceInfo = patient.insuranceInfo as Record<string, unknown> | undefined
    const schemeName = (medicalAidInfo?.name as string) || (insuranceInfo?.provider as string) || "—"
    const membershipNumber = (medicalAidInfo?.memberNumber as string) || (insuranceInfo?.policyNumber as string) || "—"

    // Structured consultation-form fields from body (optional)
    const diagnosisLinesRaw = Array.isArray(body.diagnosisLines) ? body.diagnosisLines : []
    const diagnosisLines = diagnosisLinesRaw
      .map((d: unknown) => {
        const obj = d as { line?: unknown; icd10?: unknown }
        const line = typeof obj.line === "string" ? obj.line.trim() : ""
        const icd = typeof obj.icd10 === "string" ? obj.icd10.trim() : ""
        if (!line && !icd) return null

        // Do NOT send undefined values to Firestore; omit icd10 when empty
        return icd
          ? { line, icd10: icd }
          : { line }
      })
      .filter(Boolean)
      .slice(0, 4) as { line: string; icd10?: string }[]

    const injectionsText =
      typeof body.injectionsText === "string" ? body.injectionsText.trim() : ""
    const proceduresText =
      typeof body.proceduresText === "string" ? body.proceduresText.trim() : ""

    const materialsRaw = (body.materials ?? {}) as {
      syringeNeedle?: unknown
      swab?: unknown
      glove?: unknown
      bandage?: unknown
      other?: unknown
    }
    const materialsCandidate = {
      syringeNeedle:
        typeof materialsRaw.syringeNeedle === "string"
          ? materialsRaw.syringeNeedle.trim()
          : "",
      swab:
        typeof materialsRaw.swab === "string" ? materialsRaw.swab.trim() : "",
      glove:
        typeof materialsRaw.glove === "string" ? materialsRaw.glove.trim() : "",
      bandage:
        typeof materialsRaw.bandage === "string"
          ? materialsRaw.bandage.trim()
          : "",
      other:
        typeof materialsRaw.other === "string" ? materialsRaw.other.trim() : "",
    }
    const materialEntries = Object.entries(materialsCandidate).filter(
      ([, value]) => Boolean(value),
    )
    const materials =
      materialEntries.length > 0
        ? (Object.fromEntries(materialEntries) as {
            syringeNeedle?: string
            swab?: string
            glove?: string
            bandage?: string
            other?: string
          })
        : null

    const medicationsRaw = Array.isArray(body.medications) ? body.medications : []
    const medications = medicationsRaw
      .map((m: unknown) => {
        const obj = m as {
          name?: unknown
          quantity?: unknown
          duration?: unknown
          dosage?: unknown
          instructions?: unknown
        }
        const name = typeof obj.name === "string" ? obj.name.trim() : ""
        if (!name) return null
        return {
          name,
          quantity:
            typeof obj.quantity === "string" ? obj.quantity.trim() || undefined : undefined,
          duration:
            typeof obj.duration === "string" ? obj.duration.trim() || undefined : undefined,
          dosage:
            typeof obj.dosage === "string" ? obj.dosage.trim() || undefined : undefined,
          instructions:
            typeof obj.instructions === "string"
              ? obj.instructions.trim() || undefined
              : undefined,
        }
      })
      .filter(Boolean) as {
      name: string
      quantity?: string
      duration?: string
      dosage?: string
      instructions?: string
    }[]

    const mainMemberFullName =
      (medicalAidInfo?.mainMemberName as string) ||
      (medicalAidInfo?.memberName as string) ||
      patientName
    const mainMemberSurname =
      (patient.accountResponsible as { surname?: string } | undefined)?.surname ||
      lastName

    const claimData = {
      patientId: consultation.patientId,
      consultationId: consultation.id,
      patientName,
      firstName,
      lastName,
      idNumber: (patient.idNumber as string) || (patient.passportNumber as string) || "",
      practiceNumber: PRACTICE_NUMBER,
      doctorHpcsaNumber: DOCTOR_HPCSA,
      schemeName,
      membershipNumber,
      consultationDate: Timestamp.fromDate(consultationDate),
      dateOfService: Timestamp.fromDate(consultationDate),
      billAmount,
      totalAmountClaimed: billAmount,
      icd10Code: icd10Code || "—",
      clinicalSummaryShort: clinicalSummaryShort || "—",
      servicesRendered: CONSULTATION_TYPE,
      createdBy,
      createdByName,
      createdAt: Timestamp.now(),
      // New outcome-related fields (defaulted for newly created claims)
      // Claims start as DRAFT and are only marked SUBMITTED when explicitly sent
      status: "DRAFT",
      paidAmount: null,
      shortfallAmount: null,
      shortfallInvoiceId: null,
      outcomeRecordedAt: null,
      outcomeRecordedBy: null,
      patientEmail: (patient.email as string) || (consultation.patientEmail as string) || null,

      // Structured consultation-form fields
      mainMemberFullName,
      mainMemberSurname,
      mainMemberSex: (patient.gender as string | undefined) ?? undefined,
      mainMemberIdNumber:
        (medicalAidInfo?.mainMemberIdNumber as string | undefined) ??
        ((patient.idNumber as string | undefined) ?? undefined),
      mainMemberTel:
        (medicalAidInfo?.cell as string | undefined) ??
        ((patient.phone as string | undefined) ?? undefined),
      mainMemberAddress: (patient.address as string | undefined) ?? undefined,
      mainMemberEmail: (patient.email as string | undefined) ?? undefined,
      diagnosisLines,
      injectionsText: injectionsText || null,
      proceduresText: proceduresText || null,
      materials,
      medications,
      billInvoiceId,
    }

    // If we have a linked invoice for this medical-aid patient, ensure its status reflects that the claim was sent.
    if (billInvoiceId) {
      const currentStatus = invoice?.status as string | undefined
      if (currentStatus !== "paid" && currentStatus !== "cancelled") {
        await db.collection("invoices").doc(billInvoiceId).update({
          status: "sent",
          paymentMethod: "medical-aid",
        })
      }
    }

    const claimRef = await db.collection("medicalAidClaims").add(claimData)
    const claimId = claimRef.id

    const pdfPayload = {
      mainMemberFullName,
      mainMemberSurname,
      mainMemberSex: claimData.mainMemberSex,
      mainMemberIdNumber: claimData.mainMemberIdNumber,
      mainMemberTel: claimData.mainMemberTel,
      mainMemberAddress: claimData.mainMemberAddress,
      mainMemberEmail: claimData.mainMemberEmail,
      schemeName,
      membershipNumber,
      patientFullName: patientName,
      patientDateOfBirth: (patient.dateOfBirth as Date | undefined) ?? undefined,
      patientSex: patient.gender as string | undefined,
      consultationDate,
      diagnoses:
        diagnosisLines.length > 0
          ? diagnosisLines
          : [
              {
                line: clinicalSummaryShort || "",
                icd10: icd10Code || undefined,
              },
            ],
      injectionsText,
      proceduresText,
      materials: materials ?? {},
      medications,
    }

    const buffer = await getMedicalAidConsultationPdfBuffer(pdfPayload)
    const pdfBuffer = Buffer.from(buffer)

    const bucketName = storageBucket || `${projectId}.appspot.com`
    const admin = await getFirebaseAdmin()
    const bucket = admin.storage().bucket(bucketName)
    const patientId = consultation.patientId as string

    // Label files by patient name, ID and timestamp for storage and dashboard
    const safeName = `${firstName}_${lastName}`.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "")
    const safeId = (claimData.idNumber || "unknown").replace(/\D/g, "").slice(0, 13) || "unknown"
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
    const fileBase = `${safeName}_${safeId}_${timestamp}`

    const pdfPath = `patients/${patientId}/medical-aid-claims/${fileBase}.pdf`
    const pdfFile = bucket.file(pdfPath)
    await pdfFile.save(pdfBuffer, {
      contentType: "application/pdf",
      metadata: { cacheControl: "private, max-age=31536000" },
    })

    // Save full structured XML (same format as officer export) so the file exists from creation
    const toDate = (v: unknown): Date => {
      if (v instanceof Date) return v
      if (v && typeof v === "object" && "toDate" in v && typeof (v as { toDate: () => Date }).toDate === "function") {
        return (v as { toDate: () => Date }).toDate()
      }
      return new Date()
    }
    const claimForXml: MedicalAidClaim = {
      id: claimId,
      patientId,
      consultationId: consultation.id as string,
      patientName,
      firstName,
      lastName,
      idNumber: (claimData.idNumber as string) ?? "",
      practiceNumber: PRACTICE_NUMBER,
      doctorHpcsaNumber: DOCTOR_HPCSA,
      schemeName,
      membershipNumber,
      consultationDate: toDate(claimData.consultationDate) ?? consultationDate,
      dateOfService: toDate(claimData.dateOfService) ?? consultationDate,
      billAmount,
      totalAmountClaimed: billAmount,
      icd10Code: icd10Code || "—",
      clinicalSummaryShort: clinicalSummaryShort || "—",
      servicesRendered: CONSULTATION_TYPE,
      createdAt: new Date(),
      createdBy: createdBy as string,
      createdByName: createdByName as string,
      diagnosisLines: diagnosisLines.length > 0 ? diagnosisLines : undefined,
      proceduresText: proceduresText || undefined,
      billItems: undefined,
    }
    const xml = buildMedicalAidClaimXml(claimForXml)

    const xmlPath = `patients/${patientId}/medical-aid-claims/${fileBase}.xml`
    const xmlFile = bucket.file(xmlPath)
    await xmlFile.save(Buffer.from(xml, "utf-8"), {
      contentType: "application/xml",
      metadata: { cacheControl: "private, max-age=31536000" },
    })

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
    const [signedPdfUrl] = await pdfFile.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + sevenDaysMs,
    })

    const [signedXmlUrl] = await xmlFile.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + sevenDaysMs,
    })

    await claimRef.update({
      pdfStorageUrl: signedPdfUrl,
      xmlStorageUrl: signedXmlUrl,
      storagePathPdf: pdfPath,
      storagePathXml: xmlPath,
      fileLabel: `${fileBase}.pdf`,
    })

    return NextResponse.json({ claimId, url: signedPdfUrl, xmlUrl: signedXmlUrl })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create medical aid claim"
    console.error("[medical-aid-claim] Error:", msg, e)
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    )
  }
}
