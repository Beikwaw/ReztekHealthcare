import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { apiErrorResponse } from "@/lib/errors"
import { getAdminAuth, getAdminFirestore, getAdminStorage } from "@/lib/firebase-admin"

export const runtime = "nodejs"

const COLLECTIONS = {
  USERS: "users",
  PATIENTS: "patients",
  APPOINTMENTS: "appointments",
  INVOICES: "invoices",
  CONSULTATIONS: "consultations",
  MEDICAL_RECORDS: "medicalRecords",
  PATIENT_AUDIT_LOGS: "patientAuditLogs",
  DELETION_REQUESTS: "deletionRequests",
} as const

function parseBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization") || request.headers.get("Authorization")
  if (!header) return null
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

export async function POST(request: NextRequest) {
  try {
    const token = parseBearerToken(request)
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const auth = await getAdminAuth()
    const decoded = await auth.verifyIdToken(token).catch(() => null)
    if (!decoded?.uid) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }
    const uid = decoded.uid

    const db = await getAdminFirestore()
    const userSnap = await db.collection(COLLECTIONS.USERS).doc(uid).get()
    const userData = userSnap.exists ? userSnap.data() : undefined
    const role = userData?.role as string | undefined
    const adminName = (userData?.name as string | undefined) || "Admin"

    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden: admin role required" }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { patientId, deletionRequestId } = body
    if (!patientId || typeof patientId !== "string" || !patientId.trim()) {
      return NextResponse.json({ error: "patientId is required" }, { status: 400 })
    }
    const pid = patientId.trim()

    let patientName: string | undefined
    let deletionRequestRef: FirebaseFirestore.DocumentReference | null = null

    if (deletionRequestId && typeof deletionRequestId === "string") {
      const reqRef = db.collection(COLLECTIONS.DELETION_REQUESTS).doc(deletionRequestId.trim())
      const reqSnap = await reqRef.get()
      if (!reqSnap.exists) {
        return NextResponse.json({ error: "Deletion request not found" }, { status: 400 })
      }
      const reqData = reqSnap.data()
      if (reqData?.status !== "pending") {
        return NextResponse.json({ error: "Deletion request is not pending" }, { status: 400 })
      }
      if (reqData?.patientId !== pid) {
        return NextResponse.json({ error: "Deletion request patientId does not match" }, { status: 400 })
      }
      patientName = reqData?.patientName as string | undefined
      deletionRequestRef = reqRef
    }

    const patientRef = db.collection(COLLECTIONS.PATIENTS).doc(pid)
    const patientSnap = await patientRef.get()
    if (!patientSnap.exists) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 })
    }
    const patientData = patientSnap.data()
    const authUserId = patientData?.userId as string | undefined
    if (!patientName && patientData?.name) patientName = patientData.name as string

    const limit = 500
    const deleteCollectionForPatient = async (collectionName: string, field: string) => {
      const snap = await db.collection(collectionName).where(field, "==", pid).limit(limit).get()
      if (snap.empty) return
      const batch = db.batch()
      snap.docs.forEach((d) => batch.delete(d.ref))
      await batch.commit()
    }

    await deleteCollectionForPatient(COLLECTIONS.APPOINTMENTS, "patientId")
    await deleteCollectionForPatient(COLLECTIONS.INVOICES, "patientId")
    await deleteCollectionForPatient(COLLECTIONS.CONSULTATIONS, "patientId")
    await deleteCollectionForPatient(COLLECTIONS.MEDICAL_RECORDS, "patientId")

    await patientRef.delete()

    const bucket = await getAdminStorage()
    const prefix = `patients/${pid}/`
    const [files] = await bucket.getFiles({ prefix }).catch(() => [[]])
    const fileList = Array.isArray(files) ? files : []
    await Promise.all(fileList.map((file: { delete: () => Promise<unknown> }) => file.delete().catch(() => {})))

    if (authUserId) {
      await auth.deleteUser(authUserId).catch((err) => {
        console.warn("Admin delete-patient: could not delete Auth user:", authUserId, err)
      })
    }

    await db.collection(COLLECTIONS.PATIENT_AUDIT_LOGS).add({
      patientId: pid,
      patientName: patientName || null,
      action: "delete",
      performedByUserId: uid,
      performedByName: adminName,
      performedByRole: "admin",
      createdAt: FieldValue.serverTimestamp(),
    })

    if (deletionRequestRef) {
      await deletionRequestRef.update({
        status: "completed",
        completedAt: FieldValue.serverTimestamp(),
        completedByUserId: uid,
        completedByName: adminName,
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return apiErrorResponse(err, "admin/delete-patient")
  }
}
