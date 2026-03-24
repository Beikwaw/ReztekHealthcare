import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"

import { getAdminFirestore, getAdminStorage } from "@/lib/firebase-admin"
import { apiErrorResponse } from "@/lib/errors"

export const runtime = "nodejs"

function safeFilename(name: string) {
  const base = name.split(/[\\/]/).pop() || "file"
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 160) || "file"
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const leadId = String(form.get("leadId") || "").trim()
    if (!leadId) {
      return NextResponse.json({ error: "leadId is required" }, { status: 400 })
    }

    const files = form.getAll("files").filter((f): f is File => f instanceof File)
    if (files.length === 0) {
      return NextResponse.json({ error: "No files uploaded (field name: files)" }, { status: 400 })
    }

    const db = await getAdminFirestore()
    const bucket = await getAdminStorage()

    const uploaded: Array<{
      id: string
      filename: string
      contentType: string
      size: number
      storagePath: string
      signedUrl?: string
    }> = []

    for (const file of files) {
      const filename = safeFilename(file.name)
      const contentType = file.type || "application/octet-stream"
      const size = file.size || 0

      const ts = Date.now()
      const storagePath = `doctor_leads/${leadId}/uploads/${ts}-${filename}`

      const buf = Buffer.from(await file.arrayBuffer())
      const gcsFile = bucket.file(storagePath)
      await gcsFile.save(buf, {
        resumable: false,
        metadata: {
          contentType,
          cacheControl: "private, max-age=0, no-transform",
        },
      })

      let signedUrl: string | undefined
      try {
        const [url] = await gcsFile.getSignedUrl({
          action: "read",
          expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
        })
        signedUrl = url
      } catch {
        // Signed URL generation can fail if IAM permissions are restricted; keep metadata anyway.
      }

      const docRef = await db
        .collection("doctor_leads")
        .doc(leadId)
        .collection("uploads")
        .add({
          filename,
          contentType,
          size,
          storagePath,
          ...(signedUrl ? { signedUrl } : {}),
          createdAt: FieldValue.serverTimestamp(),
        })

      uploaded.push({
        id: docRef.id,
        filename,
        contentType,
        size,
        storagePath,
        ...(signedUrl ? { signedUrl } : {}),
      })
    }

    return NextResponse.json({ uploaded })
  } catch (e) {
    return apiErrorResponse(e, "get-quote/upload")
  }
}

