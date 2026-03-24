/**
 * Central user-facing error copy. Safe to import from client or server.
 * Never include internal field names, stack traces, or provider-specific codes.
 */

export const ERROR_MESSAGES = {
  /** Generic fallback */
  GENERIC: "Something went wrong. Please try again later.",

  /** Zod / validation (API or client) */
  VALIDATION_INPUT: "Please check your input and try again.",

  /** Firebase / Firestore style */
  PERMISSION_DENIED: "You do not have access to perform this action.",
  NOT_FOUND: "The requested record could not be found.",
  UNAUTHORIZED: "You need to sign in to continue.",
  INVALID_CREDENTIALS: "Sign-in failed. Please check your details and try again.",
  SESSION_EXPIRED: "Your session has expired. Please sign in again.",
  RATE_LIMITED: "Too many requests. Please wait a moment and try again.",
  SERVICE_UNAVAILABLE: "The service is temporarily unavailable. Please try again later.",

  /** AI / OpenAI */
  AI_PROCESSING: "An AI processing error occurred. Please try again.",
  AI_TIMEOUT: "The AI service took too long to respond. Please try again.",

  /** Email / external HTTP */
  EMAIL_SEND_FAILED: "We could not send the email. Please try again later.",
  EMAIL_NOT_CONFIGURED: "Email is not configured on the server. Please contact support.",
  EMAIL_CONFIG_INVALID:
    "Email configuration is invalid. Please contact your administrator or support.",
  EXTERNAL_REQUEST_FAILED: "A connected service failed. Please try again later.",

  /** Auth context (client; no raw Firebase strings) */
  LOGIN_FAILED: "Sign-in failed. Please try again.",
  REGISTRATION_FAILED: "Registration could not be completed. Please try again.",

  /** Network */
  NETWORK: "Network error. Check your connection and try again.",

  /** Operations */
  OPERATION_FAILED: "This action could not be completed. Please try again.",
  PDF_GENERATION_FAILED: "The document could not be generated. Please try again.",
  DELETE_FAILED: "The record could not be deleted. Please try again.",
} as const

export type ErrorMessageKey = keyof typeof ERROR_MESSAGES

/** Stable codes for clients (logging / support); never include raw provider codes */
export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  RATE_LIMITED: "RATE_LIMITED",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  AI_ERROR: "AI_ERROR",
  EMAIL_ERROR: "EMAIL_ERROR",
  FIREBASE_ERROR: "FIREBASE_ERROR",
  OPENAI_ERROR: "OPENAI_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const
