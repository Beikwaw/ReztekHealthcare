"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { usePatients, useConsultations, useInvoices } from "@/lib/firestore-hooks"
import { addPatientAuditLog } from "@/lib/firebase"
import {
  Clock,
  Search,
  UserPlus,
  Stethoscope,
  Activity,
  AlertCircle,
  CheckCircle2,
  User,
  UserMinus,
  X,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function WaitingListPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { patients, loading, updatePatient } = usePatients()
  const { consultations } = useConsultations()
   const { invoices, updateInvoice } = useInvoices()
  const [searchQuery, setSearchQuery] = useState("")
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [newPatientBanner, setNewPatientBanner] = useState<{ name: string; arrivedAt: Date } | null>(null)
  const prevWaitingIdsRef = useRef<Set<string>>(new Set())
  const initialLoadRef = useRef(true)

  // Waiting list = patients currently with the DR (waiting + in-consultation) for both clerk and doctor
  const waitingPatients = patients
    .filter(p => p.status === "waiting" || p.status === "in-consultation")
    .sort((a, b) => {
      // Sort by status first (waiting before in-consultation), then by date
      if (a.status === "waiting" && b.status === "in-consultation") return -1
      if (a.status === "in-consultation" && b.status === "waiting") return 1
      const dateA = a.createdAt instanceof Date ? a.createdAt : a.createdAt ? new Date(a.createdAt) : new Date(0)
      const dateB = b.createdAt instanceof Date ? b.createdAt : b.createdAt ? new Date(b.createdAt) : new Date(0)
      return dateA.getTime() - dateB.getTime()
    })

  // New-patient banner (doctor only): when waiting list gains a patient, show once (not on initial load)
  useEffect(() => {
    if (user?.role !== "doctor" || loading) return
    const currentIds = new Set(waitingPatients.map((p) => p.id))
    if (initialLoadRef.current) {
      prevWaitingIdsRef.current = new Set(currentIds)
      initialLoadRef.current = false
      return
    }
    const prev = prevWaitingIdsRef.current
    const newIds = [...currentIds].filter((id) => !prev.has(id))
    if (newIds.length > 0) {
      const newPatient = waitingPatients.find((p) => p.id === newIds[0])
      if (newPatient) {
        const arrivedAt = newPatient.createdAt instanceof Date ? newPatient.createdAt : new Date(newPatient.createdAt)
        setNewPatientBanner({ name: newPatient.name || "Patient", arrivedAt })
        prevWaitingIdsRef.current = currentIds
        const t = setTimeout(() => setNewPatientBanner(null), 5000)
        return () => clearTimeout(t)
      }
    }
    prevWaitingIdsRef.current = currentIds
  }, [user?.role, loading, waitingPatients])

  // Filter by search (name, surname, patient number, email, phone)
  const searchLower = searchQuery.trim().toLowerCase()
  const filteredPatients = waitingPatients.filter((p) => {
    if (!searchLower) return true
    return (
      (p.name || "").toLowerCase().includes(searchLower) ||
      (p.firstName || "").toLowerCase().includes(searchLower) ||
      (p.lastName || "").toLowerCase().includes(searchLower) ||
      (p.patientNumber || "").toLowerCase().includes(searchLower) ||
      (p.email || "").toLowerCase().includes(searchLower) ||
      (p.phone || "").includes(searchLower)
    )
  })

  // Calculate wait time
  const getWaitTime = (createdAt: Date | string) => {
    const date = createdAt instanceof Date ? createdAt : new Date(createdAt)
    const diff = Date.now() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ${minutes % 60}min`
  }

  const isMedicalAidPatient = (p: any | null | undefined): boolean => {
    if (!p) return false
    if (p.paymentMethod === "medical-aid") return true
    if (p.medicalAidInfo?.name || p.medicalAidInfo?.memberNumber) return true
    if (p.insuranceInfo?.provider) return true
    return false
  }

  // Handle starting consultation (for doctor) — patient moves to in-consultation when consultation is saved
  const handleStartConsultation = async (patientId: string) => {
    try {
      router.push(`/dashboard/consultations/new?patient=${patientId}`)
    } catch (error) {
      console.error("Error starting consultation:", error)
      toast.error("Failed to start consultation. Please try again.")
    }
  }

  const handleRemoveFromWaitingList = async (patient: { id: string; name?: string; status?: string }) => {
    setRemovingId(patient.id)
    try {
      await updatePatient(patient.id, { status: "completed" })

      // If this is a medical-aid patient, automatically cancel the latest active invoice
      const fullPatient = patients.find((p) => p.id === patient.id)
      if (isMedicalAidPatient(fullPatient) && invoices.length > 0) {
        const activeInvoices = invoices
          .filter(
            (inv) =>
              inv.patientId === patient.id &&
              inv.status !== "paid" &&
              inv.status !== "cancelled",
          )
          .sort((a, b) => {
            const aDate = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)
            const bDate = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)
            return bDate.getTime() - aDate.getTime()
          })

        const latest = activeInvoices[0]
        if (latest) {
          try {
            await updateInvoice(latest.id, { status: "cancelled" })
          } catch (err) {
            console.error("Failed to cancel invoice for removed medical-aid patient:", err)
          }
        }
      }

      if (user) {
        await addPatientAuditLog({
          patientId: patient.id,
          patientName: patient.name || "Patient",
          action: "status-change",
          fromStatus: patient.status,
          toStatus: "completed",
          performedByUserId: user.id,
          performedByName: user.name,
          performedByRole: user.role,
        })
      }
      toast.success("Patient removed from waiting list.")
    } catch (error) {
      console.error("Error removing from waiting list:", error)
      toast.error("Failed to remove patient from waiting list.")
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" />
            {user?.role === "doctor" ? "Patient Queue" : "Waiting List"}
          </h1>
          <p className="text-muted-foreground">
            {waitingPatients.length} patient{waitingPatients.length !== 1 ? "s" : ""} with the doctor ({patients.filter(p => p.status === "waiting").length} waiting, {patients.filter(p => p.status === "in-consultation").length} in consultation)
          </p>
        </div>
        {user?.role === "clerk" && (
          <Button asChild>
            <Link href="/dashboard/patients/new">
              <UserPlus className="w-4 h-4 mr-2" />
              Register New Patient
            </Link>
          </Button>
        )}
      </div>

      {/* New-patient notification banner (doctor only) */}
      {user?.role === "doctor" && newPatientBanner && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <span className="text-foreground">
            <strong>New patient:</strong> {newPatientBanner.name} – arrived{" "}
            {newPatientBanner.arrivedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setNewPatientBanner(null)}
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Search */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, surname, or patient number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Waiting List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Activity className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredPatients.length > 0 ? (
        <div className="space-y-4">
          {filteredPatients.map((patient, index) => (
            <Card key={patient.id} className="border-border/50 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Queue Position */}
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold text-lg">#{index + 1}</span>
                    </div>
                    
                    {/* Patient Info */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">
                          {patient.name || "Unknown Patient"}
                        </h3>
                        {patient.status === "in-consultation" && (
                          <Badge variant="default" className="text-xs bg-blue-500">
                            In Consultation
                          </Badge>
                        )}
                        {patient.medicalHistory?.allergies && patient.medicalHistory.allergies.length > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Allergies
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {patient.patientNumber && (
                          <span>ID: {patient.patientNumber}</span>
                        )}
                        {patient.phone && (
                          <span>Phone: {patient.phone}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Waiting: {getWaitTime(patient.createdAt)}
                        </span>
                        {patient.insuranceInfo && (
                          <span className="capitalize">{patient.insuranceInfo.provider}</span>
                        )}
                        {patient.medicalAidNumber && !patient.insuranceInfo && (
                          <span>Medical Aid</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-16 sm:ml-0">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <User className="w-4 h-4 mr-1" />
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>{patient.name || "Unknown Patient"}</DialogTitle>
                          <DialogDescription>Patient Details</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            {patient.patientNumber && (
                              <div>
                                <p className="text-muted-foreground">Patient Number</p>
                                <p className="font-medium">{patient.patientNumber}</p>
                              </div>
                            )}
                            {patient.phone && (
                              <div>
                                <p className="text-muted-foreground">Phone</p>
                                <p className="font-medium">{patient.phone}</p>
                              </div>
                            )}
                            {patient.email && (
                              <div>
                                <p className="text-muted-foreground">Email</p>
                                <p className="font-medium">{patient.email}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-muted-foreground">Gender</p>
                              <p className="font-medium capitalize">{patient.gender || "Not specified"}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Medical Aid</p>
                              <p className="font-medium capitalize">
                                {patient.insuranceInfo?.provider || patient.medicalAidNumber || "None"}
                              </p>
                            </div>
                          </div>
                          {patient.medicalHistory?.allergies && patient.medicalHistory.allergies.length > 0 && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-2">Allergies</p>
                              <div className="flex flex-wrap gap-2">
                                {patient.medicalHistory.allergies.map((allergy: string) => (
                                  <Badge key={allergy} variant="destructive">{allergy}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {patient.medicalHistory?.chronicConditions && patient.medicalHistory.chronicConditions.length > 0 && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-2">Chronic Conditions</p>
                              <div className="flex flex-wrap gap-2">
                                {patient.medicalHistory.chronicConditions.map((condition: string) => (
                                  <Badge key={condition} variant="secondary">{condition}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {patient.medicalHistory?.currentMedications && patient.medicalHistory.currentMedications.length > 0 && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-2">Current Medications</p>
                              <div className="flex flex-wrap gap-2">
                                {patient.medicalHistory.currentMedications.map((med: string) => (
                                  <Badge key={med} variant="outline">{med}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    {user?.role === "doctor" && (
                      <>
                        {patient.status === "waiting" ? (
                          <Button 
                            size="sm"
                            onClick={() => handleStartConsultation(patient.id)}
                          >
                            <Stethoscope className="w-4 h-4 mr-1" />
                            Begin Consultation
                          </Button>
                        ) : (
                          <Button 
                            size="sm"
                            variant="default"
                            onClick={() => {
                              const activeConsultation = consultations.find(
                                c => c.patientId === patient.id && c.status === "in-progress"
                              )
                              if (activeConsultation) {
                                router.push(`/dashboard/consultations/${activeConsultation.id}`)
                              } else {
                                router.push(`/dashboard/consultations?patient=${patient.id}`)
                              }
                            }}
                          >
                            <Stethoscope className="w-4 h-4 mr-1" />
                            View Consultation
                          </Button>
                        )}
                      </>
                    )}
                    {(user?.role === "clerk" || user?.role === "doctor") && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={removingId === patient.id}
                            className="text-muted-foreground"
                          >
                            <UserMinus className="w-4 h-4 mr-1" />
                            {removingId === patient.id ? "Removing..." : "Remove"}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove from waiting list</AlertDialogTitle>
                            <AlertDialogDescription>
                              Remove {patient.name || "this patient"} from the waiting list? They will be marked as completed. This updates immediately for all users.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveFromWaitingList(patient)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-border/50">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No Patients Waiting</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery 
                ? "No patients match your search criteria." 
                : "All patients have been seen. Great work!"}
            </p>
            {user?.role === "clerk" && !searchQuery && (
              <Button asChild>
                <Link href="/dashboard/patients/new">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Register New Patient
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

