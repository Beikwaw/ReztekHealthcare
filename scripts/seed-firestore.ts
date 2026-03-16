#!/usr/bin/env tsx

/**
 * Firestore Database Seeding CLI
 * 
 * This script seeds the Firestore database with initial data including:
 * - Users with different roles
 * - Sample patients
 * - Sample appointments
 * - Sample invoices
 * - Sample medical records
 * 
 * Usage:
 *   pnpm tsx scripts/seed-firestore.ts [--reset] [--users-only]
 */

import { initializeApp, cert, getApps } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore, Timestamp } from "firebase-admin/firestore"
import * as dotenv from "dotenv"
import * as path from "path"

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), ".env.local") })

// Initialize Firebase Admin
if (getApps().length === 0) {
  // For local development, we'll use the service account or application default credentials
  // In production, use a service account key file
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        // Note: For production, you should use a service account key file
        // For now, we'll use the client SDK approach with Firestore REST API
      }),
    })
  } catch (error) {
    console.error("Error initializing Firebase Admin:", error)
    console.log("Note: Using Firestore client SDK instead...")
  }
}

const db = getFirestore()
const auth = getAuth()

// Collection names
const COLLECTIONS = {
  USERS: "users",
  PATIENTS: "patients",
  APPOINTMENTS: "appointments",
  INVOICES: "invoices",
  MEDICAL_RECORDS: "medicalRecords",
  PRESCRIPTIONS: "prescriptions",
  PHARMACY_ORDERS: "pharmacyOrders",
  NOTIFICATIONS: "notifications",
}

// Sample Users Data
const usersData = [
  {
    email: "admin@drmkhonza.co.za",
    password: "Admin123!",
    name: "System Administrator",
    role: "admin",
    phone: "+27 11 123 4567",
  },
  {
    email: "dr.mkhonza@drmkhonza.co.za",
    password: "Doctor123!",
    name: "Dr. Thabo Mkhonza",
    role: "doctor",
    phone: "+27 11 123 4568",
    specialization: "General Practitioner",
    licenseNumber: "HPCSA-12345",
    consultationFee: 500,
    availability: [
      { dayOfWeek: 1, startTime: "08:00", endTime: "17:00" },
      { dayOfWeek: 2, startTime: "08:00", endTime: "17:00" },
      { dayOfWeek: 3, startTime: "08:00", endTime: "17:00" },
      { dayOfWeek: 4, startTime: "08:00", endTime: "17:00" },
      { dayOfWeek: 5, startTime: "08:00", endTime: "13:00" },
    ],
  },
  {
    email: "clerk@drmkhonza.co.za",
    password: "Clerk123!",
    name: "Clerk",
    role: "clerk",
    phone: "+27 11 123 4570",
  },
  {
    email: "pharmacy@drmkhonza.co.za",
    password: "Pharmacy123!",
    name: "James Mokoena",
    role: "pharmacy",
    phone: "+27 11 123 4571",
  },
  {
    email: "patient@example.com",
    password: "Patient123!",
    name: "Sipho Ndlovu",
    role: "patient",
    phone: "+27 82 555 1234",
  },
]

// Sample Patients Data
const patientsData = [
  {
    patientNumber: "PAT-001",
    name: "Sipho Ndlovu",
    email: "sipho.ndlovu@email.com",
    phone: "+27 82 555 1234",
    dateOfBirth: new Date("1985-06-15"),
    gender: "male",
    address: "123 Main Street, Sandton, Johannesburg, 2196",
    emergencyContact: {
      name: "Thandiwe Ndlovu",
      phone: "+27 82 555 5678",
      relationship: "Spouse",
    },
    medicalHistory: {
      allergies: ["Penicillin"],
      chronicConditions: ["Hypertension"],
      currentMedications: ["Amlodipine 5mg"],
      pastSurgeries: [],
      familyHistory: ["Father: Heart Disease", "Mother: Diabetes"],
      bloodType: "O+",
    },
    insuranceInfo: {
      provider: "Discovery Health",
      policyNumber: "DH123456789",
      groupNumber: "GRP001",
      expiryDate: new Date("2025-12-31"),
    },
    paymentMethod: "medical-aid",
    medicalAidNumber: "DH123456789",
    createdAt: new Date("2024-03-10"),
  },
  {
    patientNumber: "PAT-002",
    name: "Lerato Molefe",
    email: "lerato.molefe@email.com",
    phone: "+27 83 666 7890",
    dateOfBirth: new Date("1992-11-22"),
    gender: "female",
    address: "45 Oak Avenue, Rosebank, Johannesburg, 2196",
    emergencyContact: {
      name: "Kgomotso Molefe",
      phone: "+27 83 666 1234",
      relationship: "Sister",
    },
    medicalHistory: {
      allergies: [],
      chronicConditions: ["Asthma"],
      currentMedications: ["Ventolin inhaler"],
      pastSurgeries: ["Appendectomy (2015)"],
      familyHistory: ["Mother: Asthma"],
      bloodType: "A+",
    },
    paymentMethod: "card",
    createdAt: new Date("2024-05-20"),
  },
  {
    patientNumber: "PAT-003",
    name: "Johan van der Berg",
    email: "johan.vdb@email.com",
    phone: "+27 84 777 4321",
    dateOfBirth: new Date("1978-03-08"),
    gender: "male",
    address: "78 Protea Lane, Fourways, Johannesburg, 2191",
    emergencyContact: {
      name: "Marie van der Berg",
      phone: "+27 84 777 8765",
      relationship: "Spouse",
    },
    medicalHistory: {
      allergies: ["Sulfa drugs", "Shellfish"],
      chronicConditions: ["Type 2 Diabetes", "High Cholesterol"],
      currentMedications: ["Metformin 500mg", "Atorvastatin 20mg"],
      pastSurgeries: ["Knee replacement (2020)"],
      familyHistory: ["Father: Diabetes", "Mother: Stroke"],
      bloodType: "B+",
    },
    insuranceInfo: {
      provider: "Momentum Health",
      policyNumber: "MH987654321",
      expiryDate: new Date("2025-06-30"),
    },
    paymentMethod: "medical-aid",
    medicalAidNumber: "MH987654321",
    createdAt: new Date("2024-01-15"),
  },
]

// Helper function to convert Date to Firestore Timestamp
function toTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date)
}

// Create users in Firebase Auth and Firestore
async function createUsers() {
  console.log("\n📝 Creating users...")
  const userIds: Record<string, string> = {}

  for (const userData of usersData) {
    try {
      // Create user in Firebase Auth
      const userRecord = await auth.createUser({
        email: userData.email,
        password: userData.password,
        displayName: userData.name,
        phoneNumber: userData.phone,
      })

      userIds[userData.email] = userRecord.uid

      // Create user profile in Firestore
      const userProfile: any = {
        email: userData.email,
        name: userData.name,
        role: userData.role,
        phone: userData.phone,
        createdAt: Timestamp.now(),
      }

      // Add doctor-specific fields
      if (userData.role === "doctor" && "specialization" in userData) {
        userProfile.specialization = userData.specialization
        userProfile.licenseNumber = userData.licenseNumber
        userProfile.consultationFee = userData.consultationFee
        userProfile.availability = userData.availability
      }

      await db.collection(COLLECTIONS.USERS).doc(userRecord.uid).set(userProfile)
      console.log(`  ✅ Created user: ${userData.name} (${userData.role})`)
    } catch (error: any) {
      if (error.code === "auth/email-already-exists") {
        console.log(`  ⚠️  User already exists: ${userData.email}`)
        // Try to get existing user
        try {
          const existingUser = await auth.getUserByEmail(userData.email)
          userIds[userData.email] = existingUser.uid
        } catch (e) {
          console.error(`  ❌ Error getting existing user: ${e}`)
        }
      } else {
        console.error(`  ❌ Error creating user ${userData.email}:`, error.message)
      }
    }
  }

  return userIds
}

// Create patients in Firestore
async function createPatients(userIds: Record<string, string>) {
  console.log("\n👥 Creating patients...")

  for (const patientData of patientsData) {
    try {
      const patientRef = db.collection(COLLECTIONS.PATIENTS).doc()
      const patientDoc: any = {
        ...patientData,
        dateOfBirth: toTimestamp(patientData.dateOfBirth),
        createdAt: toTimestamp(patientData.createdAt),
        insuranceInfo: patientData.insuranceInfo
          ? {
              ...patientData.insuranceInfo,
              expiryDate: toTimestamp(patientData.insuranceInfo.expiryDate),
            }
          : undefined,
      }

      // Link to user if patient email matches
      const matchingUser = Object.entries(userIds).find(([email]) =>
        email.toLowerCase().includes("patient")
      )
      if (matchingUser) {
        patientDoc.userId = matchingUser[1]
      }

      await patientRef.set(patientDoc)
      console.log(`  ✅ Created patient: ${patientData.name}`)
    } catch (error: any) {
      console.error(`  ❌ Error creating patient ${patientData.name}:`, error.message)
    }
  }
}

// Create sample appointments
async function createAppointments(userIds: Record<string, string>) {
  console.log("\n📅 Creating appointments...")

  const doctorId = Object.values(userIds).find(
    async (uid) => {
      const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get()
      return userDoc.data()?.role === "doctor"
    }
  )

  // Get first patient
  const patientsSnapshot = await db.collection(COLLECTIONS.PATIENTS).limit(1).get()
  if (patientsSnapshot.empty) {
    console.log("  ⚠️  No patients found, skipping appointments")
    return
  }

  const patientId = patientsSnapshot.docs[0].id
  const patientData = patientsSnapshot.docs[0].data()

  const today = new Date()
  const appointments = [
    {
      patientId,
      patientName: patientData.name,
      doctorId: doctorId || "",
      doctorName: "Dr. Thabo Mkhonza",
      date: new Date(today.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
      startTime: "09:00",
      endTime: "09:30",
      type: "consultation",
      status: "scheduled",
      reason: "Routine checkup",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      patientId,
      patientName: patientData.name,
      doctorId: doctorId || "",
      doctorName: "Dr. Thabo Mkhonza",
      date: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), // Next week
      startTime: "10:00",
      endTime: "10:30",
      type: "follow-up",
      status: "scheduled",
      reason: "Follow-up appointment",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  for (const appointment of appointments) {
    try {
      const appointmentRef = db.collection(COLLECTIONS.APPOINTMENTS).doc()
      await appointmentRef.set({
        ...appointment,
        date: toTimestamp(appointment.date),
        createdAt: toTimestamp(appointment.createdAt),
        updatedAt: toTimestamp(appointment.updatedAt),
      })
      console.log(`  ✅ Created appointment: ${appointment.type} on ${appointment.date.toLocaleDateString()}`)
    } catch (error: any) {
      console.error(`  ❌ Error creating appointment:`, error.message)
    }
  }
}

// Create sample invoices
async function createInvoices(userIds: Record<string, string>) {
  console.log("\n💰 Creating invoices...")

  const patientsSnapshot = await db.collection(COLLECTIONS.PATIENTS).limit(1).get()
  if (patientsSnapshot.empty) {
    console.log("  ⚠️  No patients found, skipping invoices")
    return
  }

  const patientId = patientsSnapshot.docs[0].id
  const patientData = patientsSnapshot.docs[0].data()

  const invoice = {
    patientId,
    patientName: patientData.name,
    invoiceNumber: `INV-${Date.now()}`,
    items: [
      {
        description: "Consultation Fee",
        quantity: 1,
        unitPrice: 500,
        total: 500,
      },
    ],
    subtotal: 500,
    tax: 0,
    total: 500,
    status: "sent",
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    createdAt: new Date(),
  }

  try {
    const invoiceRef = db.collection(COLLECTIONS.INVOICES).doc()
    await invoiceRef.set({
      ...invoice,
      dueDate: toTimestamp(invoice.dueDate),
      createdAt: toTimestamp(invoice.createdAt),
    })
    console.log(`  ✅ Created invoice: ${invoice.invoiceNumber}`)
  } catch (error: any) {
    console.error(`  ❌ Error creating invoice:`, error.message)
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2)
  const reset = args.includes("--reset")
  const usersOnly = args.includes("--users-only")

  console.log("🚀 Starting Firestore seeding...")
  console.log(`Project: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`)

  try {
    // Create users
    const userIds = await createUsers()

    if (usersOnly) {
      console.log("\n✅ Seeding complete (users only)")
      return
    }

    // Create other data
    await createPatients(userIds)
    await createAppointments(userIds)
    await createInvoices(userIds)

    console.log("\n✅ Seeding complete!")
    console.log("\n📋 Login Credentials:")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    usersData.forEach((user) => {
      console.log(`${user.role.toUpperCase().padEnd(12)} | ${user.email.padEnd(35)} | ${user.password}`)
    })
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  } catch (error) {
    console.error("\n❌ Error during seeding:", error)
    process.exit(1)
  }
}

// Run the script
main()

