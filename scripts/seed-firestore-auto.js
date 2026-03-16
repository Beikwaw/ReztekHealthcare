#!/usr/bin/env node

/**
 * Automated Firestore Database Seeding
 * 
 * This script automatically creates users in Firebase Auth and seeds Firestore
 * using Firebase Admin SDK.
 * 
 * Usage:
 *   node scripts/seed-firestore-auto.js
 * 
 * Prerequisites:
 *   1. Install firebase-admin: pnpm add firebase-admin
 *   2. Get service account key from Firebase Console
 *   3. Save it as firebase-service-account.json in project root
 */

require("dotenv").config({ path: ".env.local" })
const admin = require("firebase-admin")
const fs = require("fs")
const path = require("path")

// Try to load service account
let serviceAccount
const serviceAccountPath = path.join(process.cwd(), "firebase-service-account.json")

if (fs.existsSync(serviceAccountPath)) {
  try {
    serviceAccount = require(serviceAccountPath)
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || serviceAccount.project_id,
    })
    console.log("✅ Using Firebase Admin SDK with service account\n")
  } catch (error) {
    console.error("❌ Error loading service account file:", error.message)
    console.error("   Please check that firebase-service-account.json is valid JSON\n")
    process.exit(1)
  }
} else {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "your-project-id"
  console.error("❌ Error: Service account file not found!")
  console.error("   Please create a service account key:")
  console.error("   1. Go to: https://console.firebase.google.com/project/" + projectId + "/settings/serviceaccounts/adminsdk")
  console.error("   2. Click 'Generate new private key'")
  console.error("   3. Save the downloaded file as 'firebase-service-account.json' in project root")
  console.error("   4. File should be at: " + serviceAccountPath)
  console.error("   5. Run: npm run seed:auto\n")
  process.exit(1)
}

const db = admin.firestore()
const auth = admin.auth()

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
    name: "Dr. WC. Mkhonza",
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
    name: " Clerk",
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
  },
]

// Create users in Firebase Auth and Firestore
async function createUsers() {
  console.log("📝 Creating users in Firebase Auth and Firestore...")
  const userIds = {}

  for (const userData of usersData) {
    try {
      // Check if user already exists
      let userRecord
      try {
        userRecord = await auth.getUserByEmail(userData.email)
        console.log(`  ⚠️  User already exists: ${userData.email}`)
      } catch (error) {
        // User doesn't exist, create it
        userRecord = await auth.createUser({
          email: userData.email,
          password: userData.password,
          displayName: userData.name,
          phoneNumber: userData.phone,
          emailVerified: true, // Auto-verify for seeding
        })
        console.log(`  ✅ Created Auth user: ${userData.name}`)
      }

      userIds[userData.email] = userRecord.uid

      // Create/Update user profile in Firestore
      const userProfile = {
        email: userData.email,
        name: userData.name,
        role: userData.role,
        phone: userData.phone,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }

      // Add doctor-specific fields
      if (userData.role === "doctor" && userData.specialization) {
        userProfile.specialization = userData.specialization
        userProfile.licenseNumber = userData.licenseNumber
        userProfile.consultationFee = userData.consultationFee
        userProfile.availability = userData.availability
      }

      await db.collection(COLLECTIONS.USERS).doc(userRecord.uid).set(userProfile, { merge: true })
      console.log(`  ✅ Created/Updated Firestore profile: ${userData.name} (${userData.role})`)
    } catch (error) {
      console.error(`  ❌ Error creating user ${userData.email}:`, error.message)
    }
  }

  return userIds
}

// Create patients in Firestore
async function createPatients(userIds) {
  console.log("\n👥 Creating patients in Firestore...")

  const patientUser = usersData.find((u) => u.role === "patient")
  const patientUserId = patientUser && userIds[patientUser.email] ? userIds[patientUser.email] : null

  for (const patientData of patientsData) {
    try {
      const patientRef = db.collection(COLLECTIONS.PATIENTS).doc()
      const patientDoc = {
        ...patientData,
        dateOfBirth: admin.firestore.Timestamp.fromDate(patientData.dateOfBirth),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }

      // Add insuranceInfo only if it exists
      if (patientData.insuranceInfo) {
        patientDoc.insuranceInfo = {
          ...patientData.insuranceInfo,
          expiryDate: admin.firestore.Timestamp.fromDate(patientData.insuranceInfo.expiryDate),
        }
      }

      // Link to user if patient email matches
      if (patientUserId && patientData.email === patientUser.email) {
        patientDoc.userId = patientUserId
      }

      await patientRef.set(patientDoc)
      console.log(`  ✅ Created patient: ${patientData.name} (${patientRef.id})`)
    } catch (error) {
      console.error(`  ❌ Error creating patient ${patientData.name}:`, error.message)
    }
  }
}

// Create sample appointments
async function createAppointments(userIds) {
  console.log("\n📅 Creating appointments in Firestore...")

  const doctorUser = usersData.find((u) => u.role === "doctor")
  const doctorId = doctorUser && userIds[doctorUser.email] ? userIds[doctorUser.email] : null

  if (!doctorId) {
    console.log("  ⚠️  No doctor found, skipping appointments")
    return
  }

  // Get first patient
  const patientsSnapshot = await db.collection(COLLECTIONS.PATIENTS).limit(1).get()
  if (patientsSnapshot.empty) {
    console.log("  ⚠️  No patients found, skipping appointments")
    return
  }

  const patientDoc = patientsSnapshot.docs[0]
  const patientId = patientDoc.id
  const patientData = patientDoc.data()

  const today = new Date()
  const appointments = [
    {
      patientId,
      patientName: patientData.name || "Sipho Ndlovu",
      doctorId,
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
      patientName: patientData.name || "Sipho Ndlovu",
      doctorId,
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
        date: admin.firestore.Timestamp.fromDate(appointment.date),
        createdAt: admin.firestore.Timestamp.fromDate(appointment.createdAt),
        updatedAt: admin.firestore.Timestamp.fromDate(appointment.updatedAt),
      })
      console.log(
        `  ✅ Created appointment: ${appointment.type} on ${appointment.date.toLocaleDateString()} (${appointmentRef.id})`
      )
    } catch (error) {
      console.error(`  ❌ Error creating appointment:`, error.message)
    }
  }
}

// Create sample invoices
async function createInvoices(userIds) {
  console.log("\n💰 Creating invoices in Firestore...")

  const patientsSnapshot = await db.collection(COLLECTIONS.PATIENTS).limit(1).get()
  if (patientsSnapshot.empty) {
    console.log("  ⚠️  No patients found, skipping invoices")
    return
  }

  const patientDoc = patientsSnapshot.docs[0]
  const patientId = patientDoc.id
  const patientData = patientDoc.data()

  const invoice = {
    patientId,
    patientName: patientData.name || "Sipho Ndlovu",
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
      dueDate: admin.firestore.Timestamp.fromDate(invoice.dueDate),
      createdAt: admin.firestore.Timestamp.fromDate(invoice.createdAt),
    })
    console.log(`  ✅ Created invoice: ${invoice.invoiceNumber} (${invoiceRef.id})`)
  } catch (error) {
    console.error(`  ❌ Error creating invoice:`, error.message)
  }
}

// Main function
async function main() {
  console.log("🚀 Starting automated Firestore seeding...")
  console.log(`Project: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || serviceAccount?.project_id}\n`)

  try {
    // Create users (Auth + Firestore)
    const userIds = await createUsers()

    // Create patients
    await createPatients(userIds)

    // Create appointments
    await createAppointments(userIds)

    // Create invoices
    await createInvoices(userIds)

    console.log("\n✅ Seeding complete!")
    console.log("\n📋 Login Credentials:")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    usersData.forEach((user) => {
      console.log(
        `${user.role.toUpperCase().padEnd(12)} | ${user.email.padEnd(35)} | ${user.password}`
      )
    })
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("\n🌐 View your data at:")
    console.log(
      `   https://console.firebase.google.com/u/0/project/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || serviceAccount?.project_id}/firestore/databases/-default-/data`
    )
  } catch (error) {
    console.error("\n❌ Error during seeding:", error)
    process.exit(1)
  }
}

// Run the script
main()

