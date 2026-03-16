"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { usePatients } from "@/lib/firestore-hooks"
import { ArrowLeft, Stethoscope, AlertCircle } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { ConsultationForm } from "../ConsultationForm"

export default function NewConsultationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { patients, loading: patientsLoading } = usePatients()

  const patientId = searchParams?.get("patient")
  const patient = patientId ? patients.find((p) => p.id === patientId) : null

  useEffect(() => {
    if (!patientsLoading && !patient && patientId) {
      toast.error("Patient not found")
      router.push("/dashboard/waiting")
    }
  }, [patient, patientId, patientsLoading, router])

  if (patientsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href="/dashboard/waiting">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Waiting List
          </Link>
        </Button>
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Patient Not Found</h3>
            <p className="text-muted-foreground mb-4">
              Please select a patient from the waiting list to start a consultation.
            </p>
            <Button asChild>
              <Link href="/dashboard/waiting">View Waiting List</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const nameParts = patient.name.split(" ")
  const firstName = nameParts[0] || ""
  const surname = nameParts.slice(1).join(" ") || ""

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/waiting">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Stethoscope className="w-6 h-6 text-primary" />
              New Consultation
            </h1>
            <p className="text-muted-foreground">
              Patient: <span className="font-semibold">{firstName}</span>{" "}
              {surname && <span className="font-semibold">{surname}</span>}
            </p>
          </div>
        </div>
      </div>

      <ConsultationForm patient={patient} />
    </div>
  )
}

