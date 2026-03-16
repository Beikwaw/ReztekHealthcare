"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAppointments, usePatients } from "@/lib/firestore-hooks"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { format } from "date-fns"
import {
  ArrowLeft,
  Edit,
  User,
  Calendar,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  Play,
  Receipt,
} from "lucide-react"
import type { AppointmentStatus, Consultation } from "@/lib/types"
import { getLatestConsultation } from "@/lib/firebase"
import { formatFrequencyForDisplay } from "@/lib/utils"
import { ConsultationForm } from "../../consultations/ConsultationForm"

const statusColors: Record<AppointmentStatus, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  confirmed: "bg-green-100 text-green-800",
  "in-progress": "bg-yellow-100 text-yellow-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
  "no-show": "bg-orange-100 text-orange-800",
}

export default function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { appointments, updateAppointment } = useAppointments()
  const { patients } = usePatients()
  const { user } = useAuth()

  const [previousConsultation, setPreviousConsultation] = useState<Consultation | null>(null)
  const [loadingPrevious, setLoadingPrevious] = useState(false)
  const [previousOpen, setPreviousOpen] = useState(true)

  const appointment = appointments.find((apt) => apt.id === id)

  useEffect(() => {
    const loadPrevious = async () => {
      if (!appointment?.patientId) return
      try {
        setLoadingPrevious(true)
        const latest = await getLatestConsultation(appointment.patientId)
        setPreviousConsultation(latest as Consultation | null)
      } catch {
        // Silently ignore; previousConsultation will remain null
      } finally {
        setLoadingPrevious(false)
      }
    }
    loadPrevious()
  }, [appointment?.id, appointment?.patientId])

  if (!appointment) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold mb-2">Appointment Not Found</h2>
        <p className="text-muted-foreground mb-4">The appointment you're looking for doesn't exist.</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    )
  }

  const patient = patients.find((p) => p.id === appointment.patientId)
  const isDoctor = user?.role === "doctor"
  const isClerk = user?.role === "clerk"

  const handleStatusChange = (newStatus: AppointmentStatus) => {
    updateAppointment(appointment.id, { status: newStatus })
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
            <h1 className="text-2xl font-bold">Appointment Details</h1>
            <p className="text-muted-foreground">
              {format(new Date(appointment.date), "EEEE, MMMM d, yyyy")} at {appointment.startTime}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className={`${statusColors[appointment.status]} text-sm px-3 py-1`}>
            {appointment.status}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {loadingPrevious && (
            <Card className="bg-muted/40">
              <CardHeader>
                <CardTitle className="text-base">Previous Consultation Summary</CardTitle>
                <CardDescription>Loading previous consultation…</CardDescription>
              </CardHeader>
            </Card>
          )}

          {previousConsultation && !loadingPrevious && (
            <Card className="bg-muted/40">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Previous Consultation Summary</CardTitle>
                  <CardDescription>
                    {format(new Date(previousConsultation.createdAt), "dd MMM yyyy HH:mm")} ·{" "}
                    {previousConsultation.doctorName || "Doctor"}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviousOpen((open) => !open)}
                  className="shrink-0"
                >
                  {previousOpen ? "Hide" : "Show"}
                </Button>
              </CardHeader>
              {previousOpen && (
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="font-semibold">Clinical summary</p>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {(previousConsultation as { clinicalSummary?: string }).clinicalSummary || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold">Diagnosis</p>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {(previousConsultation as { diagnosis?: string }).diagnosis || "—"}
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Patient Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patient ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-lg">{patient.name}</p>
                      <p className="text-muted-foreground">{patient.phone}</p>
                      <p className="text-muted-foreground">{patient.email}</p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/patients/${patient.id}`}>View Profile</Link>
                    </Button>
                  </div>
                  {patient.medicalHistory.allergies.length > 0 && (
                    <div className="p-3 bg-red-50 rounded-md">
                      <p className="text-sm font-medium text-red-800">Allergies:</p>
                      <p className="text-sm text-red-700">
                        {patient.medicalHistory.allergies.join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">Patient information not available</p>
              )}
            </CardContent>
          </Card>

          {/* Appointment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Appointment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{format(new Date(appointment.date), "MMMM d, yyyy")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="font-medium">
                    {appointment.startTime} - {appointment.endTime}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium capitalize">{appointment.type.replace("-", " ")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Doctor</p>
                  <p className="font-medium">{appointment.doctorName || "Doctor"}</p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground mb-1">Reason for Visit</p>
                <p>{appointment.reason}</p>
              </div>

              {appointment.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{appointment.notes}</p>
                </div>
              )}

              {appointment.diagnosis && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Diagnosis</p>
                    <p className="font-medium">{appointment.diagnosis}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Embedded consultation form (doctor only) */}
          {patient && isDoctor && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Start Consultation from Appointment
                </CardTitle>
                <CardDescription>
                  Capture the full consultation for this appointment. This will link the consultation back to the
                  appointment.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ConsultationForm
                  patient={patient}
                  initialPresentingComplaint={appointment.reason}
                  appointmentContext={{
                    appointmentId: appointment.id,
                    type: appointment.type,
                    reason: appointment.reason,
                  }}
                />
              </CardContent>
            </Card>
          )}

        </div>

        {/* Sidebar Actions */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {appointment.status === "scheduled" && (
                <Button
                  className="w-full justify-start bg-transparent"
                  variant="outline"
                  onClick={() => handleStatusChange("confirmed")}
                >
                  <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                  Confirm Appointment
                </Button>
              )}

              {(appointment.status === "scheduled" || appointment.status === "confirmed") && isDoctor && (
                <Button
                  className="w-full justify-start bg-transparent"
                  variant="outline"
                  onClick={() => handleStatusChange("in-progress")}
                >
                  <Play className="mr-2 h-4 w-4 text-yellow-600" />
                  Start Consultation
                </Button>
              )}

              {appointment.status === "in-progress" && (
                <Button
                  className="w-full justify-start bg-transparent"
                  variant="outline"
                  onClick={() => handleStatusChange("completed")}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark as Complete
                </Button>
              )}

              {!isClerk && (
                <Button className="w-full justify-start bg-transparent" variant="outline" asChild>
                  <Link href={`/dashboard/appointments/${appointment.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Appointment
                  </Link>
                </Button>
              )}

              {appointment.status === "completed" && (
                <Button className="w-full justify-start bg-transparent" variant="outline" asChild>
                  <Link href={`/dashboard/billing/new?appointment=${appointment.id}`}>
                    <Receipt className="mr-2 h-4 w-4" />
                    Create Invoice
                  </Link>
                </Button>
              )}

              {appointment.status !== "completed" && appointment.status !== "cancelled" && (
                <Button
                  className="w-full justify-start text-destructive bg-transparent"
                  variant="outline"
                  onClick={() => handleStatusChange("cancelled")}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel Appointment
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                  <div>
                    <p className="text-sm font-medium">Created</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(appointment.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>
                {appointment.updatedAt > appointment.createdAt && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground mt-2" />
                    <div>
                      <p className="text-sm font-medium">Last Updated</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(appointment.updatedAt), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Consultation Fee */}
        </div>
      </div>
    </div>
  )
}
