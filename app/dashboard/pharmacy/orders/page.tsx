"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useConsultationsRealtime, usePatients } from "@/lib/firestore-hooks"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { format } from "date-fns"
import { Pill, Printer, Mail, FileText, ExternalLink } from "lucide-react"
import { toast } from "sonner"

const PHARMACY_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "dispensed", label: "Medication dispensed" },
  { value: "unavailable", label: "Medication unavailable" },
] as const

export default function PharmacyOrdersPage() {
  const { user } = useAuth()
  const { consultations, loading, updateConsultation } = useConsultationsRealtime()
  const { patients } = usePatients()

  const getPatientName = (patientId: string) =>
    patients.find((p) => p.id === patientId)?.name ?? "Unknown Patient"

  // Consultations with prescriptions (confirmed or sent-to-pharmacy)
  const prescriptionConsultations = consultations.filter(
    (c) =>
      (c.status === "confirmed" || c.status === "sent-to-pharmacy") &&
      ((c.prescription && c.prescription.length > 0) || (c as { scriptText?: string }).scriptText?.trim())
  )

  const [loadingPdf, setLoadingPdf] = useState<string | null>(null)
  const [emailSending, setEmailSending] = useState<string | null>(null)
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null)

  const handleViewPdf = async (consultationId: string) => {
    setLoadingPdf(consultationId)
    try {
      const res = await fetch("/api/prescription-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultationId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error((err as { error?: string }).error ?? "Could not load prescription PDF")
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, "_blank", "noopener,noreferrer")
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load prescription PDF")
    } finally {
      setLoadingPdf(null)
    }
  }

  const handlePrint = async (consultationId: string) => {
    setLoadingPdf(consultationId)
    try {
      const res = await fetch("/api/prescription-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultationId }),
      })
      if (!res.ok) {
        toast.error("Could not load prescription for printing")
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const w = window.open(url, "_blank", "noopener,noreferrer")
      if (w) w.onload = () => w.print()
      else toast.error("Allow pop-ups to print.")
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not print")
    } finally {
      setLoadingPdf(null)
    }
  }

  const handleEmailToPatient = async (consultationId: string) => {
    setEmailSending(consultationId)
    try {
      const res = await fetch("/api/send-prescription-to-patient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultationId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error((data as { error?: string }).error ?? "Failed to send email")
        return
      }
      toast.success("Prescription email sent successfully. The patient will receive the prescription at their registered email address.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send email")
    } finally {
      setEmailSending(null)
    }
  }

  const handleStatusChange = async (consultationId: string, value: "pending" | "dispensed" | "unavailable") => {
    setStatusUpdating(consultationId)
    try {
      await updateConsultation(consultationId, { pharmacyStatus: value })
      toast.success(value === "dispensed" ? "Marked as medication dispensed." : value === "unavailable" ? "Marked as medication unavailable." : "Status updated.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update status")
    } finally {
      setStatusUpdating(null)
    }
  }

  if (user?.role !== "pharmacy" && user?.role !== "admin") {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Pill className="w-6 h-6 text-primary" />
          Pharmacy Orders
        </h1>
        <p className="text-muted-foreground mt-1">
          Consultation prescriptions from doctors. Print or email to patient for external pharmacy.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prescriptions</CardTitle>
          <CardDescription>
            {prescriptionConsultations.length} prescription(s) from completed consultations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading…</div>
          ) : prescriptionConsultations.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground rounded-lg border border-dashed">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No prescriptions yet</p>
              <p className="text-sm mt-1">
                Prescriptions appear here when doctors complete consultations with medication.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Medications</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prescriptionConsultations
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((c) => {
                    const meds =
                      c.prescription?.map((p) => p.medication).filter(Boolean).join(", ") ||
                      (c as { scriptText?: string }).scriptText?.slice(0, 50) + "…" ||
                      "—"
                    const pharmacyStatus = (c as { pharmacyStatus?: "pending" | "dispensed" | "unavailable" }).pharmacyStatus ?? "pending"
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">
                          {getPatientName(c.patientId) || c.patientName || "—"}
                        </TableCell>
                        <TableCell>{format(new Date(c.createdAt), "dd MMM yyyy HH:mm")}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">{meds}</TableCell>
                        <TableCell>{c.doctorName ?? "—"}</TableCell>
                        <TableCell>
                          <Select
                            value={pharmacyStatus}
                            onValueChange={(v) => handleStatusChange(c.id, v as "pending" | "dispensed" | "unavailable")}
                            disabled={statusUpdating === c.id}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PHARMACY_STATUS_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={loadingPdf === c.id}
                              onClick={() => handleViewPdf(c.id)}
                              title="View prescription PDF"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={loadingPdf === c.id}
                              onClick={() => handlePrint(c.id)}
                              title="Print prescription"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={emailSending === c.id}
                              onClick={() => handleEmailToPatient(c.id)}
                              title="Email prescription to patient"
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
