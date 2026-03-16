/**
 * POST: Update billing for a medical aid claim (Medical Aid Officer only).
 * Updates claim in Firestore and syncs linked invoice.
 */

import { NextRequest, NextResponse } from "next/server"
import { Timestamp } from "firebase-admin/firestore"
import { getFirebaseAdmin } from "@/lib/firebase-admin"
import { getBillableItemById } from "@/lib/medical-aid-billable-items"

function parseBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization") || request.headers.get("Authorization")
  if (!header) return null
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n)
}

export async function POST(request: NextRequest) {
  try {
    const token = parseBearerToken(request)
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = await getFirebaseAdmin()
    const decoded = await admin.auth().verifyIdToken(token)
    const uid = decoded.uid

    const db = admin.firestore()
    const userSnap = await db.collection("users").doc(uid).get()
    const role = userSnap.exists ? (userSnap.data()?.role as string | undefined) : undefined
    if (role !== "medical-aid") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const claimId = body?.claimId as string | undefined
    const billAmountRaw = body?.billAmount
    const totalAmountClaimedRaw = body?.totalAmountClaimed
    const billItemsRaw = body?.billItems
    const overrideCompleted = body?.overrideCompleted === true
    const procedureCode = body?.procedureCode !== undefined ? (body.procedureCode as string | null) : undefined

    // Add single billing item (from dropdown) - amount is manually entered
    const itemId = body?.itemId as string | undefined
    const itemAmount = typeof body?.amount === "number" ? body.amount : Number(body?.amount)
    // Remove billing item by index (0-based)
    const removeItemIndex = typeof body?.removeItemIndex === "number" ? body.removeItemIndex : undefined

    if (!claimId || typeof claimId !== "string") {
      return NextResponse.json({ error: "claimId required" }, { status: 400 })
    }

    const claimRef = db.collection("medicalAidClaims").doc(claimId)
    const claimSnap = await claimRef.get()
    if (!claimSnap.exists) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 })
    }

    const claimData = claimSnap.data() as Record<string, unknown>
    const outcomeRecordedAt = claimData.outcomeRecordedAt

    if (outcomeRecordedAt && !overrideCompleted) {
      return NextResponse.json(
        { error: "Claim is completed. Use Edit Claim to override." },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}

    if (body?.markedPending === true) {
      updateData.markedPendingAt = Timestamp.now()
    }

    if (typeof removeItemIndex === "number" && removeItemIndex >= 0) {
      const claimBillItems = claimData.billItems
      const claimBillAmount = claimData.billAmount
      const claimTotalAmount = claimData.totalAmountClaimed
      let existingItems: { description: string; amount: number }[] = Array.isArray(claimBillItems)
        ? claimBillItems
        : [{ description: "Consultation", amount: Number(claimBillAmount ?? claimTotalAmount ?? 0) }]
      if (existingItems.length <= 1) {
        return NextResponse.json({ error: "Cannot remove the only billing item" }, { status: 400 })
      }
      existingItems.splice(removeItemIndex, 1)
      if (existingItems.length === 0) {
        existingItems = [{ description: "Consultation", amount: 0 }]
      }
      const total = existingItems.reduce((sum, i) => sum + (i.amount ?? 0), 0)
      updateData.billItems = existingItems
      updateData.billAmount = total
      updateData.totalAmountClaimed = total
    } else if (itemId) {
      const item = getBillableItemById(itemId)
      if (!item) {
        return NextResponse.json({ error: "Invalid billable item" }, { status: 400 })
      }
      if (!Number.isFinite(itemAmount) || itemAmount < 0) {
        return NextResponse.json({ error: "Enter a valid amount for the item" }, { status: 400 })
      }
      const claimBillItems = claimData.billItems
      const claimBillAmount = claimData.billAmount
      const claimTotalAmount = claimData.totalAmountClaimed
      let existingItems: { description: string; amount: number }[] = Array.isArray(claimBillItems)
        ? claimBillItems
        : []
      if (existingItems.length === 0) {
        const consultationAmount = Number(claimBillAmount ?? claimTotalAmount ?? 0)
        existingItems = [{ description: "Consultation", amount: consultationAmount }]
      }
      const existingDescriptions = existingItems.map((i) => i.description)
      if (existingDescriptions.includes(item.name)) {
        return NextResponse.json({ error: "Item already added" }, { status: 400 })
      }
      const newItems: { description: string; amount: number }[] = [...existingItems, { description: item.name, amount: itemAmount }]
      const total = newItems.reduce((sum, i) => sum + (i.amount ?? 0), 0)
      updateData.billItems = newItems
      updateData.billAmount = total
      updateData.totalAmountClaimed = total
    } else if (Array.isArray(billItemsRaw) && billItemsRaw.length > 0) {
      const billItems = billItemsRaw
        .map((i: unknown) => {
          const obj = i as { description?: unknown; amount?: unknown }
          const desc = typeof obj.description === "string" ? obj.description.trim() : ""
          const amt = typeof obj.amount === "number" ? obj.amount : Number(obj.amount)
          if (!desc || !Number.isFinite(amt) || amt < 0) return null
          return { description: desc, amount: amt }
        })
        .filter(Boolean)
      const total = billItems.reduce((sum, i) => sum + (i?.amount ?? 0), 0)
      updateData.billItems = billItems
      updateData.billAmount = total
      updateData.totalAmountClaimed = total
    } else if (isFiniteNumber(billAmountRaw) || isFiniteNumber(totalAmountClaimedRaw)) {
      const amount = isFiniteNumber(billAmountRaw)
        ? Number(billAmountRaw)
        : Number(totalAmountClaimedRaw)
      if (!Number.isFinite(amount) || amount < 0) {
        return NextResponse.json({ error: "Invalid bill amount" }, { status: 400 })
      }
      updateData.billAmount = amount
      updateData.totalAmountClaimed = amount
      updateData.billItems = null
    } else if (procedureCode === undefined && !(body?.markedPending === true)) {
      return NextResponse.json(
        { error: "Provide billAmount, totalAmountClaimed, billItems, itemId, removeItemIndex, procedureCode, or markedPending" },
        { status: 400 }
      )
    }

    if (procedureCode !== undefined) {
      updateData.procedureCode = procedureCode
    }
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
    }
    await claimRef.update({
      ...updateData,
      updatedAt: Timestamp.now(),
    })

    const billInvoiceId = claimData.billInvoiceId as string | undefined
    if (billInvoiceId && typeof updateData.totalAmountClaimed === "number") {
      try {
        await db.collection("invoices").doc(billInvoiceId).update({
          total: updateData.totalAmountClaimed,
          updatedAt: Timestamp.now(),
        })
      } catch (e) {
        console.error("Failed to update linked invoice:", e)
      }
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update billing"
    console.error("[medical-aid-claim-update-billing] Error:", msg, e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
