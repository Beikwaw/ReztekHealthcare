/**
 * Client-side safe error display: never show raw Firebase / network / Error.message to users.
 */

import { ERROR_MESSAGES } from "@/lib/error-messages"

type ApiErrorPayload = {
  error?: string
  code?: string
}

/** Parse JSON body from a failed fetch; returns safe message from API when present */
export function getSafeMessageFromApiPayload(payload: unknown, fallback: string = ERROR_MESSAGES.GENERIC): string {
  if (!payload || typeof payload !== "object") return fallback
  const err = (payload as ApiErrorPayload).error
  if (typeof err === "string" && err.trim()) return err
  return fallback
}

/** Prefer API error message after await res.json(); use with failed responses only */
export async function getSafeMessageFromResponse(
  response: Response,
  fallback: string = ERROR_MESSAGES.GENERIC
): Promise<string> {
  try {
    const data = (await response.json()) as ApiErrorPayload
    return getSafeMessageFromApiPayload(data, fallback)
  } catch {
    return fallback
  }
}

/** Firebase JS SDK: map auth/firestore codes to safe strings (no raw messages) */
export function mapFirebaseClientError(error: unknown): string {
  if (!error || typeof error !== "object") return ERROR_MESSAGES.GENERIC
  const code = (error as { code?: string }).code
  if (typeof code === "string") {
    if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
      return ERROR_MESSAGES.INVALID_CREDENTIALS
    }
    if (code === "auth/invalid-email") return ERROR_MESSAGES.VALIDATION_INPUT
    if (code === "auth/email-already-in-use") return ERROR_MESSAGES.REGISTRATION_FAILED
    if (code === "auth/too-many-requests") return ERROR_MESSAGES.RATE_LIMITED
    if (code === "auth/network-request-failed") return ERROR_MESSAGES.NETWORK
    if (code === "permission-denied") return ERROR_MESSAGES.PERMISSION_DENIED
    if (code === "not-found") return ERROR_MESSAGES.NOT_FOUND
    if (code.startsWith("auth/")) return ERROR_MESSAGES.LOGIN_FAILED
  }
  return ERROR_MESSAGES.GENERIC
}

/** Use in catch blocks instead of `error instanceof Error ? error.message : ...` */
export function getSafeClientErrorMessage(error: unknown, fallback: string = ERROR_MESSAGES.GENERIC): string {
  const fb = mapFirebaseClientError(error)
  if (fb !== ERROR_MESSAGES.GENERIC) return fb
  if (error instanceof TypeError && /fetch|network/i.test(error.message)) {
    return ERROR_MESSAGES.NETWORK
  }
  return fallback
}
