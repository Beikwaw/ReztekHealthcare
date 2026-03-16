"use client"

import { useMemo, useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { format } from "date-fns"
import { toast } from "sonner"
import { ArrowLeft, FileText, Loader2, Download, Pencil, FileDown, Trash2, Clock, CheckCircle2, Mail } from "lucide-react"

import { useAuth } from "@/lib/auth-context"
import { useMedicalAidClaim } from "@/lib/firestore-hooks"
import type { MedicalAidClaim } from "@/lib/types"
import { BILLABLE_ITEMS } from "@/lib/medical-aid-billable-items"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type OutcomeType = "PAID" | "PARTIALLY_PAID" | "REJECTED"

const PRACTICE_NAME = "DR WC MKHONZA HEALTH PRACTICE"

const statusBadgeVariant = (status: MedicalAidClaim["status"]): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "PAID":
      return "default"
    case "PARTIALLY_PAID":
      return "secondary"
    case "REJECTED":
      return "destructive"
    default:
      return "outline"
  }
}

export default function MedicalAidClaimDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const claimId = params?.id

  const { firebaseUser } = useAuth()
  const { claim, loading, error, refetch } = useMedicalAidClaim(claimId)

  const [outcome, setOutcome] = useState<OutcomeType>("PAID")
  const [paidAmount, setPaidAmount] = useState<string>("")
  const [notes, setNotes] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [editBillingOpen, setEditBillingOpen] = useState(false)
  const [editBillAmount, setEditBillAmount] = useState<string>("")
  const [editProcedureCode, setEditProcedureCode] = useState<string>("")
  const [editBillingSaving, setEditBillingSaving] = useState(false)
  const [addItemLoading, setAddItemLoading] = useState(false)
  const [removingIndex, setRemovingIndex] = useState<number | null>(null)
  const [xmlExportOpen, setXmlExportOpen] = useState(false)
  const [xmlExporting, setXmlExporting] = useState(false)
  const [editOverride, setEditOverride] = useState(false)
  const [addItemOpen, setAddItemOpen] = useState(false)
  const [addItemId, setAddItemId] = useState<string>("")
  const [addItemAmount, setAddItemAmount] = useState<string>("")
  const [markPendingLoading, setMarkPendingLoading] = useState(false)
  const [patientInfo, setPatientInfo] = useState<{
    dateOfBirth: string | null
    dependentCode: string | null
    mainMemberName: string | null
    mainMemberIdNumber: string | null
    plan: string | null
  } | null>(null)

  const isCompleted = !!claim?.outcomeRecordedAt
  const canEditBilling = !isCompleted || editOverride

  const billedAmount = useMemo(() => {
    const v = Number(claim?.billAmount ?? claim?.totalAmountClaimed ?? 0)
    return Number.isFinite(v) ? v : 0
  }, [claim?.billAmount, claim?.totalAmountClaimed])

  const billItems = useMemo(() => {
    if (claim?.billItems && claim.billItems.length > 0) {
      return claim.billItems
    }
    return [{ description: "Consultation", amount: billedAmount }]
  }, [claim?.billItems, billedAmount])

  const totalAmount = useMemo(() => {
    return billItems.reduce((sum, i) => sum + (i.amount ?? 0), 0)
  }, [billItems])

  const canSubmit = useMemo(() => {
    if (!claimId) return false
    if (!claim) return false
    if (outcome === "PAID") return true
    if (outcome === "REJECTED") return true
    const n = Number(paidAmount)
    return Number.isFinite(n) && n >= 0 && n < totalAmount
  }, [claimId, claim, outcome, paidAmount, totalAmount])

  const existingItemNames = useMemo(
    () => new Set(billItems.map((i) => i.description)),
    [billItems]
  )
  const availableItems = BILLABLE_ITEMS.filter((item) => !existingItemNames.has(item.name))

  const fetchPdfUrl = async (): Promise<string | null> => {
    if (!claimId) return null
    try {
      const res = await fetch("/api/medical-aid-claim-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId, type: "pdf" }),
      })
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        toast.error(data.error || "Consultation PDF not available for this claim.")
        return null
      }
      return data.url
    } catch {
      toast.error("Failed to open consultation PDF.")
      return null
    }
  }

  const handleViewPdf = async () => {
    setPdfLoading(true)
    try {
      const url = await fetchPdfUrl()
      if (!url) return
      if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer")
    } finally {
      setPdfLoading(false)
    }
  }

  const handleDownloadPdf = async () => {
    setPdfLoading(true)
    try {
      const url = await fetchPdfUrl()
      if (!url) return
      if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer")
    } finally {
      setPdfLoading(false)
    }
  }

  const submitOutcome = async () => {
    if (!claimId || !firebaseUser) {
      toast.error("You are not signed in.")
      router.replace("/login")
      return
    }
    if (!canSubmit) {
      toast.error(outcome === "PARTIALLY_PAID" ? "Enter a valid paid amount (less than billed amount)." : "Please review the outcome details.")
      return
    }
    setSubmitting(true)
    try {
      const token = await firebaseUser.getIdToken()
      const payload: Record<string, unknown> = { claimId, type: outcome, notes: notes.trim() || null }
      if (outcome === "PARTIALLY_PAID") payload.paidAmount = Number(paidAmount)
      if (outcome === "PAID" && paidAmount.trim() !== "") payload.paidAmount = Number(paidAmount)

      const res = await fetch("/api/medical-aid-claim-outcome", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; invoiceId?: string }
      if (!res.ok) {
        toast.error(data?.error || "Failed to record outcome.")
        return
      }
      const invoiceLabel = data.invoiceId ? ` Invoice ${String(data.invoiceId).toUpperCase()} created.` : ""
      toast.success(`Outcome recorded. Confirmation message has been sent to the patient's email.${invoiceLabel}`)
      await refetch()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to record outcome.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditBillingOpen = () => {
    setEditBillAmount(String(claim?.billAmount ?? claim?.totalAmountClaimed ?? ""))
    setEditProcedureCode(claim?.procedureCode ?? claim?.proceduresText ?? "")
  }

  const handleSaveBilling = async () => {
    if (!claimId || !firebaseUser) return
    const numericBill = Number(editBillAmount)
    if (!Number.isFinite(numericBill) || numericBill < 0) {
      toast.error("Enter a valid billed amount.")
      return
    }
    setEditBillingSaving(true)
    try {
      const token = await firebaseUser.getIdToken()
      let body: Record<string, unknown> = {
        claimId,
        overrideCompleted: isCompleted && editOverride,
        procedureCode: editProcedureCode.trim() || null,
      }
      if (claim?.billItems && claim.billItems.length > 0) {
        const rest = claim.billItems.slice(1)
        const restSum = rest.reduce((s, i) => s + (i.amount ?? 0), 0)
        const firstAmount = Math.max(0, numericBill - restSum)
        const newItems = [
          { description: claim.billItems[0].description, amount: firstAmount },
          ...rest.map((i) => ({ description: i.description, amount: i.amount })),
        ]
        body.billItems = newItems
      } else {
        body.billAmount = numericBill
        body.totalAmountClaimed = numericBill
      }
      const res = await fetch("/api/medical-aid-claim-update-billing", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast.error(data?.error || "Failed to update billing.")
        return
      }
      toast.success("Billing successfully updated.")
      setEditBillingOpen(false)
      await refetch()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update billing.")
    } finally {
      setEditBillingSaving(false)
    }
  }

  useEffect(() => {
    if (!claimId || !firebaseUser || !claim) return
    const dob = claim.patientDateOfBirth
    const hasDob = dob && (dob instanceof Date ? !Number.isNaN(dob.getTime()) : true)
    if (!hasDob || (claim as { dependentCode?: string }).dependentCode === undefined) {
      firebaseUser.getIdToken().then((token) => {
        fetch(`/api/medical-aid-claim-patient-info?claimId=${claimId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.dateOfBirth !== undefined || data.dependentCode !== undefined) {
              setPatientInfo({
                dateOfBirth: data.dateOfBirth ?? null,
                dependentCode: data.dependentCode ?? null,
                mainMemberName: data.mainMemberName ?? null,
                mainMemberIdNumber: data.mainMemberIdNumber ?? null,
                plan: data.plan ?? null,
              })
            }
          })
          .catch(() => {})
      })
    }
  }, [claimId, firebaseUser, claim])

  const handleAddBillingItem = async () => {
    if (!claimId || !firebaseUser || !addItemId) return
    const amt = Number(addItemAmount)
    if (!Number.isFinite(amt) || amt < 0) {
      toast.error("Enter a valid amount.")
      return
    }
    setAddItemLoading(true)
    try {
      const token = await firebaseUser.getIdToken()
      const res = await fetch("/api/medical-aid-claim-update-billing", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          claimId,
          itemId: addItemId,
          amount: amt,
          overrideCompleted: isCompleted && editOverride,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast.error(data?.error || "Failed to add item.")
        return
      }
      toast.success("Item successfully added to the claim.")
      setAddItemOpen(false)
      setAddItemId("")
      setAddItemAmount("")
      await refetch()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add item.")
    } finally {
      setAddItemLoading(false)
    }
  }

  const handleRemoveBillingItem = async (index: number) => {
    if (!claimId || !firebaseUser) return
    if (billItems.length <= 1) return
    setRemovingIndex(index)
    try {
      const token = await firebaseUser.getIdToken()
      const res = await fetch("/api/medical-aid-claim-update-billing", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          claimId,
          removeItemIndex: index,
          overrideCompleted: isCompleted && editOverride,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast.error(data?.error || "Failed to remove item.")
        return
      }
      toast.success("Billing item removed.")
      await refetch()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to remove item.")
    } finally {
      setRemovingIndex(null)
    }
  }

  const handleMarkPending = async () => {
    if (!claimId || !firebaseUser) return
    setMarkPendingLoading(true)
    try {
      const token = await firebaseUser.getIdToken()
      const res = await fetch("/api/medical-aid-claim-update-billing", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          claimId,
          markedPending: true,
          overrideCompleted: isCompleted && editOverride,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast.error(data?.error || "Failed to mark as pending.")
        return
      }
      toast.success("Claim marked as pending.")
      await refetch()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to mark as pending.")
    } finally {
      setMarkPendingLoading(false)
    }
  }

  const handleExportXml = async () => {
    if (!claimId || !firebaseUser) return
    setXmlExporting(true)
    try {
      const token = await firebaseUser.getIdToken()
      const res = await fetch("/api/medical-aid-claim-export-xml", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ claimId }),
      })
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
      if (!res.ok) {
        toast.error(data?.error || "Failed to export XML.")
        return
      }
      if (data.url && typeof window !== "undefined") {
        window.open(data.url, "_blank", "noopener,noreferrer")
      }
      toast.success("XML claim successfully generated and downloaded.")
      setXmlExportOpen(false)
      await refetch()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to export XML.")
    } finally {
      setXmlExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading claim…
      </div>
    )
  }
  if (error) return <div className="py-8 text-center text-destructive">{error.message}</div>
  if (!claim) return <div className="py-8 text-center text-muted-foreground">Claim not found.</div>

  const status = claim.status ?? "SUBMITTED"
  const consultDate = claim.consultationDate instanceof Date ? claim.consultationDate : new Date(claim.consultationDate)
  const patientFullName = claim.patientName || `${claim.firstName ?? ""} ${claim.lastName ?? ""}`.trim() || "—"
  const patientDob = (() => {
    const dob = claim.patientDateOfBirth
    if (dob) {
      const d = dob instanceof Date ? dob : new Date(dob)
      return !Number.isNaN(d.getTime()) ? format(d, "dd MMM yyyy") : null
    }
    return patientInfo?.dateOfBirth
      ? format(new Date(patientInfo.dateOfBirth), "dd MMM yyyy")
      : null
  })() ?? "—"
  const dependentCode =
    (claim as { dependentCode?: string }).dependentCode ??
    patientInfo?.dependentCode ??
    "—"
  const plan =
    (claim as { plan?: string }).plan ??
    patientInfo?.plan ??
    "—"
  const mainMemberName =
    claim.mainMemberFullName ??
    patientInfo?.mainMemberName ??
    "—"
  const mainMemberIdNumber =
    claim.mainMemberIdNumber ??
    patientInfo?.mainMemberIdNumber ??
    "—"
  const doctorName = claim.createdByName ?? "Dr Winston Mkhonza"

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/medical-aid/claims")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              Claim details
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Claim ID: {claim.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isCompleted && !editOverride && (
            <Button variant="outline" size="sm" onClick={() => setEditOverride(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Claim
            </Button>
          )}
          {editOverride && (
            <Button variant="ghost" size="sm" onClick={() => setEditOverride(false)}>
              Cancel Edit
            </Button>
          )}
          <Badge variant={statusBadgeVariant(status)} className="h-7">
            {status}
          </Badge>
          {isCompleted && (
            <Badge variant="secondary" className="h-7">
              Completed
            </Badge>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Consultation PDF</CardTitle>
          <CardDescription>Open the consultation medical-aid form PDF before recording the billing outcome.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleViewPdf} disabled={pdfLoading}>
              {pdfLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Opening…
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  View consultation PDF
                </>
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDownloadPdf} disabled={pdfLoading} title="Download consultation PDF">
              <Download className="h-4 w-4 mr-1.5" />
              Download
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Patient Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Full Name: </span>
              <span className="font-medium">{patientFullName}</span>
            </div>
            <div>
              <span className="text-muted-foreground">ID Number: </span>
              <span>{claim.idNumber ?? "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Date of Birth: </span>
              <span>{patientDob}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Dependent Code: </span>
              <span>{dependentCode}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Email: </span>
              <span>{claim.patientEmail ?? "—"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Medical Aid Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Scheme: </span>
              <span className="font-medium">{claim.schemeName ?? "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Membership Number: </span>
              <span>{claim.membershipNumber ?? "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Plan: </span>
              <span>{plan}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Main Member Name: </span>
              <span>{mainMemberName}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Main Member ID: </span>
              <span>{mainMemberIdNumber}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Main Member Tel: </span>
              <span>{claim.mainMemberTel ?? "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Main Member Address: </span>
              <span>{claim.mainMemberAddress ?? "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Main Member Email: </span>
              <span>{claim.mainMemberEmail ?? "—"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Doctor / Practice Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Doctor Name: </span>
              <span className="font-medium">{doctorName}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Practice Name: </span>
              <span>{PRACTICE_NAME}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Practice Number: </span>
              <span>{claim.practiceNumber ?? "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">HPCSA Number: </span>
              <span>{claim.doctorHpcsaNumber ?? "—"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Consultation Summary</CardTitle>
          <CardDescription>Date, type, and services rendered.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <span className="text-muted-foreground">Consultation Date: </span>
            <span className="font-medium">{format(consultDate, "dd MMM yyyy")}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Consultation Type: </span>
            <span>{claim.servicesRendered ?? "GP Outpatient Consultation"}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Diagnosis and ICD10 Code</CardTitle>
          <CardDescription>Primary diagnosis and ICD-10 codes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Primary diagnosis</span>
            {claim.icd10Code && (
              <span className="text-xs font-mono text-muted-foreground">ICD-10: {claim.icd10Code}</span>
            )}
          </div>
          {claim.diagnosisLines && claim.diagnosisLines.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {claim.diagnosisLines.map((row, index) => (
                <li key={index} className="flex items-start justify-between gap-2">
                  <span>
                    {index + 1}. {row.line}
                  </span>
                  {row.icd10 && (
                    <span className="text-xs font-mono text-muted-foreground">{row.icd10}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{claim.clinicalSummaryShort || "No structured diagnosis captured."}</p>
          )}
          {(claim.injectionsText || claim.proceduresText) && (
            <div className="grid gap-4 md:grid-cols-2 pt-2">
              {claim.injectionsText && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Injections</p>
                  <p className="text-sm whitespace-pre-wrap">{claim.injectionsText}</p>
                </div>
              )}
              {claim.proceduresText && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Procedures</p>
                  <p className="text-sm whitespace-pre-wrap">{claim.proceduresText}</p>
                </div>
              )}
            </div>
          )}
          {claim.materials && (
            <div className="pt-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Materials</p>
              <div className="grid gap-2 md:grid-cols-2 text-sm">
                {claim.materials.syringeNeedle && (
                  <div>
                    <span className="text-muted-foreground">Syringe &amp; Needle: </span>
                    <span>{claim.materials.syringeNeedle}</span>
                  </div>
                )}
                {claim.materials.swab && (
                  <div>
                    <span className="text-muted-foreground">Swab: </span>
                    <span>{claim.materials.swab}</span>
                  </div>
                )}
                {claim.materials.glove && (
                  <div>
                    <span className="text-muted-foreground">Glove: </span>
                    <span>{claim.materials.glove}</span>
                  </div>
                )}
                {claim.materials.bandage && (
                  <div>
                    <span className="text-muted-foreground">Bandage: </span>
                    <span>{claim.materials.bandage}</span>
                  </div>
                )}
                {claim.materials.other && (
                  <div className="md:col-span-2">
                    <span className="text-muted-foreground">Other: </span>
                    <span>{claim.materials.other}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          {Array.isArray(claim.medications) && claim.medications.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Medicines</p>
              <div className="space-y-1 text-sm">
                {claim.medications.map((m, index) => (
                  <div key={index} className="flex items-start justify-between gap-2 border rounded-md px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{m.name}</p>
                      {(m.dosage || m.instructions) && (
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                          {[m.dosage, m.instructions].filter(Boolean).join(" – ")}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                      {m.quantity && <div>Qty: {m.quantity}</div>}
                      {m.duration && <div>Duration: {m.duration}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Billing Table</CardTitle>
              <CardDescription>Line items and total claim amount.</CardDescription>
            </div>
            {claim?.markedPendingAt && (
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                Pending
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  {canEditBilling && <TableHead className="w-[80px]">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {billItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">R {Number(item.amount ?? 0).toLocaleString()}</TableCell>
                    {canEditBilling && (
                      <TableCell>
                        {billItems.length > 1 ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleRemoveBillingItem(index)}
                            disabled={removingIndex !== null}
                          >
                            {removingIndex === index ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        ) : null}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                <TableRow className="font-semibold">
                  <TableCell>Total Amount</TableCell>
                  <TableCell className="text-right">R {totalAmount.toLocaleString()}</TableCell>
                  {canEditBilling && <TableCell />}
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {canEditBilling && (
            <div className="flex flex-wrap gap-2 items-center">
              <Dialog open={addItemOpen} onOpenChange={(open) => { setAddItemOpen(open); if (!open) { setAddItemId(""); setAddItemAmount("") } }}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={availableItems.length === 0}>
                    Add Billing Item
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Billing Item</DialogTitle>
                    <DialogDescription>Select an item and enter the amount manually.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Item</Label>
                      <select
                        className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={addItemId}
                        onChange={(e) => setAddItemId(e.target.value)}
                      >
                        <option value="">Select item</option>
                        {availableItems.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="addItemAmount">Amount (R)</Label>
                      <Input
                        id="addItemAmount"
                        type="number"
                        min={0}
                        value={addItemAmount}
                        onChange={(e) => setAddItemAmount(e.target.value)}
                        placeholder="Enter amount"
                        className="mt-2"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddItemOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddBillingItem}
                      disabled={addItemLoading || !addItemId || !addItemAmount || Number(addItemAmount) < 0}
                    >
                      {addItemLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding…
                        </>
                      ) : (
                        "Add Item"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={editBillingOpen} onOpenChange={(open) => { setEditBillingOpen(open); if (open) handleEditBillingOpen() }}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Billing
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Billing</DialogTitle>
                    <DialogDescription>Update the consultation or total billed amount.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="editBillAmount">Billed amount (R)</Label>
                      <Input
                        id="editBillAmount"
                        type="number"
                        min={0}
                        value={editBillAmount}
                        onChange={(e) => setEditBillAmount(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="editProcedureCode">Procedure code (e.g. ECR)</Label>
                      <Input
                        id="editProcedureCode"
                        value={editProcedureCode}
                        onChange={(e) => setEditProcedureCode(e.target.value)}
                        placeholder="ECR or leave empty"
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Clear to remove from XML.</p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEditBillingOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveBilling} disabled={editBillingSaving}>
                      {editBillingSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving…
                        </>
                      ) : (
                        "Save"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkPending}
                disabled={markPendingLoading}
              >
                {markPendingLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Clock className="mr-2 h-4 w-4" />
                )}
                Mark as Pending
              </Button>
              <AlertDialog open={xmlExportOpen} onOpenChange={setXmlExportOpen}>
                <Button variant="default" size="sm" onClick={() => setXmlExportOpen(true)}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Generate XML
                </Button>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Finalize and export claim</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to finalize and export this claim? This will generate an XML file for submission and move the claim to Completed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleExportXml} disabled={xmlExporting}>
                      {xmlExporting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Exporting…
                        </>
                      ) : (
                        "Export XML"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {!canEditBilling && (
            <p className="text-sm text-muted-foreground">This claim is completed. Click &quot;Edit Claim&quot; to make changes.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Record outcome</CardTitle>
          <CardDescription>This will update the claim and automatically email the patient with the relevant PDF.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isCompleted ? (
            <>
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/30 p-4">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600 dark:text-green-500" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">Completed</p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Confirmation message has been sent to the patient&apos;s email.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-muted bg-muted/30 p-4">
                <Mail className="h-5 w-5 shrink-0 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Email sent to patient with outcome and PDF.</p>
              </div>
              {claim?.outcomeNotes && (
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Internal note (portal only)</Label>
                  <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">{claim.outcomeNotes}</p>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label>Outcome</Label>
                  <select
                    className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value as OutcomeType)}
                  >
                    <option value="PAID">PAID</option>
                    <option value="PARTIALLY_PAID">PARTIALLY_PAID</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <Label>
                    Paid amount (R){" "}
                    <span className="text-muted-foreground">{outcome === "PARTIALLY_PAID" ? "(required)" : "(optional)"}</span>
                  </Label>
                  <Input
                    className="mt-2"
                    inputMode="decimal"
                    placeholder={outcome === "REJECTED" ? "0" : totalAmount.toString()}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    disabled={outcome === "REJECTED"}
                  />
                  {outcome === "PARTIALLY_PAID" && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Paid amount must be less than billed amount (R {totalAmount.toLocaleString()}).
                    </p>
                  )}
                </div>
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Textarea className="mt-2" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes (not shown on claim PDF). Visible only in this portal." />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => refetch()} disabled={submitting}>
                  Refresh
                </Button>
                <Button onClick={submitOutcome} disabled={!canSubmit || submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Recording…
                    </>
                  ) : (
                    "Record outcome"
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
