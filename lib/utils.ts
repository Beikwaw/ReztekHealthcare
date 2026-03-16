import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalize common frequency strings like "3 x daily" or "3x daily"
 * into a nicer "3 × daily" form for display.
 * Other text is returned unchanged.
 */
export function formatFrequencyForDisplay(value: string | undefined | null): string {
  if (!value) return ""
  const trimmed = value.trim()
  if (!trimmed) return ""
  const match = trimmed.match(/^(\d+)\s*[xX]\s*(.+)$/)
  if (!match) return trimmed
  const [, count, rest] = match
  return `${count} × ${rest.trim()}`
}

/**
 * Sanitize a string for use in Firebase Storage paths (replace spaces, remove invalid chars).
 */
export function sanitizeForStoragePath(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[/\\:*?"<>|]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "") || "Unknown"
}

/**
 * Return storage path prefix for patient PDFs: patients/{firstName}_{lastName}/{timestamp}.
 * Use for consultation-summary.pdf, prescription.pdf, invoice.pdf.
 */
export function getPatientStoragePath(
  patientName: string,
  timestamp: Date
): { folder: string; sanitizedFolder: string } {
  const parts = (patientName || "Patient").trim().split(/\s+/)
  const firstName = parts[0] || "Patient"
  const lastName = parts.slice(1).join(" ") || "Unknown"
  const combined = `${firstName}_${lastName}`
  const sanitizedFolder = sanitizeForStoragePath(combined)
  const timestampPart = timestamp.toISOString().slice(0, 16).replace("T", "_")
  const folder = `patients/${sanitizedFolder}/${timestampPart}`
  return { folder, sanitizedFolder: `${sanitizedFolder}/${timestampPart}` }
}

/** Recursively omit undefined values so Firestore never receives undefined */
export function deepOmitUndefined<T extends Record<string, unknown>>(obj: T): T {
  const result = {} as Record<string, unknown>
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue
    if (v !== null && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date)) {
      result[k] = deepOmitUndefined(v as Record<string, unknown>)
    } else {
      result[k] = v
    }
  }
  return result as T
}
