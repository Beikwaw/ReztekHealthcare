"use client"

import { useState } from "react"
import Link from "next/link"
import { useData } from "@/lib/data-context"
import { Button } from "@/components/ui/button"
import { FadeIn } from "@/components/animations/fade-in"
import { LoadingButton } from "@/components/feedback/loading-button"
import { TableSkeleton } from "@/components/feedback/skeletons"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { format, differenceInYears } from "date-fns"
import {
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  Edit,
  CalendarPlus,
  FileText,
  Trash2,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useSearchParams, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { usePatients, useAppointments, useDeletionRequests } from "@/lib/firestore-hooks"
import { Clock } from "lucide-react"
import { addPatientAuditLog } from "@/lib/firebase"
import { notifyError, notifySuccess, withLoadingToast } from "@/lib/toast-utils"

export default function PatientsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { patients: contextPatients } = useData()
  const { patients, loading: patientsLoading, updatePatient: updatePatientStatus } = usePatients()
  const { appointments } = useAppointments()
  const { createDeletionRequest } = useDeletionRequests()
  const [searchQuery, setSearchQuery] = useState("")
  const [requestDeletionDialogOpen, setRequestDeletionDialogOpen] = useState(false)
  const [patientToRequestDeletion, setPatientToRequestDeletion] = useState<typeof allPatients[0] | null>(null)
  const [patientForWaitingDialog, setPatientForWaitingDialog] = useState<typeof allPatients[0] | null>(null)
  const [sendToWaitingLoading, setSendToWaitingLoading] = useState(false)
  const [requestDeletionLoading, setRequestDeletionLoading] = useState(false)

  // Use Firestore patients if available, otherwise fall back to context
  const allPatients = patients.length > 0 ? patients : contextPatients
  const showTableSkeleton = patientsLoading && allPatients.length === 0

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredPatients = allPatients.filter((patient) => {
    if (!normalizedQuery) return true
    const name = patient.name?.toLowerCase() || ""
    const firstName = patient.firstName?.toLowerCase() || ""
    const lastName = patient.lastName?.toLowerCase() || ""
    const email = patient.email?.toLowerCase() || ""
    const phone = patient.phone || ""
    const patientId = patient.patientNumber || patient.idNumber || patient.id || ""

    return (
      name.includes(normalizedQuery) ||
      firstName.includes(normalizedQuery) ||
      lastName.includes(normalizedQuery) ||
      email.includes(normalizedQuery) ||
      phone.includes(normalizedQuery) ||
      patientId.toLowerCase().includes(normalizedQuery)
    )
  })

  const getAge = (dateOfBirth: Date) => {
    return differenceInYears(new Date(), new Date(dateOfBirth))
  }

  const getLastVisit = (patient: { id: string; lastVisitDate?: Date; visitHistory?: Date[] }) => {
    if (patient.lastVisitDate) {
      const d = patient.lastVisitDate instanceof Date ? patient.lastVisitDate : new Date(patient.lastVisitDate)
      return format(d, "MMM d, yyyy")
    }
    const history = patient.visitHistory || []
    if (history.length > 0) {
      const last = history[history.length - 1]
      return format(last instanceof Date ? last : new Date(last), "MMM d, yyyy")
    }
    const patientAppointments = appointments
      .filter((apt) => apt.patientId === patient.id && apt.status === "completed")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    if (patientAppointments.length > 0) {
      return format(new Date(patientAppointments[0].date), "MMM d, yyyy")
    }
    return "No visits yet"
  }

  const handleSendToWaitingOnly = async () => {
    if (!patientForWaitingDialog || !user) return
    setSendToWaitingLoading(true)
    try {
      await withLoadingToast("Updating patient status...", async () => {
        await updatePatientStatus(patientForWaitingDialog.id, { status: "waiting" })
        await addPatientAuditLog({
          patientId: patientForWaitingDialog.id,
          patientName: patientForWaitingDialog.name,
          action: "status-change",
          fromStatus: patientForWaitingDialog.status,
          toStatus: "waiting",
          performedByUserId: user.id,
          performedByName: user.name,
          performedByRole: user.role,
        })
      })
      notifySuccess("recordUpdated")
      setPatientForWaitingDialog(null)
    } catch (error) {
      console.error("Error sending patient to waiting list:", error)
      notifyError("apiFailed")
    } finally {
      setSendToWaitingLoading(false)
    }
  }

  const handleRequestDeletion = async () => {
    if (!patientToRequestDeletion || !user) return
    if (user.role !== "clerk") return
    setRequestDeletionLoading(true)
    try {
      await withLoadingToast("Submitting deletion request...", async () =>
        createDeletionRequest({
          patientId: patientToRequestDeletion.id,
          patientName: patientToRequestDeletion.name,
          requestedByUserId: user.id,
          requestedByName: user.name,
        })
      )
      notifySuccess("recordDeleted", "Deletion request submitted for admin approval.")
      setPatientToRequestDeletion(null)
      setRequestDeletionDialogOpen(false)
    } catch (error) {
      console.error("Failed to submit deletion request:", error)
      notifyError("firebaseWriteFailed")
    } finally {
      setRequestDeletionLoading(false)
    }
  }

  return (
    <FadeIn className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Patients</h1>
          <p className="text-muted-foreground">
            Manage patient records and medical information
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/patients/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Patient
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>All Patients</CardTitle>
              <CardDescription>{allPatients.length} total patients</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, surname, or patient number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {showTableSkeleton ? (
            <TableSkeleton rows={7} columns={7} />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Patient Number</TableHead>
                    <TableHead className="hidden md:table-cell">Age/Gender</TableHead>
                    <TableHead className="hidden sm:table-cell">Contact</TableHead>
                    <TableHead className="hidden lg:table-cell">Last Visit</TableHead>
                    <TableHead className="hidden lg:table-cell">Insurance</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {searchQuery ? "No patients found matching your search" : "No patients registered yet"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPatients.map((patient) => (
                      <TableRow key={patient.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{patient.name}</p>
                            <p className="text-xs text-muted-foreground md:hidden">
                              {patient.patientNumber || patient.idNumber || patient.id}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell font-mono text-sm">
                          {patient.patientNumber || patient.idNumber || patient.id}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {getAge(patient.dateOfBirth)} yrs, {patient.gender}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="text-sm">
                            <p>{patient.phone}</p>
                            <p className="text-muted-foreground text-xs">{patient.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {getLastVisit(patient)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {patient.insuranceInfo ? (
                            <Badge variant="secondary">{patient.insuranceInfo.provider}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">None</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/patients/${patient.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  {user?.role === "clerk" ? "View Details & Billing" : "View Details"}
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/patients/${patient.id}/edit`}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Patient
                                </Link>
                              </DropdownMenuItem>
                              {user?.role === "clerk" && (
                                <DropdownMenuItem onClick={() => setPatientForWaitingDialog(patient)}>
                                  <Clock className="mr-2 h-4 w-4" />
                                  Send to Waiting List
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/appointments/new?patient=${patient.id}`}>
                                  <CalendarPlus className="mr-2 h-4 w-4" />
                                  Book Appointment
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/billing/new?patient=${patient.id}`}>
                                  <FileText className="mr-2 h-4 w-4" />
                                  Create Invoice
                                </Link>
                              </DropdownMenuItem>
                              {user?.role === "clerk" && (
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => {
                                    setPatientToRequestDeletion(patient)
                                    setRequestDeletionDialogOpen(true)
                                  }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Request deletion
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send to Waiting List dialog */}
      <Dialog open={!!patientForWaitingDialog} onOpenChange={(open) => !open && setPatientForWaitingDialog(null)}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send to waiting list</DialogTitle>
            <DialogDescription className="text-wrap">
              Send {patientForWaitingDialog?.name || "this patient"} to the waiting list. Create a bill for this visit? (Details will be pre-filled.)
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setPatientForWaitingDialog(null)}
            >
              Cancel
            </Button>
            <LoadingButton
              variant="secondary"
              onClick={handleSendToWaitingOnly}
              isLoading={sendToWaitingLoading}
              loadingText="Sending..."
            >
              Send to Waiting Only
            </LoadingButton>
            <Button
              onClick={() => {
                if (patientForWaitingDialog) {
                  setPatientForWaitingDialog(null)
                  router.push(`/dashboard/billing/new?patient=${patientForWaitingDialog.id}`)
                }
              }}
            >
              <FileText className="mr-2 h-4 w-4" />
              Create Bill &amp; Send to Waiting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request deletion dialog (clerk only) */}
      <AlertDialog open={requestDeletionDialogOpen} onOpenChange={setRequestDeletionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Request patient deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Submit a deletion request for {patientToRequestDeletion?.name || "this patient"}? An admin must approve before the patient and all related records are permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPatientToRequestDeletion(null)}>Cancel</AlertDialogCancel>
            <LoadingButton
              onClick={handleRequestDeletion}
              isLoading={requestDeletionLoading}
              loadingText="Submitting..."
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Request deletion
            </LoadingButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FadeIn>
  )
}
