/**
 * Server-only: initialize Firebase Admin for API routes.
 * Uses FIREBASE_SERVICE_ACCOUNT_JSON env var (Vercel) or firebase-service-account.json file (local).
 * Do not import this from client components.
 */

import path from "path"
import fs from "fs"

export type FirebaseAdmin = Awaited<ReturnType<typeof getFirebaseAdmin>>

export async function getFirebaseAdmin() {
  const admin = await import("firebase-admin")
  if (admin.apps.length > 0) return admin

  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

  let serviceAccount: Record<string, unknown>

  const envJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (envJson && typeof envJson === "string" && envJson.trim()) {
    try {
      serviceAccount = JSON.parse(envJson) as Record<string, unknown>
    } catch (e) {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_JSON is set but invalid JSON. Paste the full JSON key from Firebase Console."
      )
    }
  } else {
    const serviceAccountPath = path.join(process.cwd(), "firebase-service-account.json")
    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error(
        "Firebase Admin not configured. On Vercel: set FIREBASE_SERVICE_ACCOUNT_JSON (full JSON key). Locally: add firebase-service-account.json in project root."
      )
    }
    serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8")) as Record<string, unknown>
  }

  const bucket =
    storageBucket ||
    (projectId ? `${projectId}.appspot.com` : null) ||
    (serviceAccount.project_id ? `${String(serviceAccount.project_id)}.appspot.com` : undefined)
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as Record<string, string>),
    ...(bucket && { storageBucket: bucket }),
  })
  return admin
}

export async function getAdminAuth() {
  const admin = await getFirebaseAdmin()
  return admin.auth()
}

export async function getAdminFirestore() {
  const admin = await getFirebaseAdmin()
  return admin.firestore()
}

export async function getAdminStorage() {
  const admin = await getFirebaseAdmin()
  return admin.storage().bucket()
}
