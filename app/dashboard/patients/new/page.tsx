"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { PatientRegistrationForm } from "@/components/dashboard/patient-registration-form"

export default function NewPatientPage() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Register New Patient</h1>
          <p className="text-muted-foreground">Add a new patient to the system</p>
        </div>
      </div>

      <PatientRegistrationForm />
    </div>
  )
}
