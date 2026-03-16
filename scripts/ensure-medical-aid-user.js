#!/usr/bin/env node

/**
 * Simple CLI to ensure a Firestore users/{uid} document exists
 * for the medical-aid portal user.
 *
 * Usage (from project root):
 *   npm run setup:medical-aid-user
 *   npm run setup:medical-aid-user -- minlahdavid@gmail.com PWSdo1Wyh1TtOa2PgBxScY5vPI53
 *
 * It will:
 *   - Initialize Firebase Admin using FIREBASE_SERVICE_ACCOUNT_JSON
 *     or ./firebase-service-account.json
 *   - Upsert users/{uid} with role "medical-aid" and matching email
 */

const fs = require("fs")
const path = require("path")
const admin = require("firebase-admin")

function loadServiceAccount() {
  const envJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (envJson && envJson.trim()) {
    try {
      return JSON.parse(envJson)
    } catch (e) {
      console.error("FIREBASE_SERVICE_ACCOUNT_JSON is set but invalid JSON.")
      process.exit(1)
    }
  }

  const serviceAccountPath = path.join(__dirname, "..", "firebase-service-account.json")
  if (!fs.existsSync(serviceAccountPath)) {
    console.error(
      "firebase-service-account.json not found. Place your service account JSON in the project root\n" +
        "or set FIREBASE_SERVICE_ACCOUNT_JSON in the environment."
    )
    process.exit(1)
  }
  return JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"))
}

async function initAdmin() {
  if (admin.apps.length > 0) return admin
  const serviceAccount = loadServiceAccount()
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || serviceAccount.project_id
  const storageBucket =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    (projectId ? `${projectId}.appspot.com` : undefined)

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    ...(storageBucket && { storageBucket }),
  })
  return admin
}

async function main() {
  const emailArg = process.argv[2]
  const uidArg = process.argv[3]

  const email = emailArg || "minlahdavid@gmail.com"
  const uid = uidArg || "PWSdo1Wyh1TtOa2PgBxScY5vPI53"

  console.log(`Using email=${email}, uid=${uid}`)

  const adminSdk = await initAdmin()
  const db = adminSdk.firestore()

  const userRef = db.collection("users").doc(uid)
  const snap = await userRef.get()

  const now = admin.firestore.FieldValue.serverTimestamp()

  const baseData = {
    role: "medical-aid",
    name: "Medical Aid Officer",
    email,
  }

  const dataToWrite = snap.exists
    ? {
        ...baseData,
        // Preserve existing createdAt if present
        createdAt: snap.data().createdAt || now,
      }
    : {
        ...baseData,
        createdAt: now,
      }

  await userRef.set(dataToWrite, { merge: true })

  console.log(
    `Firestore users/${uid} updated with role="medical-aid" and email="${email}".`
  )
  console.log(
    "You can now sign in with this Firebase Auth user and you should be redirected to /medical-aid/claims."
  )
}

main().catch((err) => {
  console.error("Failed to ensure medical-aid user:", err)
  process.exit(1)
})

