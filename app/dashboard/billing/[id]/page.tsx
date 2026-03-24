"use client"

import { use, useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useData } from "@/lib/data-context"
import { usePatients } from "@/lib/firestore-hooks"
import { getInvoice as getFirestoreInvoice, updateInvoice as updateFirestoreInvoice, addBillingAuditLog } from "@/lib/firebase"
import type { Invoice } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { format } from "date-fns"
import {
  ArrowLeft,
  Send,
  CreditCard,
  Printer,
  Stethoscope,
  Mail,
} from "lucide-react"
import type { InvoiceStatus } from "@/lib/types"
import { toast } from "sonner"
import { getSafeClientErrorMessage } from "@/lib/client-errors"
import { ERROR_MESSAGES } from "@/lib/error-messages"
import { generateInvoicePdf } from "@/lib/invoice-pdf"
import Image from "next/image"
import { FileDown } from "lucide-react"

const statusColors: Record<InvoiceStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  cancelled: "bg-orange-100 text-orange-800",
  completed: "bg-emerald-100 text-emerald-800",
}

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { getInvoice: getContextInvoice, getPatient: getContextPatient, updateInvoice: updateContextInvoice, getAppointment, doctors } = useData()
  const { patients: firestorePatients } = usePatients()
  const getPatient = (patientId: string) => firestorePatients.find((p) => p.id === patientId) || getContextPatient(patientId)

  const [firestoreInvoice, setFirestoreInvoice] = useState<Invoice | null | undefined>(undefined)
  useEffect(() => {
    if (getContextInvoice(id)) return
    getFirestoreInvoice(id).then((inv) => {
      if (inv) {
        setFirestoreInvoice({
          ...inv,
          dueDate: inv.dueDate instanceof Date ? inv.dueDate : new Date(inv.dueDate),
          createdAt: inv.createdAt instanceof Date ? inv.createdAt : new Date(inv.createdAt),
          paidDate: inv.paidDate ? (inv.paidDate instanceof Date ? inv.paidDate : new Date(inv.paidDate)) : undefined,
        } as Invoice)
      } else {
        setFirestoreInvoice(null)
      }
    }).catch(() => setFirestoreInvoice(null))
  }, [id, getContextInvoice])

  const contextInvoice = getContextInvoice(id)
  const invoice = contextInvoice || (firestoreInvoice ?? null)

  if (invoice === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading invoice...</p>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold mb-2">Invoice Not Found</h2>
        <p className="text-muted-foreground mb-4">The invoice you're looking for doesn't exist.</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    )
  }

  const patient = getPatient(invoice.patientId)

  const getPatientPaymentType = (patientId: string): "cash" | "medical-aid" | "other" => {
    const p = getPatient(patientId)
    const method = p?.paymentMethod as string | undefined
    if (method === "cash") return "cash"
    if (method === "medical-aid") return "medical-aid"
    return "other"
  }

  const getInvoiceStatusLabel = (inv: Invoice) => {
    const paymentType = getPatientPaymentType(inv.patientId)
    if (paymentType === "medical-aid") {
      if (inv.status === "sent") return "Claim sent"
      if (inv.status === "completed") return "Claim completed"
    }
    return inv.status
  }
  const appointment = invoice.appointmentId ? getAppointment(invoice.appointmentId) : null
  const doctor = appointment ? doctors.find((d) => d.id === appointment.doctorId) : doctors[0]
  const consultationFeeIssuedDate = appointment?.date || invoice.createdAt
  const updateInvoice = contextInvoice
    ? updateContextInvoice
    : (invId: string, data: Partial<Invoice>) => {
        updateFirestoreInvoice(invId, data)
        setFirestoreInvoice((prev) => (prev ? { ...prev, ...data } : null))
      }

  const buildInvoiceMessage = () => {
    const itemsText = invoice.items
      .map((item) => `${item.description} x${item.quantity} - R ${item.total.toLocaleString()}`)
      .join("\n")
    return `Dear ${patient?.name || "Patient"},\n\nPlease find your invoice details below:\n\n${itemsText}\n\nTotal Due: R ${invoice.total.toLocaleString()}\n\nThank you.`
  }

  const handleSendEmail = () => {
    if (!patient?.email) {
      toast.error("Patient email is missing")
      return
    }
    const subject = encodeURIComponent(`Invoice ${String(invoice.id).toUpperCase()}`)
    const body = encodeURIComponent(buildInvoiceMessage())
    window.location.href = `mailto:${patient.email}?subject=${subject}&body=${body}`
    updateInvoice(invoice.id, { status: "completed" })
    toast.success("Invoice sent via email")
  }

  const handleSendWhatsapp = () => {
    const text = encodeURIComponent(buildInvoiceMessage())
    window.open(`https://wa.me/?text=${text}`, "_blank")
    updateInvoice(invoice.id, { status: "completed" })
    toast.success("Invoice sent via WhatsApp")
  }

  const handleMarkPaid = async () => {
    const previous = { ...invoice }
    const updates: Partial<Invoice> = {
      status: "paid",
      paidDate: new Date(),
      paymentMethod: "card",
    }

    await updateInvoice(invoice.id, updates)

    // Best-effort billing audit log
    try {
      const changedFields = Object.keys(updates)
      await addBillingAuditLog({
        invoiceId: invoice.id,
        patientId: invoice.patientId,
        patientName: patient?.name,
        changedFields,
        changes: undefined,
        performedByUserId: "", // filled via backend security rules; client ID optional
        performedByName: "",
        performedByRole: "admin",
      })
    } catch {
      // Non-blocking
    }
  }

  const handleDownloadPdf = async () => {
    try {
      await generateInvoicePdf(invoice, patient ?? null)
      toast.success("PDF downloaded")
    } catch (err) {
      toast.error(getSafeClientErrorMessage(err, ERROR_MESSAGES.PDF_GENERATION_FAILED))
    }
  }

  const handleEmailPdfToPatient = async () => {
    if (!patient?.email?.trim()) {
      toast.error("Patient email is missing. Add an email in patient details to send the PDF.")
      return
    }
    try {
      await generateInvoicePdf(invoice, patient ?? null)
      const subject = encodeURIComponent(`Invoice ${String(invoice.id).toUpperCase()} - Reztek Healthcare Practice`)
      const body = encodeURIComponent(
        `Dear ${patient?.name || "Patient"},\n\nPlease find your invoice attached.\n\nTotal Due: R ${invoice.total.toLocaleString()}\n\nThank you.\n\nReztek Healthcare Practice`
      )
      window.location.href = `mailto:${patient.email}?subject=${subject}&body=${body}`
      toast.success("PDF downloaded. Your email client will open – attach the PDF and send.")
    } catch (err) {
      toast.error(getSafeClientErrorMessage(err, ERROR_MESSAGES.PDF_GENERATION_FAILED))
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Invoice {invoice.id.toUpperCase()}</h1>
            <p className="text-muted-foreground">
              Created on {format(new Date(invoice.createdAt), "MMMM d, yyyy")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={`${statusColors[invoice.status]} text-sm px-3 py-1`}>
            {getInvoiceStatusLabel(invoice)}
          </Badge>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="space-y-6">
        {/* Practice letterhead – image and details clearly visible */}
        <Card className="print:shadow-none invoice-print overflow-hidden">
          <CardContent className="p-0">
            <div className="flex flex-col md:flex-row md:items-start gap-6 p-6">
              <div className="flex-shrink-0">
                <Image
                  src="/letterhead-full.png"
                  alt="Reztek Healthcare Practice letterhead"
                  width={600}
                  height={200}
                  className="w-full max-w-sm h-auto object-contain rounded border border-border/50 print:max-w-[280px]"
                  priority
                />
              </div>
              <div className="flex-1 grid gap-3 text-sm print:text-black">
                <p className="text-lg font-bold text-foreground">REZTEK HEALTHCARE PRACTICE</p>
                <p className="text-muted-foreground">Comprehensive Primary Care · Pr. No. 0000000</p>
                <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-border/50">
                  <div>
                    <p className="font-semibold text-foreground">CLINIC</p>
                    <p>123 Reztek Medical Centre, Central District</p>
                    <p>Johannesburg 2000 · Tel 010 000 0000</p>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">MAIN PRACTICE</p>
                    <p>456 Health Avenue</p>
                    <p>Johannesburg 2000 · Tel: 010 000 0001 / 010 000 0002</p>
                  </div>
                </div>
                <p className="text-muted-foreground">P.O. Box 1000, Johannesburg 2000 · E-mail: info@reztekhealth.example.com</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="print:shadow-none">
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
            <CardDescription>Generated invoice information</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Invoice No</p>
              <p className="font-medium">{invoice.id.toUpperCase()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Issued Date</p>
              <p className="font-medium">{format(new Date(invoice.createdAt), "dd/MM/yyyy")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Consultation Fee Issued</p>
              <p className="font-medium">{format(new Date(consultationFeeIssuedDate), "dd/MM/yyyy")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Due Date</p>
              <p className="font-medium">{format(new Date(invoice.dueDate), "dd/MM/yyyy")}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="print:shadow-none">
          <CardHeader>
            <CardTitle>Patient Details</CardTitle>
            <CardDescription>Patient information for this invoice</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Patient Name</p>
              <p className="font-medium">{patient?.name || "Unknown patient"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Patient ID</p>
              <p className="font-medium">{patient?.patientNumber || patient?.idNumber || patient?.id || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{patient?.phone || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{patient?.email || "N/A"}</p>
            </div>
          </CardContent>
        </Card>

        {appointment && (
          <Card className="print:shadow-none">
            <CardHeader>
              <CardTitle>Appointment Reference</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <p>
                <span className="text-muted-foreground">Service Date:</span>{" "}
                {format(new Date(appointment.date), "MMMM d, yyyy")} at {appointment.startTime}
              </p>
              <p>
                <span className="text-muted-foreground">Attending Doctor:</span> {doctor?.name}
              </p>
              <p>
                <span className="text-muted-foreground">Visit Type:</span>{" "}
                <span className="capitalize">{appointment.type.replace("-", " ")}</span>
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="print:shadow-none">
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
            <CardDescription>Services and charges</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50%]">Description</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">R {item.unitPrice.toLocaleString()}</TableCell>
                    <TableCell className="text-right">R {item.total.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="text-right">Subtotal</TableCell>
                  <TableCell className="text-right">R {invoice.subtotal.toLocaleString()}</TableCell>
                </TableRow>
                {invoice.discount > 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-right text-green-600">Discount</TableCell>
                    <TableCell className="text-right text-green-600">-R {invoice.discount.toLocaleString()}</TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-bold text-lg">Total Due</TableCell>
                  <TableCell className="text-right font-bold text-lg">R {invoice.total.toLocaleString()}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>
            Invoices are stored in your Firestore database. Download a PDF with the practice letterhead or print below.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={handleDownloadPdf} className="bg-primary">
            <FileDown className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
          <Button
            variant="outline"
            onClick={handleEmailPdfToPatient}
            disabled={!patient?.email?.trim()}
            title={patient?.email ? "Download PDF and open email to patient" : "Patient email required"}
          >
            <Mail className="mr-2 h-4 w-4" />
            Email PDF to Patient
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          {invoice.status !== "completed" && (
            <>
              <Button variant="outline" onClick={handleSendEmail}>
                <Send className="mr-2 h-4 w-4" />
                Email details (no attachment)
              </Button>
              <Button variant="outline" onClick={handleSendWhatsapp}>
                <Send className="mr-2 h-4 w-4" />
                WhatsApp
              </Button>
            </>
          )}
          
          {(invoice.status === "sent" || invoice.status === "overdue") && (
            <Button onClick={handleMarkPaid} className="bg-green-600 hover:bg-green-700">
              <CreditCard className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
          )}

          {patient && (
            <Button variant="outline" asChild>
              <Link href={`/dashboard/patients/${patient.id}`}>View Patient</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
