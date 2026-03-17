#!/usr/bin/env node

/**
 * Firestore normalization CLI
 *
 * Scans key collections and ensures that commonly used date/timestamp
 * and required fields match what the Next.js app expects.
 *
 * Usage (from project root):
 *   node scripts/firestore-normalize-cli.js --collection appointments --dry-run
 *   node scripts/firestore-normalize-cli.js --collection appointments --fix
 *   node scripts/firestore-normalize-cli.js --collection patients --dry-run
 *
 * Flags:
 *   --collection <name>  One of: users, patients, appointments, invoices,
 *                        consultations, medicalAidClaims, pharmacyOrders,
 *                        notifications, deletionRequests
 *   --dry-run            Log proposed updates only (default)
 *   --fix                Apply updates with update() calls
 */

const path = require("path")

async function getFirebaseAdmin() {
  // Import via compiled TS helper so we share config with the app
  const adminModule = await import(path.join("..", "lib", "firebase-admin"))
  return adminModule.getFirebaseAdmin()
}

function parseArgs(argv) {
  const args = argv.slice(2)
  const result = {
    collection: null,
    dryRun: true,
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if ((arg === "--collection" || arg === "-c") && args[i + 1]) {
      result.collection = args[i + 1]
      i += 1
    } else if (arg === "--dry-run") {
      result.dryRun = true
    } else if (arg === "--fix") {
      result.dryRun = false
    }
  }

  return result
}

function toTimestamp(admin, value) {
  if (!value) return null
  if (value instanceof admin.firestore.Timestamp) return value
  if (value instanceof Date) return admin.firestore.Timestamp.fromDate(value)
  if (typeof value === "object" && typeof value.toDate === "function") {
    return admin.firestore.Timestamp.fromDate(value.toDate())
  }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return admin.firestore.Timestamp.fromDate(d)
}

async function normalizeUsers({ admin, db, dryRun }) {
  const snap = await db.collection("users").get()
  let updated = 0
  let skipped = 0

  snap.forEach((docSnap) => {
    const data = docSnap.data() || {}
    const update = {}

    if (!data.email || typeof data.email !== "string") {
      skipped += 1
      return
    }

    if (!data.name || typeof data.name !== "string") {
      update.name = data.name && typeof data.name === "string" ? data.name : data.email.split("@")[0]
    }

    if (!data.role) {
      // Default to "clerk" when role is missing but keep existing explicit values
      update.role = "clerk"
    }

    if (data.createdAt && !(data.createdAt instanceof admin.firestore.Timestamp)) {
      const ts = toTimestamp(admin, data.createdAt)
      if (ts) update.createdAt = ts
    }

    if (Object.keys(update).length === 0) {
      return
    }

    updated += 1
    if (dryRun) {
      console.log("[users] Would update", docSnap.id, update)
    } else {
      console.log("[users] Updating", docSnap.id, update)
      docSnap.ref.update(update)
    }
  })

  return { updated, skipped, total: snap.size }
}

async function normalizePatients({ admin, db, dryRun }) {
  const snap = await db.collection("patients").get()
  let updated = 0
  let skipped = 0

  snap.forEach((docSnap) => {
    const data = docSnap.data() || {}
    const update = {}

    const dateFields = ["dateOfBirth", "createdAt", "dateRegistered", "lastVisitDate"]
    dateFields.forEach((field) => {
      const value = data[field]
      if (value && !(value instanceof admin.firestore.Timestamp)) {
        const ts = toTimestamp(admin, value)
        if (ts) update[field] = ts
      }
    })

    if (Array.isArray(data.visitHistory)) {
      const converted = data.visitHistory.map((v) => toTimestamp(admin, v)).filter(Boolean)
      if (converted.length !== data.visitHistory.length) {
        update.visitHistory = converted
      }
    }

    if (!data.name || typeof data.name !== "string") {
      skipped += 1
      return
    }

    if (Object.keys(update).length === 0) return

    updated += 1
    if (dryRun) {
      console.log("[patients] Would update", docSnap.id, update)
    } else {
      console.log("[patients] Updating", docSnap.id, update)
      docSnap.ref.update(update)
    }
  })

  return { updated, skipped, total: snap.size }
}

async function normalizeAppointments({ admin, db, dryRun }) {
  const snap = await db.collection("appointments").get()
  let updated = 0
  let skipped = 0

  snap.forEach((docSnap) => {
    const data = docSnap.data() || {}
    const update = {}

    const dateFields = ["date", "createdAt", "updatedAt"]
    dateFields.forEach((field) => {
      const value = data[field]
      if (value && !(value instanceof admin.firestore.Timestamp)) {
        const ts = toTimestamp(admin, value)
        if (ts) update[field] = ts
      }
    })

    if (!data.status) {
      update.status = "scheduled"
    }

    if (!data.doctorName) {
      // Avoid overwriting when there is some identifier
      if (data.doctorId) {
        update.doctorName = "Assigned doctor"
      } else {
        update.doctorName = "Reztek Healthcare Practitioner"
      }
    }

    if (!data.patientName && data.patientId) {
      update.patientName = "Patient"
    }

    if (Object.keys(update).length === 0) {
      return
    }

    updated += 1
    if (dryRun) {
      console.log("[appointments] Would update", docSnap.id, update)
    } else {
      console.log("[appointments] Updating", docSnap.id, update)
      docSnap.ref.update(update)
    }
  })

  return { updated, skipped, total: snap.size }
}

async function normalizeInvoices({ admin, db, dryRun }) {
  const snap = await db.collection("invoices").get()
  let updated = 0
  let skipped = 0

  snap.forEach((docSnap) => {
    const data = docSnap.data() || {}
    const update = {}

    const dateFields = ["createdAt", "dueDate", "paidDate"]
    dateFields.forEach((field) => {
      const value = data[field]
      if (value && !(value instanceof admin.firestore.Timestamp)) {
        const ts = toTimestamp(admin, value)
        if (ts) update[field] = ts
      }
    })

    if (typeof data.subtotal !== "number" && Array.isArray(data.items)) {
      const subtotal = data.items.reduce(
        (sum, item) => sum + Number(item.total || item.amount || 0),
        0,
      )
      update.subtotal = subtotal
    }

    if (typeof data.total !== "number" && typeof data.subtotal === "number") {
      const discount = typeof data.discount === "number" ? data.discount : 0
      update.total = data.subtotal - discount
    }

    if (Object.keys(update).length === 0) return

    updated += 1
    if (dryRun) {
      console.log("[invoices] Would update", docSnap.id, update)
    } else {
      console.log("[invoices] Updating", docSnap.id, update)
      docSnap.ref.update(update)
    }
  })

  return { updated, skipped, total: snap.size }
}

async function normalizeConsultations({ admin, db, dryRun }) {
  const snap = await db.collection("consultations").get()
  let updated = 0
  let skipped = 0

  snap.forEach((docSnap) => {
    const data = docSnap.data() || {}
    const update = {}

    const dateFields = ["createdAt", "updatedAt", "confirmedAt", "pdfSentAt", "lastCompletionEmailAt"]
    dateFields.forEach((field) => {
      const value = data[field]
      if (value && !(value instanceof admin.firestore.Timestamp)) {
        const ts = toTimestamp(admin, value)
        if (ts) update[field] = ts
      }
    })

    if (!data.status) {
      update.status = "pending"
    }

    if (Object.keys(update).length === 0) return

    updated += 1
    if (dryRun) {
      console.log("[consultations] Would update", docSnap.id, update)
    } else {
      console.log("[consultations] Updating", docSnap.id, update)
      docSnap.ref.update(update)
    }
  })

  return { updated, skipped, total: snap.size }
}

async function normalizeMedicalAidClaims({ admin, db, dryRun }) {
  const snap = await db.collection("medicalAidClaims").get()
  let updated = 0
  let skipped = 0

  snap.forEach((docSnap) => {
    const data = docSnap.data() || {}
    const update = {}

    const dateFields = ["consultationDate", "dateOfService", "createdAt", "xmlExportedAt", "patientDateOfBirth"]
    dateFields.forEach((field) => {
      const value = data[field]
      if (value && !(value instanceof admin.firestore.Timestamp)) {
        const ts = toTimestamp(admin, value)
        if (ts) update[field] = ts
      }
    })

    if (!data.practiceNumber) {
      update.practiceNumber = "0000000"
    }

    if (Object.keys(update).length === 0) return

    updated += 1
    if (dryRun) {
      console.log("[medicalAidClaims] Would update", docSnap.id, update)
    } else {
      console.log("[medicalAidClaims] Updating", docSnap.id, update)
      docSnap.ref.update(update)
    }
  })

  return { updated, skipped, total: snap.size }
}

async function normalizePharmacyOrders({ admin, db, dryRun }) {
  const snap = await db.collection("pharmacyOrders").get()
  let updated = 0
  let skipped = 0

  snap.forEach((docSnap) => {
    const data = docSnap.data() || {}
    const update = {}

    const dateFields = ["createdAt", "dispensedAt"]
    dateFields.forEach((field) => {
      const value = data[field]
      if (value && !(value instanceof admin.firestore.Timestamp)) {
        const ts = toTimestamp(admin, value)
        if (ts) update[field] = ts
      }
    })

    if (!data.status) {
      update.status = "pending"
    }

    if (Object.keys(update).length === 0) return

    updated += 1
    if (dryRun) {
      console.log("[pharmacyOrders] Would update", docSnap.id, update)
    } else {
      console.log("[pharmacyOrders] Updating", docSnap.id, update)
      docSnap.ref.update(update)
    }
  })

  return { updated, skipped, total: snap.size }
}

async function normalizeNotifications({ admin, db, dryRun }) {
  const snap = await db.collection("notifications").get()
  let updated = 0
  let skipped = 0

  snap.forEach((docSnap) => {
    const data = docSnap.data() || {}
    const update = {}

    if (data.createdAt && !(data.createdAt instanceof admin.firestore.Timestamp)) {
      const ts = toTimestamp(admin, data.createdAt)
      if (ts) update.createdAt = ts
    }

    if (typeof data.read === "undefined") {
      update.read = false
    }

    if (Object.keys(update).length === 0) return

    updated += 1
    if (dryRun) {
      console.log("[notifications] Would update", docSnap.id, update)
    } else {
      console.log("[notifications] Updating", docSnap.id, update)
      docSnap.ref.update(update)
    }
  })

  return { updated, skipped, total: snap.size }
}

async function normalizeDeletionRequests({ admin, db, dryRun }) {
  const snap = await db.collection("deletionRequests").get()
  let updated = 0
  let skipped = 0

  snap.forEach((docSnap) => {
    const data = docSnap.data() || {}
    const update = {}

    const dateFields = ["createdAt", "completedAt"]
    dateFields.forEach((field) => {
      const value = data[field]
      if (value && !(value instanceof admin.firestore.Timestamp)) {
        const ts = toTimestamp(admin, value)
        if (ts) update[field] = ts
      }
    })

    if (!data.status) {
      update.status = "pending"
    }

    if (Object.keys(update).length === 0) return

    updated += 1
    if (dryRun) {
      console.log("[deletionRequests] Would update", docSnap.id, update)
    } else {
      console.log("[deletionRequests] Updating", docSnap.id, update)
      docSnap.ref.update(update)
    }
  })

  return { updated, skipped, total: snap.size }
}

async function main() {
  const args = parseArgs(process.argv)
  if (!args.collection) {
    console.error(
      "Missing --collection. Expected one of: users, patients, appointments, invoices, consultations, medicalAidClaims, pharmacyOrders, notifications, deletionRequests",
    )
    process.exit(1)
  }

  const admin = await getFirebaseAdmin()
  const db = admin.firestore()

  const context = { admin, db, dryRun: args.dryRun }

  const collection = args.collection
  let result

  if (collection === "users") {
    result = await normalizeUsers(context)
  } else if (collection === "patients") {
    result = await normalizePatients(context)
  } else if (collection === "appointments") {
    result = await normalizeAppointments(context)
  } else if (collection === "invoices") {
    result = await normalizeInvoices(context)
  } else if (collection === "consultations") {
    result = await normalizeConsultations(context)
  } else if (collection === "medicalAidClaims") {
    result = await normalizeMedicalAidClaims(context)
  } else if (collection === "pharmacyOrders") {
    result = await normalizePharmacyOrders(context)
  } else if (collection === "notifications") {
    result = await normalizeNotifications(context)
  } else if (collection === "deletionRequests") {
    result = await normalizeDeletionRequests(context)
  } else {
    console.error("Unknown collection:", collection)
    process.exit(1)
  }

  const modeLabel = args.dryRun ? "DRY-RUN" : "FIX"
  console.log(
    `[${modeLabel}] Collection "${collection}": ${result.updated} updated, ${result.skipped} skipped, ${result.total} total`,
  )
}

main().catch((err) => {
  console.error("firestore-normalize-cli failed:", err)
  process.exit(1)
})

