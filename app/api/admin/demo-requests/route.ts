import { NextRequest, NextResponse } from "next/server"
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase-admin"

export const runtime = "nodejs"

function parseBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization") || request.headers.get("Authorization")
  if (!header) return null
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

function toIso(v: unknown): string {
  if (!v) return ""
  if (v instanceof Date) return v.toISOString()
  if (typeof (v as { toDate?: () => Date })?.toDate === "function") return (v as { toDate: () => Date }).toDate().toISOString()
  try {
    return new Date(v as string | number).toISOString()
  } catch {
    return ""
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = parseBearerToken(request)
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const auth = await getAdminAuth()
    const decoded = await auth.verifyIdToken(token).catch(() => null)
    if (!decoded?.uid) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

    const db = await getAdminFirestore()
    const userSnap = await db.collection("users").doc(decoded.uid).get()
    const role = userSnap.exists ? (userSnap.data()?.role as string | undefined) : undefined
    if (role !== "admin") return NextResponse.json({ error: "Forbidden: admin role required" }, { status: 403 })

    const snap = await db.collection("demo_requests").orderBy("createdAt", "desc").limit(500).get()
    const rows = snap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>
      return {
        id: d.id,
        name: String(data.name || ""),
        practiceName: String(data.practiceName || ""),
        date: String(data.date || ""),
        time: String(data.time || ""),
        address: String(data.address || ""),
        createdAt: toIso(data.createdAt),
      }
    })

    return NextResponse.json({ demoRequests: rows })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load demo requests"
    console.error("[admin/demo-requests] Error:", msg, e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

