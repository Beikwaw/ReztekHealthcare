"use client"

import { use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { usePatients, useAppointments, useInvoices } from "@/lib/firestore-hooks"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { ArrowLeft, Receipt, CalendarDays, FileText } from "lucide-react"
import type { InvoiceStatus } from "@/lib/types"

const statusColors: Record<InvoiceStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  cancelled: "bg-orange-100 text-orange-800",
  completed: "bg-emerald-100 text-emerald-800",
}

export default function PatientBillingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuth()
  const { patients, loading } = usePatients()
  const { appointments } = useAppointments()
  const { invoices } = useInvoices()

  const patient = patients.find((p) => p.id === id)
  const patientInvoices = invoices.filter((inv) => inv.patientId === id)
  const patientAppointments = appointments
    .filter((apt) => apt.patientId === id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  if (user?.role !== "clerk" && user?.role !== "admin") {
    router.replace("/dashboard")
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild>
          <Link href="/dashboard/patients">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Patients
          </Link>
        </Button>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Patient not found.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/patients">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Patients
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Billing & Appointments</CardTitle>
          <CardDescription>
            {patient.name}
            {patient.patientNumber && ` · ${patient.patientNumber}`}
            {patient.idNumber && !patient.patientNumber && ` · ID: ${patient.idNumber}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href={`/dashboard/billing/new?patient=${id}`}>
                <FileText className="w-4 h-4 mr-2" />
                Create Invoice
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/appointments/new?patient=${id}`}>
                <CalendarDays className="w-4 h-4 mr-2" />
                Book Appointment
              </Link>
            </Button>
          </div>

          <div>
            <h3 className="font-semibold flex items-center gap-2 mb-2">
              <Receipt className="w-4 h-4" />
              Invoices
            </h3>
            {patientInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invoices for this patient.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patientInvoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-sm">{inv.id?.toUpperCase().slice(0, 8) ?? "—"}</TableCell>
                      <TableCell>{format(new Date(inv.createdAt), "MMM d, yyyy")}</TableCell>
                      <TableCell>{format(new Date(inv.dueDate), "MMM d, yyyy")}</TableCell>
                      <TableCell>R {Number(inv.total ?? 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[inv.status as InvoiceStatus]} variant="secondary">
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/billing/${inv.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div>
            <h3 className="font-semibold flex items-center gap-2 mb-2">
              <CalendarDays className="w-4 h-4" />
              Appointments
            </h3>
            {patientAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No appointments for this patient.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patientAppointments.slice(0, 20).map((apt) => (
                    <TableRow key={apt.id}>
                      <TableCell>{format(new Date(apt.date), "MMM d, yyyy")}</TableCell>
                      <TableCell>{apt.startTime} – {apt.endTime}</TableCell>
                      <TableCell>{apt.type}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{apt.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/appointments/${apt.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {patientAppointments.length > 20 && (
              <p className="text-xs text-muted-foreground mt-2">Showing latest 20 appointments.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
