/**
 * Server-only API error sanitization. Maps unknown errors to safe user messages,
 * logs full details for debugging (full stack in development).
 */

import { NextResponse } from "next/server"
import { ZodError } from "zod"

import { ERROR_CODES, ERROR_MESSAGES } from "@/lib/error-messages"

export type SafeApiError = {
  message: string
  code: string
  status: number
}

const isDev = process.env.NODE_ENV === "development"

function logFullError(error: unknown, context?: string): void {
  const prefix = context ? `[API] ${context}` : "[API]"
  console.error(prefix, error)
  if (isDev && error instanceof Error && error.stack) {
    console.error(error.stack)
  }
}

function logZodError(error: ZodError, context?: string): void {
  const prefix = context ? `[API] ${context} Zod` : "[API] Zod"
  if (isDev) {
    console.error(prefix, JSON.stringify(error.flatten(), null, 2), error.issues)
  } else {
    console.error(prefix, "validation failed", error.issues.length, "issue(s)")
  }
}

/** gRPC / Google Cloud numeric codes often seen with Firestore/Admin */
const GRPC_CODE_MAP: Record<number, string> = {
  2: "unknown",
  3: "invalid-argument",
  4: "deadline-exceeded",
  5: "not-found",
  6: "already-exists",
  7: "permission-denied",
  8: "resource-exhausted",
  9: "failed-precondition",
  10: "aborted",
  11: "out-of-range",
  12: "unimplemented",
  13: "internal",
  14: "unavailable",
  16: "unauthenticated",
}

function normalizeFirebaseLikeCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null
  const e = error as {
    code?: string | number
    message?: string
    status?: number
    statusCode?: number
  }

  if (typeof e.code === "string") {
    return e.code
  }
  if (typeof e.code === "number" && GRPC_CODE_MAP[e.code]) {
    return GRPC_CODE_MAP[e.code]
  }

  const msg = (e.message || "").toLowerCase()
  if (/permission.?denied|forbidden/.test(msg)) return "permission-denied"
  if (/not\s*found|does not exist|no document/.test(msg)) return "not-found"
  if (/unauthenticated|invalid.*token|expired.*token|invalid.*credential/.test(msg)) return "unauthenticated"
  if (/resource exhausted|quota|rate/.test(msg)) return "resource-exhausted"
  if (/unavailable|deadline|econnreset/.test(msg)) return "unavailable"

  return null
}

function looksOpenAI(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const name = (error as { name?: string }).name || ""
  const msg = String((error as { message?: string }).message || "")
  return (
    name === "APIError" ||
    msg.includes("OpenAI") ||
    msg.includes("openai.com") ||
    msg.includes("chat/completions")
  )
}

function looksNetwork(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const m = error.message
  return (
    m === "fetch failed" ||
    /network|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EAI_AGAIN/i.test(m)
  )
}

/**
 * Maps any thrown value to a safe response shape. Always logs the raw error server-side.
 */
export function handleApiError(error: unknown, context?: string): SafeApiError {
  if (error instanceof ZodError) {
    logZodError(error, context)
    return {
      message: ERROR_MESSAGES.VALIDATION_INPUT,
      code: ERROR_CODES.VALIDATION_ERROR,
      status: 400,
    }
  }

  logFullError(error, context)

  const fbCode = normalizeFirebaseLikeCode(error)
  if (fbCode) {
    if (fbCode === "permission-denied" || fbCode === "PERMISSION_DENIED") {
      return {
        message: ERROR_MESSAGES.PERMISSION_DENIED,
        code: ERROR_CODES.PERMISSION_DENIED,
        status: 403,
      }
    }
    if (fbCode === "not-found" || fbCode === "NOT_FOUND") {
      return {
        message: ERROR_MESSAGES.NOT_FOUND,
        code: ERROR_CODES.NOT_FOUND,
        status: 404,
      }
    }
    if (
      fbCode.startsWith("auth/") ||
      fbCode === "unauthenticated" ||
      fbCode === "UNAUTHENTICATED"
    ) {
      return {
        message: ERROR_MESSAGES.UNAUTHORIZED,
        code: ERROR_CODES.UNAUTHORIZED,
        status: 401,
      }
    }
    if (fbCode === "resource-exhausted" || fbCode === "RESOURCE_EXHAUSTED") {
      return {
        message: ERROR_MESSAGES.RATE_LIMITED,
        code: ERROR_CODES.RATE_LIMITED,
        status: 429,
      }
    }
    if (fbCode === "unavailable" || fbCode === "UNAVAILABLE" || fbCode === "deadline-exceeded") {
      return {
        message: ERROR_MESSAGES.SERVICE_UNAVAILABLE,
        code: ERROR_CODES.SERVICE_UNAVAILABLE,
        status: 503,
      }
    }
    return {
      message: ERROR_MESSAGES.GENERIC,
      code: ERROR_CODES.FIREBASE_ERROR,
      status: 500,
    }
  }

  if (looksOpenAI(error)) {
    const msg = error instanceof Error ? error.message : ""
    if (/timeout|timed out|ETIMEDOUT|408/i.test(msg)) {
      return {
        message: ERROR_MESSAGES.AI_TIMEOUT,
        code: ERROR_CODES.OPENAI_ERROR,
        status: 504,
      }
    }
    return {
      message: ERROR_MESSAGES.AI_PROCESSING,
      code: ERROR_CODES.AI_ERROR,
      status: 503,
    }
  }

  if (looksNetwork(error)) {
    return {
      message: ERROR_MESSAGES.NETWORK,
      code: ERROR_CODES.NETWORK_ERROR,
      status: 503,
    }
  }

  return {
    message: ERROR_MESSAGES.GENERIC,
    code: ERROR_CODES.INTERNAL_ERROR,
    status: 500,
  }
}

/** Log validation failure when using safeParse (do not send Zod details to client). */
export function logZodSafeParseFailure(error: ZodError, context?: string): void {
  logZodError(error, context)
}

export function apiErrorResponse(error: unknown, context?: string): NextResponse {
  const safe = handleApiError(error, context)
  return NextResponse.json({ error: safe.message, code: safe.code }, { status: safe.status })
}
