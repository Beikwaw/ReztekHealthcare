"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { DashboardHero, dashboardQuickActionClass, dashboardListRowClass } from "@/components/dashboard/dashboard-hero"
import { DashboardPanel } from "@/components/dashboard/dashboard-card"
import { StatCard } from "@/components/dashboard/stat-card"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import { usePatients } from "@/lib/firestore-hooks"
import { addPatientAuditLog } from "@/lib/firebase"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import type { LucideIcon } from "lucide-react"
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

  // Get recent patients (last 5)
  const recentPatients = [...patients]
    .sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : a.createdAt ? new Date(a.createdAt) : new Date(0)
      const dateB = b.createdAt instanceof Date ? b.createdAt : b.createdAt ? new Date(b.createdAt) : new Date(0)
      return dateB.getTime() - dateA.getTime()
    })
    .slice(0, 5)

  const stats: {
    title: string
    value: string | number
    icon: LucideIcon
    description: string
    variant: "blue" | "green" | "amber" | "default"
  }[] = [
    {
      title: "Total Patients",
      value: patients.length,
      icon: Users,
      description: "All registered patients",
      variant: "blue",
    },
    {
      title: "Today's Registrations",
      value: todayPatients.length,
      icon: UserPlus,
      description: "New patients today",
      variant: "green",
    },
    {
      title: "Waiting List",
      value: waitingPatients.length,
      icon: Clock,
      description: "Patients waiting to be seen",
      variant: "amber",
    },
    {
      title: "Today's Date",
      value: new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "short" }),
      icon: CalendarDays,
      description: new Date().toLocaleDateString("en-ZA", { weekday: "long" }),
      variant: "default",
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
    <div className="space-y-8">
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

      <DashboardHero
        title={<>Welcome back, {user?.name?.split(" ")[0]}</>}
        subtitle="Here's what's happening at the practice today."
      >
        <Button asChild className="rounded-xl shadow-sm">
          <Link href="/dashboard/patients/new">
            <UserPlus className="mr-2 h-4 w-4" />
            Register New Patient
          </Link>
        </Button>
      </DashboardHero>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            description={stat.description}
            icon={stat.icon}
            variant={stat.variant}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardPanel title="Quick Actions">
          <div className="space-y-3">
            <Link
              href="/dashboard/patients/new"
              className={cn(
                dashboardQuickActionClass,
                "from-primary/8 to-muted/20 hover:border-primary/35"
              )}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary shadow-sm">
                  <UserPlus className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">Register New Patient</p>
                  <p className="text-sm text-muted-foreground">Add a new patient to the system</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
            </Link>

            <Link
              href="/dashboard/patients"
              className={cn(dashboardQuickActionClass, "from-sky-500/10 to-muted/20 hover:border-sky-500/35")}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-600 shadow-sm">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">Search Patients</p>
                  <p className="text-sm text-muted-foreground">Find existing patient records</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-sky-600" />
            </Link>

            <Link
              href="/dashboard/waiting"
              className={cn(dashboardQuickActionClass, "from-amber-500/10 to-muted/20 hover:border-amber-500/35")}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 shadow-sm">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">View Waiting List</p>
                  <p className="text-sm text-muted-foreground">Manage patients waiting to be seen</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-amber-600" />
            </Link>
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Recently Registered"
          action={
            <Button variant="ghost" size="sm" className="rounded-lg" asChild>
              <Link href="/dashboard/patients">View All</Link>
            </Button>
          }
        >
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Activity className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : recentPatients.length > 0 ? (
              <div className="space-y-2.5">
                {recentPatients.map((patient) => (
                  <div
                    key={patient.id}
                    className={dashboardListRowClass}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/12 ring-1 ring-primary/15">
                        <span className="text-sm font-semibold text-primary">
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
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 py-10 text-center">
                <Users className="mx-auto mb-2 h-10 w-10 text-muted-foreground/45" />
                <p className="text-muted-foreground">No patients registered yet</p>
                <Button size="sm" asChild className="mt-4 rounded-lg">
                  <Link href="/dashboard/patients/new">Register First Patient</Link>
                </Button>
              </div>
            )}
        </DashboardPanel>
      </div>

    </div>
  )
}
