#!/usr/bin/env node

/**
 * Firestore Seeding using Client SDK (No Admin SDK Required)
 * 
 * This script uses Firebase Client SDK to seed Firestore.
 * Note: This requires Firestore security rules to allow writes.
 * 
 * Usage:
 *   node scripts/seed-firestore-client.js
 */

require("dotenv").config({ path: ".env.local" })
const { initializeApp } = require("firebase/app")
const {
  getFirestore,
  collection,
  doc,
  setDoc,
  Timestamp,
} = require("firebase/firestore")

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

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

// Sample Users Data (for Firestore only - Auth users need to be created separately)
const usersData = [
  {
    email: "admin@drmkhonza.co.za",
    name: "System Administrator",
    role: "admin",
    phone: "+27 11 123 4567",
  },
  {
    email: "dr.mkhonza@drmkhonza.co.za",
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
    name: "Clerk",
    role: "clerk",
    phone: "+27 11 123 4570",
  },
  {
    email: "pharmacy@drmkhonza.co.za",
    name: "James Mokoena",
    role: "pharmacy",
    phone: "+27 11 123 4571",
  },
  {
    email: "patient@example.com",
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

// Create user profiles in Firestore
async function createUsers() {
  console.log("📝 Creating user profiles in Firestore...")
  console.log("⚠️  Note: Auth users need to be created separately in Firebase Console\n")

  const userIds = {}

  for (const userData of usersData) {
    try {
      // Use email as document ID (sanitized)
      const docId = userData.email.replace(/[@.]/g, "-")

      const userProfile = {
        email: userData.email,
        name: userData.name,
        role: userData.role,
        phone: userData.phone,
        createdAt: Timestamp.now(),
      }

      // Add doctor-specific fields
      if (userData.role === "doctor" && userData.specialization) {
        userProfile.specialization = userData.specialization
        userProfile.licenseNumber = userData.licenseNumber
        userProfile.consultationFee = userData.consultationFee
        userProfile.availability = userData.availability
      }

      await setDoc(doc(db, COLLECTIONS.USERS, docId), userProfile)
      userIds[userData.email] = docId
      console.log(`  ✅ Created user profile: ${userData.name} (${userData.role})`)
    } catch (error) {
      console.error(`  ❌ Error creating user ${userData.email}:`, error.message)
    }
  }

  return userIds
}

// Create patients in Firestore
async function createPatients(userIds) {
  console.log("\n👥 Creating patients in Firestore...")

  for (const patientData of patientsData) {
    try {
      const patientRef = doc(collection(db, COLLECTIONS.PATIENTS))
      const patientDoc = {
        ...patientData,
        dateOfBirth: Timestamp.fromDate(patientData.dateOfBirth),
        createdAt: Timestamp.now(),
      }

      // Add insuranceInfo only if it exists
      if (patientData.insuranceInfo) {
        patientDoc.insuranceInfo = {
          ...patientData.insuranceInfo,
          expiryDate: Timestamp.fromDate(patientData.insuranceInfo.expiryDate),
        }
      }

      await setDoc(patientRef, patientDoc)
      console.log(`  ✅ Created patient: ${patientData.name} (${patientRef.id})`)
    } catch (error) {
      console.error(`  ❌ Error creating patient ${patientData.name}:`, error.message)
    }
  }
}

// Create sample appointments
async function createAppointments(userIds) {
  console.log("\n📅 Creating appointments in Firestore...")

  // Get first patient
  const patientsRef = collection(db, COLLECTIONS.PATIENTS)
  // Note: We can't query without auth, so we'll create appointments with placeholder IDs
  // In production, you'd query for actual patient IDs

  const today = new Date()
  const appointments = [
    {
      patientId: "patient-placeholder-1",
      patientName: "Sipho Ndlovu",
      doctorId: userIds["dr.mkhonza@drmkhonza.co.za"] || "doctor-placeholder",
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
  ]

  for (const appointment of appointments) {
    try {
      const appointmentRef = doc(collection(db, COLLECTIONS.APPOINTMENTS))
      await setDoc(appointmentRef, {
        ...appointment,
        date: Timestamp.fromDate(appointment.date),
        createdAt: Timestamp.fromDate(appointment.createdAt),
        updatedAt: Timestamp.fromDate(appointment.updatedAt),
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

  const invoice = {
    patientId: "patient-placeholder-1",
    patientName: "Sipho Ndlovu",
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
    const invoiceRef = doc(collection(db, COLLECTIONS.INVOICES))
    await setDoc(invoiceRef, {
      ...invoice,
      dueDate: Timestamp.fromDate(invoice.dueDate),
      createdAt: Timestamp.fromDate(invoice.createdAt),
    })
    console.log(`  ✅ Created invoice: ${invoice.invoiceNumber} (${invoiceRef.id})`)
  } catch (error) {
    console.error(`  ❌ Error creating invoice:`, error.message)
  }
}

// Main function
async function main() {
  console.log("🚀 Starting Firestore seeding (Client SDK)...")
  console.log(`Project: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}\n`)
  console.log("⚠️  Make sure Firestore security rules allow writes for development\n")

  try {
    // Create users
    const userIds = await createUsers()

    // Create patients
    await createPatients(userIds)

    // Create appointments
    await createAppointments(userIds)

    // Create invoices
    await createInvoices(userIds)

    console.log("\n✅ Seeding complete!")
    console.log("\n📋 Next Steps:")
    console.log("1. Create Auth users in Firebase Console:")
    console.log("   https://console.firebase.google.com/u/0/project/dr-mkhonza-health-practice/authentication/users")
    console.log("2. Use these credentials:")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("admin@drmkhonza.co.za         | Admin123!")
    console.log("dr.mkhonza@drmkhonza.co.za   | Doctor123!")
    console.log("clerk@drmkhonza.co.za        | Clerk123!")
    console.log("pharmacy@drmkhonza.co.za     | Pharmacy123!")
    console.log("patient@example.com          | Patient123!")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("\n🌐 View your data at:")
    console.log(
      `   https://console.firebase.google.com/u/0/project/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/firestore/databases/-default-/data`
    )
  } catch (error) {
    console.error("\n❌ Error during seeding:", error.message)
    if (error.message.includes("permission")) {
      console.error("\n💡 Tip: Update Firestore security rules to allow writes:")
      console.error('   rules_version = \'2\';')
      console.error('   service cloud.firestore {')
      console.error('     match /databases/{database}/documents {')
      console.error('       match /{document=**} {')
      console.error('         allow read, write: if true;')
      console.error('       }')
      console.error('     }')
      console.error('   }')
      console.error('   ⚠️  Only for development!')
    }
    process.exit(1)
  }
}

// Run the script
main()

