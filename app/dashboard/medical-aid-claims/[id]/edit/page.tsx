"use client"

import { useMemo, useState, type ChangeEvent, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { format } from "date-fns"
import { toast } from "sonner"
import { FileText, ArrowLeft } from "lucide-react"

import { useAuth } from "@/lib/auth-context"
import { useMedicalAidClaim } from "@/lib/firestore-hooks"
import { updateMedicalAidClaim, updateInvoice as updateInvoiceServer } from "@/lib/firebase"
import type { MedicalAidClaim } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function MedicalAidClaimEditPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const claimId = params?.id

  const { user } = useAuth()
  const { claim, loading, error, refetch } = useMedicalAidClaim(claimId)

  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)

  const [icd10Code, setIcd10Code] = useState("")
  const [billAmount, setBillAmount] = useState<string>("")
  const [diagnosisText, setDiagnosisText] = useState("")

  useEffect(() => {
    if (claim) {
      setIcd10Code(claim.icd10Code ?? "")
      setBillAmount(String(claim.billAmount ?? claim.totalAmountClaimed ?? ""))
      const diagnosisLinesText =
        (claim.diagnosisLines && claim.diagnosisLines.map((d) => `${d.line}${d.icd10 ? ` [${d.icd10}]` : ""}`).join("\n")) ||
        claim.clinicalSummaryShort ||
        ""
      setDiagnosisText(diagnosisLinesText)
    }
  }, [claim])

  const billedAmount = useMemo(() => {
    const v = Number(claim?.billAmount ?? claim?.totalAmountClaimed ?? 0)
    return Number.isFinite(v) ? v : 0
  }, [claim?.billAmount, claim?.totalAmountClaimed])

  const canEdit = user && (user.role === "doctor" || user.role === "clerk" || user.role === "admin")

  if (!canEdit) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        You do not have permission to edit medical aid claims.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Loading claim…
      </div>
    )
  }

  if (error) {
    return <div className="py-8 text-center text-destructive">{error.message}</div>
  }

  if (!claim) {
    return <div className="py-8 text-center text-muted-foreground">Claim not found.</div>
  }

  const consultDate = claim.consultationDate instanceof Date ? claim.consultationDate : new Date(claim.consultationDate)

  const handleSave = async () => {
    if (!claimId) return
    setSaving(true)
    try {
      const numericBill = Number(billAmount)
      if (!Number.isFinite(numericBill) || numericBill <= 0) {
        toast.error("Enter a valid billed amount.")
        setSaving(false)
        return
      }

      await updateMedicalAidClaim(claimId, {
        icd10Code: icd10Code.trim() || claim.icd10Code || "",
        billAmount: numericBill,
        totalAmountClaimed: numericBill,
      })

      if (claim.billInvoiceId) {
        try {
          await updateInvoiceServer(claim.billInvoiceId, {
            total: numericBill,
          } as any)
        } catch (e) {
          console.error("Failed to update linked invoice:", e)
        }
      }

      toast.success("Claim details saved.")
      await refetch()
    } catch (e) {
      console.error("Save claim failed:", e)
      toast.error(e instanceof Error ? e.message : "Failed to save claim")
    } finally {
      setSaving(false)
    }
  }

  const handleSendToPortal = async () => {
    if (!claimId) return
    setSending(true)
    try {
      const res = await fetch("/api/medical-aid-claim-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast.error(data.error ?? "Failed to send claim to Medical Aid Portal.")
        return
      }
      toast.success("Claim sent to Medical Aid Portal.")
      router.push("/dashboard/medical-aid-claims")
    } catch (e) {
      console.error("Send to portal failed:", e)
      toast.error(e instanceof Error ? e.message : "Failed to send claim to Medical Aid Portal.")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/medical-aid-claims")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              Edit Medical Aid Claim
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Claim ID: {claim.id}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Claim summary</CardTitle>
          <CardDescription>
            Review and adjust the ICD-10 code and billed amount before sending the claim to the Medical Aid Portal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Patient</Label>
              <p className="text-sm font-medium">
                {claim.patientName || `${claim.firstName ?? ""} ${claim.lastName ?? ""}`.trim() || "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                Scheme: {claim.schemeName ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                Consultation: {format(consultDate, "dd MMM yyyy")}
              </p>
            </div>
            <div>
              <Label htmlFor="billAmount">Billed amount (R)</Label>
              <Input
                id="billAmount"
                type="number"
                min={0}
                value={billAmount}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setBillAmount(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Current billed amount: R {billedAmount.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="icd10">ICD-10 code</Label>
              <Input
                id="icd10"
                value={icd10Code}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setIcd10Code(e.target.value)}
                placeholder="e.g. J06.9"
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <Label htmlFor="diagnosisText">Diagnosis summary (read-only for now)</Label>
              <Textarea
                id="diagnosisText"
                value={diagnosisText}
                onChange={(e) => setDiagnosisText(e.target.value)}
                rows={4}
                className="mt-1 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => router.push("/dashboard/medical-aid-claims")}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button type="button" onClick={handleSendToPortal} disabled={sending}>
              {sending ? "Sending…" : "Send Claim to Medical Aid Portal"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

