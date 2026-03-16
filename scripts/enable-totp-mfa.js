#!/usr/bin/env node
"use strict"

/**
 * One-time script to enable TOTP multi-factor authentication (Google Authenticator)
 * for the Firebase project using the Admin SDK.
 *
 * Usage:
 *   # Ensure firebase-service-account.json exists in the project root
 *   # OR set FIREBASE_SERVICE_ACCOUNT_JSON to the full JSON string.
 *
 *   node scripts/enable-totp-mfa.js
 */

const fs = require("fs")
const path = require("path")
const admin = require("firebase-admin")

function loadServiceAccount() {
  const envJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (envJson && typeof envJson === "string" && envJson.trim()) {
    try {
      return JSON.parse(envJson)
    } catch (e) {
      console.error("FIREBASE_SERVICE_ACCOUNT_JSON is set but is not valid JSON.")
      process.exit(1)
    }
  }

  const serviceAccountPath = path.join(process.cwd(), "firebase-service-account.json")
  if (!fs.existsSync(serviceAccountPath)) {
    console.error(
      "Missing firebase-service-account.json and FIREBASE_SERVICE_ACCOUNT_JSON.\n" +
        "Download a service account key from the Firebase Console and save it as firebase-service-account.json " +
        "in the project root (this file is gitignored)."
    )
    process.exit(1)
  }

  return JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"))
}

async function main() {
  const serviceAccount = loadServiceAccount()

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })
  }

  const auth = admin.auth()

  console.log("Enabling TOTP MFA for project:", serviceAccount.project_id || "(unknown)")

  await auth.projectConfigManager().updateProjectConfig({
    multiFactorConfig: {
      providerConfigs: [
        {
          state: "ENABLED",
          totpProviderConfig: {
            // Accept codes in the current 30s window plus 1 adjacent window on each side.
            // Increase if you expect more clock drift; max is 10.
            adjacentIntervals: 1,
          },
        },
      ],
    },
  })

  console.log("✅ TOTP multi-factor authentication has been enabled for this project.")
  process.exit(0)
}

main().catch((err) => {
  console.error("Failed to enable TOTP MFA via Admin SDK:", err)
  process.exit(1)
})

