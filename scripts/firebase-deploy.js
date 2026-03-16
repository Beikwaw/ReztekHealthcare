#!/usr/bin/env node
"use strict"

const path = require("path")
const fs = require("fs")
const { spawnSync } = require("child_process")

require("dotenv").config({ path: ".env.local" })

const argv = process.argv.slice(2)
const flags = new Set(argv.filter((arg) => arg.startsWith("--")))

const getArgValue = (name, fallback) => {
  const idx = argv.indexOf(name)
  if (idx !== -1 && argv[idx + 1]) return argv[idx + 1]
  return fallback
}

if (flags.has("--help") || flags.has("-h")) {
  console.log(`
Firebase deploy helper

Usage:
  node scripts/firebase-deploy.js [options]

Options:
  --project <id>       Firebase project id (defaults to env)
  --auth               Import auth users from file
  --auth-only          Only import auth users (skip Firestore deploy)
  --auth-file <path>   Auth import file (default: scripts/users.json)
  --hash-algo <algo>   Hash algorithm for auth import (default: SCRYPT)
  --rounds <number>    Hash rounds (optional)
  --mem-cost <number>  Hash mem cost (optional)
  --help               Show help
`)
  process.exit(0)
}

const projectId =
  getArgValue("--project", process.env.FIREBASE_PROJECT_ID) ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

if (!projectId) {
  console.error("❌ Missing Firebase project id.")
  console.error("   Set FIREBASE_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID in .env.local")
  process.exit(1)
}

const authFile = getArgValue(
  "--auth-file",
  path.join(process.cwd(), "scripts", "users.json")
)

const authFileExists = fs.existsSync(authFile)
const shouldImportAuth =
  flags.has("--auth") || flags.has("--auth-only") || authFileExists
const shouldDeployFirestore = !flags.has("--auth-only")

const firebaseCmd = process.platform === "win32" ? "npx.cmd" : "npx"

const runFirebase = (args, label) => {
  console.log(`\n▶ ${label}`)
  const result = spawnSync(firebaseCmd, ["firebase", ...args], { stdio: "inherit" })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

if (shouldDeployFirestore) {
  runFirebase(
    ["deploy", "--only", "firestore", "--project", projectId],
    "Deploying Firestore rules/indexes"
  )
}

if (shouldImportAuth) {
  if (!authFileExists) {
    console.error("❌ Auth import requested but file not found:")
    console.error(`   ${authFile}`)
    process.exit(1)
  }

  const hashAlgo = getArgValue(
    "--hash-algo",
    process.env.FIREBASE_AUTH_HASH_ALGO || "SCRYPT"
  )
  const rounds = getArgValue("--rounds", process.env.FIREBASE_AUTH_HASH_ROUNDS)
  const memCost = getArgValue("--mem-cost", process.env.FIREBASE_AUTH_HASH_MEM_COST)

  const authArgs = ["auth:import", authFile, "--project", projectId, "--hash-algo", hashAlgo]
  if (rounds) authArgs.push("--rounds", String(rounds))
  if (memCost) authArgs.push("--mem-cost", String(memCost))

  runFirebase(authArgs, "Importing Firebase Authentication users")
} else {
  console.log("\nℹ️  No auth import file found; skipping Authentication import.")
}

console.log("\n✅ Firebase deploy complete.")
