"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useData } from "@/lib/data-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react"
import type { InvoiceItem } from "@/lib/types"
import { toast } from "sonner"
import { getSafeClientErrorMessage } from "@/lib/client-errors"
import { ERROR_MESSAGES } from "@/lib/error-messages"
import { getPatient as getFirestorePatient } from "@/lib/firebase"
import { usePatients, useInvoices } from "@/lib/firestore-hooks"

function NewInvoiceForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedAppointment = searchParams.get("appointment") || ""
  const preselectedPatient = searchParams.get("patient") || ""

  const { addInvoice: addInvoiceContext, patients: contextPatients, getAppointment, doctors } = useData()
  const { patients: firestorePatients, updatePatient: updatePatientFirestore } = usePatients()
  const { addInvoice: addInvoiceFirestore, invoices: firestoreInvoices } = useInvoices()
  const patients = firestorePatients.length > 0 ? firestorePatients : contextPatients
  const [patientSearch, setPatientSearch] = useState("")
  const useFirestoreInvoices = firestorePatients.length > 0
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [prefilledPatient, setPrefilledPatient] = useState<{
    id: string
    name?: string
    patientNumber?: string
    idNumber?: string
    phone?: string
    email?: string
    cellPhone?: string
    paymentMethod?: "cash" | "card" | "medical-aid" | "bank-transfer"
  } | null>(null)

  const appointment = preselectedAppointment ? getAppointment(preselectedAppointment) : null
  const doctor = appointment ? doctors.find((d) => d.id === appointment.doctorId) : doctors[0]

  const selectedPatient = prefilledPatient
    ? { ...prefilledPatient, id: prefilledPatient.id }
    : patients.find((p) => p.id === (appointment?.patientId || preselectedPatient))
  const isPatientLocked = Boolean(preselectedPatient)

  // When opening with ?patient=id (Search Patients or post-registration), load patient and prefill
  useEffect(() => {
    if (!preselectedPatient) return
    const fromList = patients.find((p) => p.id === preselectedPatient)
    if (fromList) {
      setPrefilledPatient({
        id: fromList.id,
        name: fromList.name,
        patientNumber: fromList.patientNumber,
        idNumber: fromList.idNumber,
        phone: fromList.phone || fromList.cellPhone,
        email: fromList.email,
        cellPhone: fromList.cellPhone,
        paymentMethod: fromList.paymentMethod,
      })
      return
    }
    let isActive = true
    getFirestorePatient(preselectedPatient).then((patient) => {
      if (!isActive || !patient) return
      setPrefilledPatient({
        id: patient.id,
        name: patient.name,
        patientNumber: patient.patientNumber,
        idNumber: patient.idNumber,
        phone: patient.phone || patient.cellPhone,
        email: patient.email,
        cellPhone: patient.cellPhone,
        paymentMethod: patient.paymentMethod,
      })
    }).catch(() => setPrefilledPatient(null))
    return () => {
      isActive = false
    }
  }, [preselectedPatient, patients])

  const [formData, setFormData] = useState({
    patientId: appointment?.patientId || preselectedPatient || "",
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    discount: "0",
  })

  const [items, setItems] = useState<InvoiceItem[]>(
    appointment && doctor
      ? [
          {
            description: "Consultation Fee",
            quantity: 1,
            unitPrice: doctor.consultationFee,
            total: doctor.consultationFee,
          },
        ]
      : []
  )

  // Keep patientId in sync when URL has ?patient= (e.g. from Search or post-registration)
  useEffect(() => {
    if (preselectedPatient && formData.patientId !== preselectedPatient) {
      setFormData((prev) => ({ ...prev, patientId: preselectedPatient }))
    }
  }, [preselectedPatient, formData.patientId])

  // Set due date by payment method: cash = today, medical-aid = 30 days from today
  const patientForDueDate = selectedPatient && "paymentMethod" in selectedPatient ? selectedPatient : patients.find((p) => p.id === (formData.patientId || preselectedPatient))
  useEffect(() => {
    if (!patientForDueDate?.id) return
    const method = patientForDueDate.paymentMethod
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const cashDue = today.toISOString().split("T")[0]
    const medicalAidDue = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    const nextDue = method === "cash" ? cashDue : medicalAidDue
    setFormData((prev) => (prev.dueDate !== nextDue ? { ...prev, dueDate: nextDue } : prev))
  }, [patientForDueDate?.id, patientForDueDate?.paymentMethod, preselectedPatient, formData.patientId])

  // When opening with a preselected patient and no appointment, add one default line item so the form can be submitted
  useEffect(() => {
    if (!preselectedPatient || preselectedAppointment || items.length > 0) return
    const defaultDoctor = doctors[0]
    const fee = defaultDoctor?.consultationFee ?? 0
    setItems([
      {
        description: "Consultation Fee",
        quantity: 1,
        unitPrice: fee,
        total: fee,
      },
    ])
  }, [preselectedPatient, preselectedAppointment, doctors, items.length])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unitPrice: 0, total: 0 }])
  }

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items]
    const item = newItems[index]
    
    if (field === "description") {
      item.description = value as string
    } else if (field === "quantity") {
      item.quantity = Number(value) || 0
      item.total = item.quantity * item.unitPrice
    } else if (field === "unitPrice") {
      item.unitPrice = Number(value) || 0
      item.total = item.quantity * item.unitPrice
    }
    
    setItems(newItems)
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const subtotal = items.reduce((sum, item) => sum + item.total, 0)
  const discount = Number(formData.discount) || 0
  const total = subtotal - discount

  const effectivePatientId = formData.patientId || preselectedPatient
  const canSubmit = Boolean(effectivePatientId && items.length > 0 && items.some((i) => i.description.trim() !== ""))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!effectivePatientId || items.length === 0) {
      toast.error("Please select a patient and add at least one line item.")
      return
    }
    setIsSubmitting(true)

    try {
      const dueDate = new Date(formData.dueDate)
      const invoicePayload = {
        patientId: effectivePatientId,
        ...(preselectedAppointment ? { appointmentId: preselectedAppointment } : {}),
        items,
        subtotal,
        tax: 0,
        discount,
        total,
        status: "completed" as const,
        dueDate,
      }

      if (useFirestoreInvoices) {
        const id = await addInvoiceFirestore(invoicePayload)
        try {
          await updatePatientFirestore(effectivePatientId, { status: "waiting" })
        } catch (_) {
          // Non-blocking: invoice was created
        }
        toast.success("Bill created successfully. Patient sent to waiting list.")
        router.push(`/dashboard/billing/${id}`)
      } else {
        const invoice = addInvoiceContext(invoicePayload)
        try {
          await updatePatientFirestore(effectivePatientId, { status: "waiting" })
        } catch (_) {
          // Non-blocking
        }
        toast.success("Bill created successfully. Patient sent to waiting list.")
        router.push(`/dashboard/billing/${invoice.id}`)
      }
    } catch (err) {
      const message = getSafeClientErrorMessage(err, ERROR_MESSAGES.OPERATION_FAILED)
      toast.error(message)
      console.error("Create invoice error:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create New Invoice</h1>
          <p className="text-muted-foreground">
            Generate an invoice for a patient. After creating, you can download a PDF from the invoice view.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Patient Details</CardTitle>
                <CardDescription>
                  {isPatientLocked
                    ? "Patient details are prefilled and locked from search selection"
                    : "Confirm patient information for this invoice"}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label>Patient Name</Label>
                  <Input value={selectedPatient?.name || (isPatientLocked ? "Loading..." : "Select a patient")} disabled readOnly />
                </div>
                <div>
                  <Label>Patient Number</Label>
                  <Input
                    value={
                      selectedPatient?.patientNumber ||
                      selectedPatient?.idNumber ||
                      selectedPatient?.id ||
                      "N/A"
                    }
                    disabled
                    readOnly
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={selectedPatient?.phone || selectedPatient?.cellPhone || "N/A"} disabled readOnly />
                </div>
              </CardContent>
            </Card>
            {/* Basic Details */}
            <Card>
              <CardHeader>
                <CardTitle>Invoice Details</CardTitle>
                <CardDescription>
                  {isPatientLocked ? "Patient is fixed from search. Set due date and line items." : "Select the patient and set due date"}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {!isPatientLocked && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="patientSearch">Patient Search</Label>
                      <Input
                        id="patientSearch"
                        placeholder="Search by name or patient/ID number"
                        value={patientSearch}
                        onChange={(e) => setPatientSearch(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="patientId">Patient *</Label>
                      {selectedPatient && (
                        <p className="text-sm text-muted-foreground mb-2">
                          Selected: <span className="font-medium text-foreground">{selectedPatient.name}</span>
                        </p>
                      )}
                      <Select
                        value={formData.patientId}
                        onValueChange={(value) => handleSelectChange("patientId", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a patient" />
                        </SelectTrigger>
                        <SelectContent>
                          {patients
                            .filter((patient) => {
                              if (!patientSearch.trim()) return true
                              const term = patientSearch.trim().toLowerCase()
                              const name = (patient.name || "").toLowerCase()
                              const number = (patient.patientNumber || patient.idNumber || patient.id || "").toLowerCase()
                              return name.includes(term) || number.includes(term)
                            })
                            .map((patient) => (
                              <SelectItem key={patient.id} value={patient.id}>
                                {patient.name}{" "}
                                {patient.patientNumber || patient.idNumber
                                  ? `(${patient.patientNumber || patient.idNumber})`
                                  : ""}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                <div>
                  <Label htmlFor="dueDate">Due Date *</Label>
                  <Input
                    id="dueDate"
                    name="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={handleChange}
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Line Items</CardTitle>
                    <CardDescription>Add services and charges</CardDescription>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No items added. Click "Add Item" to start.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {items.map((item, index) => (
                      <div key={index} className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Label className="text-xs">Description</Label>
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(index, "description", e.target.value)}
                            placeholder="e.g., Consultation Fee"
                          />
                        </div>
                        <div className="w-20">
                          <Label className="text-xs">Qty</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, "quantity", e.target.value)}
                          />
                        </div>
                        <div className="w-28">
                          <Label className="text-xs">Unit Price (R)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                          />
                        </div>
                        <div className="w-28">
                          <Label className="text-xs">Total</Label>
                          <Input value={`R ${item.total.toLocaleString()}`} disabled />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Invoice Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>R {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="discount" className="text-muted-foreground">
                    Discount (R)
                  </Label>
                  <Input
                    id="discount"
                    name="discount"
                    type="number"
                    min="0"
                    value={formData.discount}
                    onChange={handleChange}
                    className="w-32 text-right"
                  />
                </div>
                <div className="flex justify-between pt-3 border-t font-bold text-lg">
                  <span>Total</span>
                  <span>R {total.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

        {/* Submit */}
        <div className="flex flex-col items-end gap-2">
          {!canSubmit && !isSubmitting && (
            <p className="text-sm text-muted-foreground">
              Select a patient and add at least one line item (with a description) to enable Create Invoice.
            </p>
          )}
          <Button
            type="submit"
            disabled={isSubmitting || !canSubmit}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Invoice"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12">Loading...</div>}>
      <NewInvoiceForm />
    </Suspense>
  )
}
