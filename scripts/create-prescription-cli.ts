#!/usr/bin/env tsx

/**
 * Simple CLI to create a Firestore `prescriptions` document with the correct fields.
 *
 * This is useful if the `prescriptions` collection or sample documents were deleted
 * and you want to recreate a valid document so that:
 * - Doctors can see \"Previous prescriptions\" on the consultation detail page
 * - Pharmacy views can load prescription data without schema errors
 *
 * Usage (from project root):
 *   pnpm tsx scripts/create-prescription-cli.ts \\
 *     --patientId PATIENT_ID \\
 *     --doctorId DOCTOR_ID \\
 *     [--consultationId CONSULTATION_ID] \\
 *     [--medication \"Paracetamol 500mg\" --dosage \"1 tablet\" --frequency \"3 times daily\" --duration \"5 days\" --instructions \"After meals\"]
 *
 * Notes:
 * - The script uses Firebase Admin via the same pattern as `seed-firestore.ts`.
 * - It creates ONE prescription document per run.
 * - All fields match what the app expects:
 *   {
 *     patientId: string;
 *     doctorId: string;
 *     consultationId?: string;
 *     items?: { medication, dosage, frequency, duration, instructions? }[];
 *     scriptText?: string;
 *     createdAt: Timestamp;
 *   }
 */

import { initializeApp, cert, getApps } from "firebase-admin/app"
import { getFirestore, Timestamp } from "firebase-admin/firestore"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

// Initialize Firebase Admin (same pattern as seed-firestore.ts)
if (getApps().length === 0) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      }),
    })
  } catch (error) {
    console.error("Error initializing Firebase Admin:", error)
    process.exit(1)
  }
}

const db = getFirestore()

const COLLECTIONS = {
  PRESCRIPTIONS: "prescriptions",
}

type Args = {
  patientId: string
  doctorId: string
  consultationId?: string
  medication?: string
  dosage?: string
  frequency?: string
  duration?: string
  instructions?: string
}

function parseArgs(): Args {
  const args = process.argv.slice(2)
  const result: Record<string, string> = {}

  for (const arg of args) {
    const [key, value] = arg.startsWith("--") ? arg.slice(2).split("=") : [arg, ""]
    if (key && value !== undefined) {
      result[key] = value
    }
  }

  const required = ["patientId", "doctorId"] as const
  for (const key of required) {
    if (!result[key]) {
      console.error(`Missing required argument --${key}=VALUE`)
      console.error(
        "Example: pnpm tsx scripts/create-prescription-cli.ts --patientId=ABC123 --doctorId=DR123 --consultationId=CONSULT1 --medication=\"Paracetamol 500mg\" --dosage=\"1 tablet\" --frequency=\"3 times daily\" --duration=\"5 days\" --instructions=\"After meals\""
      )
      process.exit(1)
    }
  }

  return {
    patientId: result.patientId,
    doctorId: result.doctorId,
    consultationId: result.consultationId,
    medication: result.medication,
    dosage: result.dosage,
    frequency: result.frequency,
    duration: result.duration,
    instructions: result.instructions,
  }
}

async function main() {
  const {
    patientId,
    doctorId,
    consultationId,
    medication,
    dosage,
    frequency,
    duration,
    instructions,
  } = parseArgs()

  const items =
    medication && dosage && frequency && duration
      ? [
          {
            medication,
            dosage,
            frequency,
            duration,
            ...(instructions ? { instructions } : {}),
          },
        ]
      : []

  const payload: any = {
    patientId,
    doctorId,
    createdAt: Timestamp.now(),
  }

  if (consultationId) {
    payload.consultationId = consultationId
  }
  if (items.length > 0) {
    payload.items = items
  }

  try {
    const docRef = await db.collection(COLLECTIONS.PRESCRIPTIONS).add(payload)
    console.log("✅ Created prescription document:")
    console.log(`   Collection: ${COLLECTIONS.PRESCRIPTIONS}`)
    console.log(`   ID        : ${docRef.id}`)
    console.log("   Data      :", JSON.stringify(payload, null, 2))
  } catch (error) {
    console.error("❌ Failed to create prescription document:", error)
    process.exit(1)
  }
}

main()

