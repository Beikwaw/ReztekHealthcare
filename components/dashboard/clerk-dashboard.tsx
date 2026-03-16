"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import { usePatients } from "@/lib/firestore-hooks"
import { addPatientAuditLog } from "@/lib/firebase"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import {
  Users,
  UserPlus,
  Clock,
  CalendarDays,
  ArrowRight,
  Activity,
  CheckCircle2,
  FilePlus,
  Receipt,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Patient } from "@/lib/types"

export function ClerkDashboard() {
  const { user } = useAuth()
  const { patients, loading, updatePatient } = usePatients()
  const router = useRouter()
  const searchParams = useSearchParams()
  const postRegistrationId = searchParams.get("postRegistration")
  const [postRegistrationOpen, setPostRegistrationOpen] = useState(false)
  const [postRegistrationPatient, setPostRegistrationPatient] = useState<Patient | null>(null)
  const [postRegistrationStep, setPostRegistrationStep] = useState<"options" | "completed">("options")
  const [postRegistrationLoading, setPostRegistrationLoading] = useState(false)
  
  // Get today's patients
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStart = today
  const todayPatients = patients.filter((p) => {
    if (!p.createdAt) return false
    const createdAt = p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt)
    return createdAt >= todayStart
  })
  
  // Get waiting patients
  const waitingPatients = patients.filter(p => p.status === "waiting")

  // Get completed patients
  const completedPatients = patients.filter(p => p.status === "completed")
  
  // Get recent patients (last 5)
  const recentPatients = [...patients]
    .sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : a.createdAt ? new Date(a.createdAt) : new Date(0)
      const dateB = b.createdAt instanceof Date ? b.createdAt : b.createdAt ? new Date(b.createdAt) : new Date(0)
      return dateB.getTime() - dateA.getTime()
    })
    .slice(0, 5)

  const stats = [
    {
      title: "Total Patients",
      value: patients.length,
      icon: Users,
      color: "bg-blue-500",
      description: "All registered patients",
    },
    {
      title: "Today's Registrations",
      value: todayPatients.length,
      icon: UserPlus,
      color: "bg-emerald-500",
      description: "New patients today",
    },
    {
      title: "Waiting List",
      value: waitingPatients.length,
      icon: Clock,
      color: "bg-amber-500",
      description: "Patients waiting to be seen",
    },
    {
      title: "Today's Date",
      value: new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "short" }),
      icon: CalendarDays,
      color: "bg-primary",
      description: new Date().toLocaleDateString("en-ZA", { weekday: "long" }),
    },
  ]

  useEffect(() => {
    if (!postRegistrationId) return
    const patient = patients.find((item) => item.id === postRegistrationId) || null
    if (patient) {
      setPostRegistrationPatient(patient)
      setPostRegistrationStep("options")
      setPostRegistrationOpen(true)
    }
  }, [postRegistrationId, patients])

  const clearPostRegistrationQuery = () => {
    router.replace("/dashboard")
  }

  const handleAddToRecords = async () => {
    if (!postRegistrationPatient) return
    setPostRegistrationLoading(true)
    try {
      await updatePatient(postRegistrationPatient.id, {
        status: "waiting",
      })
      if (user) {
        await addPatientAuditLog({
          patientId: postRegistrationPatient.id,
          patientName: postRegistrationPatient.name,
          action: "status-change",
          fromStatus: postRegistrationPatient.status,
          toStatus: "waiting",
          performedByUserId: user.id,
          performedByName: user.name,
          performedByRole: user.role,
        })
      }
      setPostRegistrationStep("completed")
      toast.success("Patient sent to waiting list successfully.")
    } catch (error) {
      console.error("Failed to finalize patient record:", error)
      toast.error("Failed to save patient records")
    } finally {
      setPostRegistrationLoading(false)
    }
  }

  const handleCreateBillAndSendToWaiting = () => {
    if (!postRegistrationPatient) return
    handleClosePostRegistration(false)
    router.push(`/dashboard/billing/new?patient=${postRegistrationPatient.id}`)
  }

  const handleClosePostRegistration = (open: boolean) => {
    setPostRegistrationOpen(open)
    if (!open) {
      clearPostRegistrationQuery()
    }
  }

  return (
    <div className="space-y-6">
      <Dialog open={postRegistrationOpen} onOpenChange={handleClosePostRegistration}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Patient registration complete</DialogTitle>
            <DialogDescription>
              Finalize registration for {postRegistrationPatient?.name || "this patient"}.
            </DialogDescription>
          </DialogHeader>
          {postRegistrationStep === "options" ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-border/60 p-4 space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Patient details</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate" title={postRegistrationPatient?.name}>
                      {postRegistrationPatient?.name || "Unknown patient"}
                    </p>
                    <p className="text-xs text-muted-foreground break-all">
                      {postRegistrationPatient?.patientNumber
                        ? `ID: ${postRegistrationPatient.patientNumber}`
                        : postRegistrationPatient?.idNumber
                        ? `ID: ${postRegistrationPatient.idNumber}`
                        : `Phone: ${postRegistrationPatient?.phone || "N/A"}`}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Contact</p>
                    <p className="text-sm text-foreground truncate break-all" title={postRegistrationPatient?.email}>
                      {postRegistrationPatient?.email || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
              {!postRegistrationPatient ? (
                <div className="rounded-lg border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                  Patient details are still loading. Please wait a moment.
                </div>
              ) : (
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                  <Button
                    className="h-auto min-h-[72px] flex items-start justify-start gap-3 rounded-lg border border-border/70 bg-background px-4 py-4 text-left whitespace-normal"
                    variant="outline"
                    onClick={handleCreateBillAndSendToWaiting}
                  >
                    <span className="shrink-0 rounded-md bg-blue-100 p-2 text-blue-700">
                      <Receipt className="h-5 w-5" />
                    </span>
                    <span className="space-y-0.5 min-w-0">
                      <span className="block text-sm font-semibold text-foreground leading-tight">
                        Create Bill &amp; Send to Waiting
                      </span>
                      <span className="block text-xs text-muted-foreground leading-snug">
                        Create a bill (details pre-filled), then patient is sent to waiting list on submit.
                      </span>
                    </span>
                  </Button>
                  <Button
                    className="h-auto min-h-[72px] flex items-start justify-start gap-3 rounded-lg border border-border/70 bg-background px-4 py-4 text-left whitespace-normal"
                    variant="outline"
                    onClick={handleAddToRecords}
                    disabled={postRegistrationLoading}
                  >
                    <span className="shrink-0 rounded-md bg-emerald-100 p-2 text-emerald-700">
                      <FilePlus className="h-5 w-5" />
                    </span>
                    <span className="space-y-0.5 min-w-0">
                      <span className="block text-sm font-semibold text-foreground leading-tight">
                        Send to Waiting Only
                      </span>
                      <span className="block text-xs text-muted-foreground leading-snug">
                        Add to patient records and waiting list without creating a bill now.
                      </span>
                    </span>
                  </Button>
                </div>
              )}
              <DialogFooter className="sm:justify-end">
                <Button variant="ghost" onClick={() => handleClosePostRegistration(false)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-border/60 p-4 space-y-2 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <p className="text-base font-semibold text-foreground">Patient sent to waiting list successfully</p>
                <p className="text-sm text-muted-foreground">
                  The patient record and portal profile are ready.
                </p>
              </div>
              <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (postRegistrationPatient) {
                      handleClosePostRegistration(false)
                      router.push(`/dashboard/billing/new?patient=${postRegistrationPatient.id}`)
                    }
                  }}
                >
                  <Receipt className="mr-2 h-4 w-4" />
                  Create a bill for this patient
                </Button>
                <Button onClick={() => handleClosePostRegistration(false)}>Done</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening at the practice today.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/patients/new">
            <UserPlus className="w-4 h-4 mr-2" />
            Register New Patient
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-border/50">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions & Recent Patients */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link 
              href="/dashboard/patients/new"
              className="flex items-center justify-between p-4 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Register New Patient</p>
                  <p className="text-sm text-muted-foreground">Add a new patient to the system</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
            
            <Link 
              href="/dashboard/patients"
              className="flex items-center justify-between p-4 rounded-xl bg-blue-500/5 hover:bg-blue-500/10 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Search Patients</p>
                  <p className="text-sm text-muted-foreground">Find existing patient records</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-blue-500 transition-colors" />
            </Link>

            <Link 
              href="/dashboard/waiting"
              className="flex items-center justify-between p-4 rounded-xl bg-amber-500/5 hover:bg-amber-500/10 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-foreground">View Waiting List</p>
                  <p className="text-sm text-muted-foreground">Manage patients waiting to be seen</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-amber-500 transition-colors" />
            </Link>
          </CardContent>
        </Card>

        {/* Recent Patients */}
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Recently Registered</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/patients">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Activity className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : recentPatients.length > 0 ? (
              <div className="space-y-3">
                {recentPatients.map((patient) => (
                  <div
                    key={patient.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-medium text-sm">
                          {patient.name
                            ? patient.name
                                .split(" ")
                                .map((n) => n.charAt(0))
                                .join("")
                                .substring(0, 2)
                                .toUpperCase()
                            : "??"}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">
                          {patient.name || "Unknown Patient"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {patient.patientNumber
                            ? `ID: ${patient.patientNumber}`
                            : patient.email
                            ? `Email: ${patient.email}`
                            : `Phone: ${patient.phone || "N/A"}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="secondary"
                        className={
                          patient.status === "waiting" 
                            ? "bg-amber-100 text-amber-700" 
                            : patient.status === "in-consultation"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-emerald-100 text-emerald-700"
                        }
                      >
                        {patient.status === "waiting" ? "Waiting" : patient.status === "in-consultation" ? "With Doctor" : "Completed"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">No patients registered yet</p>
                <Button size="sm" asChild className="mt-4">
                  <Link href="/dashboard/patients/new">Register First Patient</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
