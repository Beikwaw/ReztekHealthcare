#!/usr/bin/env node

/**
 * Seed real staff users (Clerk, Admin, Doctor) into Firebase Auth + Firestore.
 * Passwords are read from environment variables so they are never committed.
 *
 * Usage:
 *   Set in .env.local (or export) then run:
 *   node scripts/seed-real-users.js
 *
 * Required env (for this script only):
 *   SEED_CLERK_PASSWORD  – Clerk account password
 *   SEED_ADMIN_PASSWORD  – Admin account password
 *   SEED_DR_PASSWORD     – Doctor account password
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
  {
    email: "clerk1drmkhonza@gmail.com",
    passwordEnv: "SEED_CLERK_PASSWORD",
    name: "Clerk (Dr Mkhonza)",
    role: "clerk",
  },
  {
    email: "reztekportal@gmail.com",
    passwordEnv: "SEED_ADMIN_PASSWORD",
    name: "Admin (Reztek Portal)",
    role: "admin",
  },
  {
    email: "winston.mkhonza@gmail.com",
    passwordEnv: "SEED_DR_PASSWORD",
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
  const missing = realUsers.filter((u) => !process.env[u.passwordEnv])
  if (missing.length) {
    console.error("❌ Missing environment variables for passwords:")
    missing.forEach((u) => console.error(`   ${u.passwordEnv} (for ${u.email})`))
    console.error("\nAdd them to .env.local then run: node scripts/seed-real-users.js")
    process.exit(1)
  }

  console.log("📝 Creating real users in Firebase Auth and Firestore...\n")

  for (const u of realUsers) {
    const password = process.env[u.passwordEnv]
    try {
      let userRecord
      try {
        userRecord = await auth.getUserByEmail(u.email)
        console.log(`  ⚠️  Auth user already exists: ${u.email}`)
      } catch {
        userRecord = await auth.createUser({
          email: u.email,
          password,
          displayName: u.name,
          emailVerified: true,
        })
        console.log(`  ✅ Created Auth user: ${u.email}`)
      }

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

      await db.collection("users").doc(userRecord.uid).set(userProfile, { merge: true })
      console.log(`  ✅ Firestore profile set: ${u.name} (${u.role})\n`)
    } catch (err) {
      console.error(`  ❌ ${u.email}:`, err.message)
    }
  }

  console.log("Done. You can remove SEED_* password vars from .env.local after running once.")
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
