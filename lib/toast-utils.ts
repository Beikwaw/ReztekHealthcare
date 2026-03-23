"use client"

import { toast } from "sonner"

export type SuccessEventKey =
  | "formSubmitted"
  | "recordSaved"
  | "recordDeleted"
  | "demoBooked"
  | "quoteGenerated"
  | "recordCreated"
  | "recordUpdated"

export type ErrorEventKey =
  | "apiFailed"
  | "validationError"
  | "firebaseWriteFailed"
  | "openaiTimeout"
  | "externalServiceFailed"

const successMessages: Record<SuccessEventKey, string> = {
  formSubmitted: "Form submitted successfully.",
  recordSaved: "Record saved successfully.",
  recordDeleted: "Record deleted successfully.",
  demoBooked: "Demo booked successfully.",
  quoteGenerated: "Quote generated successfully.",
  recordCreated: "Record created successfully.",
  recordUpdated: "Record updated successfully.",
}

const errorMessages: Record<ErrorEventKey, string> = {
  apiFailed: "API call failed. Please try again.",
  validationError: "Validation error. Please check required fields.",
  firebaseWriteFailed: "Firebase write failed. Please retry.",
  openaiTimeout: "OpenAI timeout. Please try again.",
  externalServiceFailed: "External API request failed.",
}

export function notifySuccess(event: SuccessEventKey, detail?: string) {
  toast.success(detail ? `${successMessages[event]} ${detail}` : successMessages[event])
}

export function notifyError(event: ErrorEventKey, detail?: string) {
  toast.error(detail ? `${errorMessages[event]} ${detail}` : errorMessages[event])
}

export async function withLoadingToast<T>(label: string, asyncFn: () => Promise<T>): Promise<T> {
  const id = toast.loading(label)
  try {
    return await asyncFn()
  } finally {
    toast.dismiss(id)
  }
}

// Explicit examples requested:
export function showRecordCreatedToast() {
  toast.success("Record created successfully")
}

export function showApiErrorToast() {
  toast.error("API call failed. Please try again.")
}

export async function runWithQuoteLoading<T>(task: () => Promise<T>) {
  const id = toast.loading("Generating quote...")
  try {
    const result = await task()
    toast.success("Quote generated")
    return result
  } catch {
    toast.error("OpenAI timeout")
    throw new Error("OpenAI timeout")
  } finally {
    toast.dismiss(id)
  }
}
