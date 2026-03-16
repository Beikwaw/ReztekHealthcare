#!/usr/bin/env node

/**
 * Firestore Database Seeding CLI
 * 
 * This script seeds the Firestore database with initial data.
 * 
 * Usage:
 *   node scripts/seed-firestore.js [--users-only]
 * 
 * Note: Make sure .env.local is configured with Firebase credentials
 */

require("dotenv").config({ path: ".env.local" })

const { initializeApp } = require("firebase/app")
const { getAuth, createUserWithEmailAndPassword } = require("firebase/auth")
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
const auth = getAuth(app)
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
    name: "Demo Clerk",
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

// Helper function to convert Date to Firestore Timestamp
function toTimestamp(date) {
  return Timestamp.fromDate(date)
}

// Create users in Firebase Auth and Firestore
// Note: This requires Firebase Admin SDK for creating users programmatically
// For now, we'll create user profiles in Firestore and provide instructions
// for creating auth users via Firebase Console or CLI
async function createUsers() {
  console.log("\n📝 Creating user profiles in Firestore...")
  console.log("⚠️  Note: You'll need to create Auth users separately via Firebase Console or CLI")
  console.log("   See scripts/README.md for instructions\n")
  
  const userIds = {}
  let tempUserId = 1

  for (const userData of usersData) {
    try {
      // For now, we'll use temporary IDs
      // In production, you should create users via Firebase Admin SDK or Console
      const tempId = `temp-user-${tempUserId++}`
      userIds[userData.email] = tempId

      // Create user profile in Firestore
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

      // Use email as document ID for now (you can change this later)
      await setDoc(doc(db, COLLECTIONS.USERS, userData.email.replace(/[@.]/g, "-")), userProfile)
      console.log(`  ✅ Created user profile: ${userData.name} (${userData.role})`)
      console.log(`     Email: ${userData.email}`)
      console.log(`     Password: ${userData.password}`)
    } catch (error) {
      console.error(`  ❌ Error creating user ${userData.email}:`, error.message)
    }
  }

  console.log("\n📋 Next Steps:")
  console.log("1. Go to Firebase Console → Authentication → Users")
  console.log("2. Click 'Add user' and create each user with the credentials above")
  console.log("3. Or use Firebase CLI: firebase auth:import users.json")
  console.log("4. After creating Auth users, update the user profiles in Firestore with the correct UIDs\n")

  return userIds
}

// Create patients in Firestore
async function createPatients(userIds) {
  console.log("\n👥 Creating patients...")

  for (const patientData of patientsData) {
    try {
      const patientRef = doc(collection(db, COLLECTIONS.PATIENTS))
      const patientDoc = {
        ...patientData,
        dateOfBirth: toTimestamp(patientData.dateOfBirth),
        createdAt: Timestamp.now(),
        insuranceInfo: patientData.insuranceInfo
          ? {
              ...patientData.insuranceInfo,
              expiryDate: toTimestamp(patientData.insuranceInfo.expiryDate),
            }
          : undefined,
      }

      // Link to user if patient email matches
      const patientUser = usersData.find((u) => u.role === "patient")
      if (patientUser && userIds[patientUser.email]) {
        patientDoc.userId = userIds[patientUser.email]
      }

      await setDoc(patientRef, patientDoc)
      console.log(`  ✅ Created patient: ${patientData.name}`)
    } catch (error) {
      console.error(`  ❌ Error creating patient ${patientData.name}:`, error.message)
    }
  }
}

// Create sample appointments
async function createAppointments(userIds) {
  console.log("\n📅 Creating appointments...")

  // Get doctor ID
  const doctorUser = usersData.find((u) => u.role === "doctor")
  const doctorId = doctorUser && userIds[doctorUser.email] ? userIds[doctorUser.email] : null

  if (!doctorId) {
    console.log("  ⚠️  No doctor found, skipping appointments")
    return
  }

  // Get first patient (we'll create a simple one if none exist)
  const patientUser = usersData.find((u) => u.role === "patient")
  const patientId = patientUser && userIds[patientUser.email] ? userIds[patientUser.email] : null

  if (!patientId) {
    console.log("  ⚠️  No patient found, skipping appointments")
    return
  }

  const today = new Date()
  const appointments = [
    {
      patientId,
      patientName: "Sipho Ndlovu",
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
      patientName: "Sipho Ndlovu",
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
      const appointmentRef = doc(collection(db, COLLECTIONS.APPOINTMENTS))
      await setDoc(appointmentRef, {
        ...appointment,
        date: toTimestamp(appointment.date),
        createdAt: toTimestamp(appointment.createdAt),
        updatedAt: toTimestamp(appointment.updatedAt),
      })
      console.log(
        `  ✅ Created appointment: ${appointment.type} on ${appointment.date.toLocaleDateString()}`
      )
    } catch (error) {
      console.error(`  ❌ Error creating appointment:`, error.message)
    }
  }
}

// Create sample invoices
async function createInvoices(userIds) {
  console.log("\n💰 Creating invoices...")

  const patientUser = usersData.find((u) => u.role === "patient")
  const patientId = patientUser && userIds[patientUser.email] ? userIds[patientUser.email] : null

  if (!patientId) {
    console.log("  ⚠️  No patient found, skipping invoices")
    return
  }

  const invoice = {
    patientId,
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
      dueDate: toTimestamp(invoice.dueDate),
      createdAt: toTimestamp(invoice.createdAt),
    })
    console.log(`  ✅ Created invoice: ${invoice.invoiceNumber}`)
  } catch (error) {
    console.error(`  ❌ Error creating invoice:`, error.message)
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2)
  const usersOnly = args.includes("--users-only")

  console.log("🚀 Starting Firestore seeding...")
  console.log(`Project: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`)
  console.log("\n⚠️  Note: This script requires Firebase Authentication to be enabled")
  console.log("   Make sure you have the correct Firebase credentials in .env.local\n")

  try {
    // Create users
    const userIds = await createUsers()

    if (usersOnly) {
      console.log("\n✅ Seeding complete (users only)")
      console.log("\n📋 Login Credentials:")
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
      usersData.forEach((user) => {
        console.log(
          `${user.role.toUpperCase().padEnd(12)} | ${user.email.padEnd(35)} | ${user.password}`
        )
      })
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
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
      console.log(
        `${user.role.toUpperCase().padEnd(12)} | ${user.email.padEnd(35)} | ${user.password}`
      )
    })
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  } catch (error) {
    console.error("\n❌ Error during seeding:", error)
    process.exit(1)
  }
}

// Run the script
main()

