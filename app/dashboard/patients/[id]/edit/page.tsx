"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usePatients } from "@/lib/firestore-hooks"
import { useAuth } from "@/lib/auth-context"
import { addPatientAuditLog } from "@/lib/firebase"
import { toast } from "sonner"

export default function EditPatientPage() {
  const params = useParams()
  const patientId = params.id as string
  const router = useRouter()
  const { user } = useAuth()
  const { patients, updatePatient, loading } = usePatients()
  const patient = patients.find((p) => p.id === patientId)

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    gender: "other",
    dateOfBirth: "",
    allergies: "",
    chronicConditions: "",
    currentMedications: "",
  })
  const [originalForm, setOriginalForm] = useState<typeof formData | null>(null)

  useEffect(() => {
    if (patient) {
      const base = {
        name: patient.name || "",
        email: patient.email || "",
        phone: patient.phone || "",
        address: patient.address || "",
        gender: patient.gender || "other",
        dateOfBirth: patient.dateOfBirth
          ? new Date(patient.dateOfBirth).toISOString().split("T")[0]
          : "",
        allergies: (patient.medicalHistory?.allergies || []).join(", "),
        chronicConditions: (patient.medicalHistory?.chronicConditions || []).join(", "),
        currentMedications: (patient.medicalHistory?.currentMedications || []).join(", "),
      }
      setFormData(base)
      setOriginalForm(base)
    }
  }, [patient])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const updates: Parameters<typeof updatePatient>[1] = {}

      // Fallback: if we don't have an original snapshot, send all editable fields
      const baseline = originalForm ?? formData

      if (formData.name !== baseline.name) {
        updates.name = formData.name
      }
      if (formData.email !== baseline.email) {
        updates.email = formData.email
      }
      if (formData.phone !== baseline.phone) {
        updates.phone = formData.phone
      }
      if (formData.address !== baseline.address) {
        updates.address = formData.address
      }
      if (formData.gender !== baseline.gender) {
        updates.gender = formData.gender as "male" | "female" | "other"
      }
      if (formData.dateOfBirth !== baseline.dateOfBirth) {
        updates.dateOfBirth = formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined
      }

      // Clerk and other roles can edit medical history; compare before writing
      if (patient) {
        const newMedicalHistory = {
          allergies: formData.allergies
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          chronicConditions: formData.chronicConditions
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          currentMedications: formData.currentMedications
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          pastSurgeries: patient.medicalHistory?.pastSurgeries || [],
          familyHistory: patient.medicalHistory?.familyHistory || [],
          bloodType: patient.medicalHistory?.bloodType,
        }

        const originalMedicalHistory = {
          allergies: patient.medicalHistory?.allergies || [],
          chronicConditions: patient.medicalHistory?.chronicConditions || [],
          currentMedications: patient.medicalHistory?.currentMedications || [],
          pastSurgeries: patient.medicalHistory?.pastSurgeries || [],
          familyHistory: patient.medicalHistory?.familyHistory || [],
          bloodType: patient.medicalHistory?.bloodType,
        }

        if (JSON.stringify(newMedicalHistory) !== JSON.stringify(originalMedicalHistory)) {
          updates.medicalHistory = newMedicalHistory
        }
      }

      if (Object.keys(updates).length === 0) {
        toast.success("No changes to save.")
        return
      }

      await updatePatient(patientId, updates)

      // Best-effort patient edit audit log
      if (user) {
        try {
          const changedFields = Object.keys(updates)

          await addPatientAuditLog({
            patientId,
            patientName: patient?.name,
            action: "edit",
            changedFields,
            changes: undefined,
            performedByUserId: user.id,
            performedByName: user.name,
            performedByRole: user.role,
          })
        } catch {
          // Non-blocking
        }
      }
      toast.success("Patient details updated successfully.")
      router.push(`/dashboard/patients/${patientId}`)
    } catch (error) {
      console.error("Failed to update patient:", error)
      toast.error("Failed to update patient")
    }
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
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold mb-2">Patient Not Found</h2>
        <p className="text-muted-foreground mb-4">The patient you're looking for doesn't exist.</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Edit Patient</CardTitle>
          <CardDescription>Update patient details and medical history. Only changed fields are saved.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select value={formData.gender} onValueChange={(value) => setFormData((p) => ({ ...p, gender: value }))}>
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" name="address" value={formData.address} onChange={handleChange} />
              </div>
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="allergies">Allergies (comma separated)</Label>
                <Textarea id="allergies" name="allergies" value={formData.allergies} onChange={handleChange} rows={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chronicConditions">Chronic Conditions (comma separated)</Label>
                <Textarea
                  id="chronicConditions"
                  name="chronicConditions"
                  value={formData.chronicConditions}
                  onChange={handleChange}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currentMedications">Current Medications (comma separated)</Label>
                <Textarea
                  id="currentMedications"
                  name="currentMedications"
                  value={formData.currentMedications}
                  onChange={handleChange}
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
