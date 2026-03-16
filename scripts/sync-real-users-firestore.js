#!/usr/bin/env node

/**
 * Sync Firestore user profiles for existing Firebase Auth users (Clerk, Admin, Doctor).
 * Run this when users are already created in Authentication.
 * No passwords needed.
 */

require("dotenv").config({ path: ".env.local" })
const admin = require("firebase-admin")
const fs = require("fs")
const path = require("path")

const serviceAccountPath = path.join(process.cwd(), "firebase-service-account.json")
if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ firebase-service-account.json not found in project root.")
  process.exit(1)
}

const serviceAccount = require(serviceAccountPath)
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || serviceAccount.project_id,
})

const db = admin.firestore()
const auth = admin.auth()

const realUsers = [
  { email: "clerk1drmkhonza@gmail.com", name: "Clerk (Dr Mkhonza)", role: "clerk" },
  { email: "reztekportal@gmail.com", name: "Admin (Reztek Portal)", role: "admin" },
  {
    email: "winston.mkhonza@gmail.com",
    name: "Dr Winston Mkhonza",
    role: "doctor",
    specialization: "General Practitioner",
    licenseNumber: "MP 0454672",
    consultationFee: 500,
    availability: [
      { dayOfWeek: 1, startTime: "08:00", endTime: "17:00" },
      { dayOfWeek: 2, startTime: "08:00", endTime: "17:00" },
      { dayOfWeek: 3, startTime: "08:00", endTime: "17:00" },
      { dayOfWeek: 4, startTime: "08:00", endTime: "17:00" },
      { dayOfWeek: 5, startTime: "08:00", endTime: "13:00" },
    ],
  },
]

async function main() {
  console.log("Syncing Firestore user profiles for existing Auth users...\n")

  for (const u of realUsers) {
    try {
      const userRecord = await auth.getUserByEmail(u.email)
      const uid = userRecord.uid

      const userProfile = {
        email: u.email,
        name: u.name,
        role: u.role,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }
      if (u.role === "doctor" && u.specialization) {
        userProfile.specialization = u.specialization
        userProfile.licenseNumber = u.licenseNumber
        userProfile.consultationFee = u.consultationFee
        userProfile.availability = u.availability
      }

      await db.collection("users").doc(uid).set(userProfile, { merge: true })
      console.log(`  ✅ ${u.email} → users/${uid} (${u.role})`)
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        console.error(`  ❌ Auth user not found: ${u.email}. Create them in Firebase Console first.`)
      } else {
        console.error(`  ❌ ${u.email}:`, err.message)
      }
    }
  }

  console.log("\nDone.")
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
