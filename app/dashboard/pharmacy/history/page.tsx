"use client"

import { useAuth } from "@/lib/auth-context"
import { useConsultations, usePatients } from "@/lib/firestore-hooks"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { format } from "date-fns"
import { Pill, FileText } from "lucide-react"

export default function PharmacyHistoryPage() {
  const { user } = useAuth()
  const { consultations, loading } = useConsultations()
  const { patients } = usePatients()

  const getPatientName = (patientId: string) =>
    patients.find((p) => p.id === patientId)?.name ?? "Unknown Patient"

  const prescriptionConsultations = consultations.filter(
    (c) =>
      (c.status === "confirmed" || c.status === "sent-to-pharmacy") &&
      ((c.prescription && c.prescription.length > 0) || (c as { scriptText?: string }).scriptText?.trim())
  )

  if (user?.role !== "pharmacy" && user?.role !== "admin") {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Pill className="w-6 h-6 text-primary" />
          Dispense History
        </h1>
        <p className="text-muted-foreground mt-1">
          All prescriptions sent from consultations. Use the Orders page to print or email.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prescription History</CardTitle>
          <CardDescription>{prescriptionConsultations.length} prescription(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading…</div>
          ) : prescriptionConsultations.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground rounded-lg border border-dashed">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No prescription history</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Doctor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prescriptionConsultations
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        {getPatientName(c.patientId) || c.patientName || "—"}
                      </TableCell>
                      <TableCell>{format(new Date(c.createdAt), "dd MMM yyyy HH:mm")}</TableCell>
                      <TableCell>{c.doctorName ?? "—"}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
