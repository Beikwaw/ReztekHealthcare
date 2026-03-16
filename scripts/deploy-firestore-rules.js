#!/usr/bin/env node

/**
 * Deploy Firestore Security Rules
 * 
 * This script uses Firebase Admin SDK to deploy Firestore security rules.
 * 
 * Usage:
 *   node scripts/deploy-firestore-rules.js
 */

require("dotenv").config({ path: ".env.local" })
const admin = require("firebase-admin")
const fs = require("fs")
const path = require("path")

// Try to load service account
const serviceAccountPath = path.join(process.cwd(), "firebase-service-account.json")

if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ Error: Service account file not found!")
  console.error("   Please ensure firebase-service-account.json exists in project root")
  process.exit(1)
}

const serviceAccount = require(serviceAccountPath)

// Initialize Firebase Admin
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || serviceAccount.project_id,
  })
}

// Read Firestore rules
const rulesPath = path.join(process.cwd(), "firestore.rules")

if (!fs.existsSync(rulesPath)) {
  console.error("❌ Error: firestore.rules file not found!")
  process.exit(1)
}

const rulesContent = fs.readFileSync(rulesPath, "utf8")

console.log("📝 Deploying Firestore security rules...")
console.log(`Project: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || serviceAccount.project_id}\n`)

// Note: Firebase Admin SDK doesn't have a direct method to deploy rules
// You need to use Firebase CLI or REST API
console.log("⚠️  Firebase Admin SDK doesn't support deploying rules directly.")
console.log("   Please use one of these methods:\n")
console.log("Method 1: Firebase Console (Easiest)")
console.log("   1. Go to: https://console.firebase.google.com/u/0/project/dr-mkhonza-health-practice/firestore/rules")
console.log("   2. Copy the contents of firestore.rules")
console.log("   3. Paste into the rules editor")
console.log("   4. Click 'Publish'\n")
console.log("Method 2: Firebase CLI")
console.log("   1. Install: npm install -g firebase-tools")
console.log("   2. Login: firebase login")
console.log("   3. Initialize: firebase init firestore")
console.log("   4. Deploy: firebase deploy --only firestore:rules\n")
console.log("Rules file location:", rulesPath)
console.log("\n📋 Rules Preview:")
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
console.log(rulesContent.substring(0, 500) + "...")
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

