'use client'

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Stethoscope, Save, AlertCircle, Sparkles, CheckCircle2, ChevronRight, LayoutGrid } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { useConsultations } from "@/lib/firestore-hooks"
import type { Consultation, Patient } from "@/lib/types"
import {
  GENERAL_HEALTH_QUESTIONNAIRE,
  getCategoryById,
  flattenSelectedSymptoms,
} from "@/lib/general-health-questionnaire"
import { parseSummaryAndDiagnosis } from "@/lib/consultation-summary-pdf"
import { getSafeClientErrorMessage } from "@/lib/client-errors"
import { ERROR_MESSAGES } from "@/lib/error-messages"
import { deepOmitUndefined } from "@/lib/utils"
import { addPatientAuditLog, updatePatient, addConsultation as addConsultationDirect } from "@/lib/firebase"

type SymptomsState = Record<string, Record<string, boolean>>

type AppointmentContext = {
  appointmentId: string
  type?: string
  reason?: string
}

type ConsultationFormProps = {
  patient: Patient
  initialPresentingComplaint?: string
  appointmentContext?: AppointmentContext
}

function buildInitialSymptoms(): SymptomsState {
  const state: SymptomsState = {}
  for (const cat of GENERAL_HEALTH_QUESTIONNAIRE) {
    state[cat.id] = {}
    for (const item of cat.items) {
      state[cat.id][item.id] = false
    }
  }
  return state
}

const QUESTIONNAIRE_CHECKBOX_BY_ID: Record<
  string,
  { categoryId: string; categoryTitle: string; label: string }
> = (() => {
  const map: Record<string, { categoryId: string; categoryTitle: string; label: string }> = {}
  for (const cat of GENERAL_HEALTH_QUESTIONNAIRE) {
    for (const item of cat.items) {
      if (!map[item.id]) {
        map[item.id] = {
          categoryId: cat.id,
          categoryTitle: cat.title,
          label: item.label,
        }
      }
    }
  }
  return map
})()

export function ConsultationForm({
  patient,
  initialPresentingComplaint,
  appointmentContext,
}: ConsultationFormProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { consultations, addConsultation } = useConsultations()

  const [loading, setLoading] = useState(false)
  const [generatingAI, setGeneratingAI] = useState(false)
  const [showSummaryBox, setShowSummaryBox] = useState(false)
  const [clinicalSummary, setClinicalSummary] = useState("")
  const [diagnosis, setDiagnosis] = useState("")
  const [aiSummaryRaw, setAiSummaryRaw] = useState("")
  const [summaryConfirmed, setSummaryConfirmed] = useState(false)

  const [symptoms, setSymptoms] = useState<SymptomsState>(() => buildInitialSymptoms())
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  const [presentingComplaint, setPresentingComplaint] = useState(initialPresentingComplaint || "")
  const [onsetFields, setOnsetFields] = useState({
    onset: "",
    duration: "",
    severity: "",
    character: "",
    radiation: "",
    aggravatingRelieving: "",
    redFlagSymptoms: "",
    previousEpisodes: "",
    currentMedication: "",
    allergies: "",
    chronicConditions: "",
    moreInfo: "",
  })
  const [vitalSignsFields, setVitalSignsFields] = useState({
    bloodPressure: "",
    heartRate: "",
    respiratoryRate: "",
    temperature: "",
    bloodGlucose: "",
    hemoglobin: "",
    urineDipstick: "",
    urinePregnancy: "",
    moreInfo: "",
  })
  const [physicalExamination, setPhysicalExamination] = useState("")
  const [specialInvestigations, setSpecialInvestigations] = useState("")

  const [aiSuggestedCategoryIds, setAiSuggestedCategoryIds] = useState<string[] | null>(null)
  const [priorityCheckboxIds, setPriorityCheckboxIds] = useState<string[] | null>(null)
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [triageLoading, setTriageLoading] = useState(false)

  const [formData, setFormData] = useState({
    notes: "",
  })

  const latestCompletedConsultation = useMemo(() => {
    const completedStatuses = new Set<Consultation["status"]>([
      "confirmed",
      "pending-review",
      "sent-to-pharmacy",
    ])

    const candidates = consultations.filter(
      (c) => c.patientId === patient.id && completedStatuses.has(c.status),
    )
    if (candidates.length === 0) return null

    return candidates.reduce((latest, current) => {
      const latestDate = latest.createdAt instanceof Date ? latest.createdAt : new Date(latest.createdAt)
      const currentDate = current.createdAt instanceof Date ? current.createdAt : new Date(current.createdAt)
      return currentDate.getTime() > latestDate.getTime() ? current : latest
    })
  }, [consultations, patient.id])

  useEffect(() => {
    setPresentingComplaint(initialPresentingComplaint || "")
  }, [initialPresentingComplaint])

  useEffect(() => {
    setOnsetFields((prev) => ({
      ...prev,
      currentMedication:
        prev.currentMedication !== ""
          ? prev.currentMedication
          : patient.medicalHistory?.currentMedications?.join(", ") ?? "",
      allergies:
        prev.allergies !== "" ? prev.allergies : patient.medicalHistory?.allergies?.join(", ") ?? "",
      chronicConditions:
        prev.chronicConditions !== ""
          ? prev.chronicConditions
          : patient.medicalHistory?.chronicConditions?.join(", ") ?? "",
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient.id])

  const handleSymptomChange = (categoryId: string, itemId: string, value: boolean) => {
    setSymptoms((prev) => ({
      ...prev,
      [categoryId]: {
        ...(prev[categoryId] || {}),
        [itemId]: value,
      },
    }))
  }

  const selectedCategory = useMemo(
    () => (selectedCategoryId ? getCategoryById(selectedCategoryId) : null),
    [selectedCategoryId],
  )

  const visibleCategories = useMemo(() => {
    if (aiSuggestedCategoryIds && aiSuggestedCategoryIds.length > 0 && !showAllCategories) {
      const allowed = new Set(aiSuggestedCategoryIds)
      const filtered = GENERAL_HEALTH_QUESTIONNAIRE.filter((cat) => allowed.has(cat.id))
      return filtered.length > 0 ? filtered : GENERAL_HEALTH_QUESTIONNAIRE
    }
    return GENERAL_HEALTH_QUESTIONNAIRE
  }, [aiSuggestedCategoryIds, showAllCategories])

  const priorityItems = useMemo(() => {
    if (!priorityCheckboxIds || priorityCheckboxIds.length === 0) return []
    const items: Array<{
      id: string
      categoryId: string
      categoryTitle: string
      label: string
      priorityIndex: number
    }> = []
    priorityCheckboxIds.forEach((id, index) => {
      const entry = QUESTIONNAIRE_CHECKBOX_BY_ID[id]
      if (!entry) return
      items.push({
        id,
        categoryId: entry.categoryId,
        categoryTitle: entry.categoryTitle,
        label: entry.label,
        priorityIndex: index,
      })
    })
    return items
  }, [priorityCheckboxIds])

  const buildOnsetString = () => {
    const parts = [
      onsetFields.onset && `Onset: ${onsetFields.onset}`,
      onsetFields.duration && `Duration: ${onsetFields.duration}`,
      onsetFields.severity && `Severity: ${onsetFields.severity}`,
      onsetFields.character && `Character: ${onsetFields.character}`,
      onsetFields.radiation && `Radiation: ${onsetFields.radiation}`,
      onsetFields.aggravatingRelieving && `Aggravating/Relieving: ${onsetFields.aggravatingRelieving}`,
      onsetFields.redFlagSymptoms && `Red flag symptoms: ${onsetFields.redFlagSymptoms}`,
      onsetFields.previousEpisodes && `Previous episodes: ${onsetFields.previousEpisodes}`,
      onsetFields.currentMedication && `Current medication: ${onsetFields.currentMedication}`,
      onsetFields.allergies && `Allergies: ${onsetFields.allergies}`,
      onsetFields.chronicConditions && `Chronic conditions: ${onsetFields.chronicConditions}`,
      onsetFields.moreInfo && `Additional: ${onsetFields.moreInfo}`,
    ].filter(Boolean)
    return parts.join("\n")
  }

  const buildVitalSignsString = () => {
    const parts = [
      vitalSignsFields.bloodPressure && `Blood Pressure: ${vitalSignsFields.bloodPressure}`,
      vitalSignsFields.heartRate && `Heart Rate: ${vitalSignsFields.heartRate}`,
      vitalSignsFields.respiratoryRate && `Respiratory Rate: ${vitalSignsFields.respiratoryRate}`,
      vitalSignsFields.temperature && `Temperature: ${vitalSignsFields.temperature}`,
      vitalSignsFields.bloodGlucose && `Blood Glucose: ${vitalSignsFields.bloodGlucose}`,
      vitalSignsFields.hemoglobin && `Hemoglobin: ${vitalSignsFields.hemoglobin}`,
      vitalSignsFields.urineDipstick && `Urine Dipstick: ${vitalSignsFields.urineDipstick}`,
      vitalSignsFields.urinePregnancy && `Urine Pregnancy: ${vitalSignsFields.urinePregnancy}`,
      vitalSignsFields.moreInfo && `Additional: ${vitalSignsFields.moreInfo}`,
    ].filter(Boolean)
    return parts.join("\n")
  }

  const handleRunTriage = async () => {
    const pc = presentingComplaint.trim()
    if (!pc || triageLoading) return
    setTriageLoading(true)
    setAiSuggestedCategoryIds(null)
    setPriorityCheckboxIds(null)
    setShowAllCategories(false)
    try {
      const res = await fetch("/api/consultation-triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presentingComplaint: pc }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        suggestedCategoryIds?: string[]
        priorityCheckboxIds?: string[]
        error?: string
      }
      if (!res.ok) {
        toast.error(data.error || "AI triage not available. Showing full questionnaire.")
        setAiSuggestedCategoryIds(null)
        setPriorityCheckboxIds(null)
        setShowAllCategories(true)
        return
      }
      const suggested = Array.isArray(data.suggestedCategoryIds) ? data.suggestedCategoryIds : []
      const priority = Array.isArray(data.priorityCheckboxIds) ? data.priorityCheckboxIds : []
      setAiSuggestedCategoryIds(suggested)
      setPriorityCheckboxIds(priority)
      setShowAllCategories(false)
      if (priority.length === 0 && suggested.length === 0) {
        toast.error("AI triage could not suggest priority questions. Showing full questionnaire.")
      } else if (priority.length === 0) {
        toast.error("AI triage returned suggested categories only. No priority questions available.")
      }
    } catch {
      toast.error("AI triage not available. Showing full questionnaire.")
      setAiSuggestedCategoryIds(null)
      setPriorityCheckboxIds(null)
      setShowAllCategories(true)
    } finally {
      setTriageLoading(false)
    }
  }

  const handleGenerateAISummary = async () => {
    const symptomList = flattenSelectedSymptoms(symptoms)
    const onsetStr = buildOnsetString()
    const vitalSignsStr = buildVitalSignsString()
    const hasAnyContext =
      symptomList.length > 0 ||
      presentingComplaint.trim().length > 0 ||
      onsetStr.length > 0 ||
      vitalSignsStr.length > 0 ||
      physicalExamination.trim().length > 0 ||
      specialInvestigations.trim().length > 0
    if (!hasAnyContext) {
      toast.error(
        "Add at least one symptom or fill in any of the consultation sections before generating the summary.",
      )
      return
    }
    setGeneratingAI(true)
    try {
      const res = await fetch("/api/consultation-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: patient?.name || "Patient",
          symptoms: symptomList,
          presentingComplaint: presentingComplaint.trim() || undefined,
          onset: onsetStr || undefined,
          vitalSigns: vitalSignsStr || undefined,
          physicalExamination: physicalExamination.trim() || undefined,
          specialInvestigations: specialInvestigations.trim() || undefined,
          allergies: patient?.medicalHistory?.allergies,
          chronicConditions: patient?.medicalHistory?.chronicConditions,
          currentMedications: patient?.medicalHistory?.currentMedications,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Failed to generate summary")
        return
      }
      const fullText = data.summary as string
      const parsed = parseSummaryAndDiagnosis(fullText)
      setClinicalSummary(parsed.clinicalSummary)
      setDiagnosis(parsed.diagnosis)
      setAiSummaryRaw(fullText)
      setShowSummaryBox(true)
      setSummaryConfirmed(false)
      toast.success(
        "AI-assisted summary generated. Review and edit if needed, then approve as doctor before submitting.",
      )
    } catch {
      toast.error("Failed to generate AI summary")
    } finally {
      setGeneratingAI(false)
    }
  }

  const handleConfirmSummary = () => {
    setSummaryConfirmed(true)
    toast.success("Doctor has approved the AI summary")
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!patient || !user) {
        throw new Error("Patient or user information missing")
      }

      if (showSummaryBox && !summaryConfirmed) {
        toast.error("Please approve the AI summary (Doctor approves AI summary) before submitting")
        setLoading(false)
        return
      }

      const selectedSymptoms = flattenSelectedSymptoms(symptoms)
      const onsetStr = buildOnsetString()
      const vitalSignsStr = buildVitalSignsString()
      const hasAnyDetail =
        selectedSymptoms.length > 0 ||
        presentingComplaint.trim().length > 0 ||
        onsetStr.length > 0 ||
        vitalSignsStr.length > 0 ||
        physicalExamination.trim().length > 0 ||
        specialInvestigations.trim().length > 0 ||
        clinicalSummary.trim().length > 0 ||
        diagnosis.trim().length > 0 ||
        formData.notes.trim().length > 0

      if (!hasAnyDetail) {
        toast.error(
          "Add at least one symptom, presenting complaint, vitals, exam, summary, or note before starting a consultation.",
        )
        setLoading(false)
        return
      }

      const consultationData: Record<string, unknown> = {
        patientId: patient.id,
        patientName: patient.name,
        doctorId: user.id,
        doctorName: user.name,
        symptoms,
        presentingComplaint: presentingComplaint.trim() || undefined,
        onset: onsetStr || undefined,
        vitalSigns: vitalSignsStr || undefined,
        physicalExamination: physicalExamination.trim() || undefined,
        specialInvestigations: specialInvestigations.trim() || undefined,
        doctorNotes: formData.notes || undefined,
        prescription: [],
        status: "in-progress",
      }

      if (appointmentContext?.appointmentId) {
        consultationData.appointmentId = appointmentContext.appointmentId
      }

      if (showSummaryBox && aiSummaryRaw) {
        consultationData.aiSummary = aiSummaryRaw
        consultationData.clinicalSummary = clinicalSummary
        consultationData.diagnosis = diagnosis
      }

      const payload = deepOmitUndefined(consultationData)
      let consultationId: string
      if (addConsultation) {
        consultationId = await addConsultation(payload)
      } else {
        consultationId = await addConsultationDirect(payload)
      }

      if (patient.status !== "in-consultation") {
        await updatePatient(patient.id, { status: "in-consultation" })
        await addPatientAuditLog({
          patientId: patient.id,
          patientName: patient.name,
          action: "status-change",
          fromStatus: patient.status,
          toStatus: "in-consultation",
          performedByUserId: user.id,
          performedByName: user.name,
          performedByRole: user.role,
        })
      }

      if (appointmentContext?.appointmentId) {
        try {
          const { updateAppointment } = await import("@/lib/firebase")
          await updateAppointment(appointmentContext.appointmentId, { status: "in-progress" })
        } catch {
          // Non-fatal: do not block consultation start if appointment status update fails
        }
      }

      toast.success("Consultation started successfully")
      router.push(`/dashboard/consultations/${consultationId}`)
    } catch (error) {
      console.error("Error creating consultation:", error)
      toast.error(getSafeClientErrorMessage(error, ERROR_MESSAGES.OPERATION_FAILED))
    } finally {
      setLoading(false)
    }
  }

  const nameParts = patient.name.split(" ")
  const firstName = nameParts[0] || ""
  const surname = nameParts.slice(1).join(" ") || ""

  return (
    <div className="space-y-6">
      {latestCompletedConsultation && (
        <Card className="border-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-950/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
              Last Visit
            </CardTitle>
            <CardDescription className="text-xs text-emerald-900/80 dark:text-emerald-100/80">
              Most recent completed consultation for this patient.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-medium">
              {format(
                latestCompletedConsultation.createdAt instanceof Date
                  ? latestCompletedConsultation.createdAt
                  : new Date(latestCompletedConsultation.createdAt),
                "dd MMM yyyy – hh:mm a",
              )}
            </p>
            <p className="text-xs text-emerald-900/80 dark:text-emerald-100/80">
              <span className="font-semibold">Diagnosis Summary: </span>
              {latestCompletedConsultation.diagnosis ||
                latestCompletedConsultation.finalDiagnosis ||
                latestCompletedConsultation.clinicalSummary ||
                "No diagnosis recorded for the last visit."}
            </p>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Patient Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Name</p>
              <p className="font-medium">{firstName}</p>
            </div>
            {surname && (
              <div>
                <p className="text-muted-foreground">Surname</p>
                <p className="font-medium">{surname}</p>
              </div>
            )}
            {patient.patientNumber && (
              <div>
                <p className="text-muted-foreground">Patient number</p>
                <p className="font-medium">{patient.patientNumber}</p>
              </div>
            )}
            {patient.idNumber && (
              <div>
                <p className="text-muted-foreground">ID number</p>
                <p className="font-medium">{patient.idNumber}</p>
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
                <p className="font-medium break-all">{patient.email}</p>
              </div>
            )}
            {patient.address && (
              <div className="col-span-2 md:col-span-3">
                <p className="text-muted-foreground">Address</p>
                <p className="font-medium">{patient.address}</p>
              </div>
            )}
            {patient.dateOfBirth && (
              <div>
                <p className="text-muted-foreground">Date of birth</p>
                <p className="font-medium">
                  {patient.dateOfBirth instanceof Date
                    ? patient.dateOfBirth.toLocaleDateString()
                    : new Date(patient.dateOfBirth).toLocaleDateString()}
                </p>
              </div>
            )}
            {patient.gender && (
              <div>
                <p className="text-muted-foreground">Gender</p>
                <p className="font-medium capitalize">{patient.gender}</p>
              </div>
            )}
          </div>
          {patient.emergencyContact && (patient.emergencyContact.name || patient.emergencyContact.phone) && (
            <div className="border-t pt-4">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide mb-2">
                Emergency contact
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                {patient.emergencyContact.name && (
                  <div>
                    <p className="text-muted-foreground">Name</p>
                    <p className="font-medium">{patient.emergencyContact.name}</p>
                  </div>
                )}
                {patient.emergencyContact.phone && (
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-medium">{patient.emergencyContact.phone}</p>
                  </div>
                )}
                {patient.emergencyContact.relationship && (
                  <div>
                    <p className="text-muted-foreground">Relationship</p>
                    <p className="font-medium">{patient.emergencyContact.relationship}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          {(patient.medicalAidInfo?.name || patient.medicalAidInfo?.memberNumber || patient.insuranceInfo) && (
            <div className="border-t pt-4">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide mb-2">
                Medical aid / insurance
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                {patient.medicalAidInfo?.name && (
                  <div>
                    <p className="text-muted-foreground">Medical aid</p>
                    <p className="font-medium">{patient.medicalAidInfo.name}</p>
                  </div>
                )}
                {patient.medicalAidInfo?.memberNumber && (
                  <div>
                    <p className="text-muted-foreground">Member number</p>
                    <p className="font-medium">{patient.medicalAidInfo.memberNumber}</p>
                  </div>
                )}
                {patient.insuranceInfo?.provider && (
                  <div>
                    <p className="text-muted-foreground">Insurance</p>
                    <p className="font-medium">{patient.insuranceInfo.provider}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Presenting Complaint (PC)</CardTitle>
          <CardDescription>
            Describe the main complaint in the patient&apos;s words or your own.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Textarea
              value={presentingComplaint}
              onChange={(e) => setPresentingComplaint(e.target.value)}
              placeholder="e.g. Chest pain for 2 days, headache since this morning..."
              rows={3}
              className="resize-y"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Use AI triage to highlight the most urgent and relevant questions. The doctor always makes the final
                decision.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRunTriage}
                disabled={triageLoading || !presentingComplaint.trim()}
              >
                {triageLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-2" />
                    Generating AI Priority Questions...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate AI Priority Questions
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {priorityItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>AI Priority Questions</CardTitle>
            <CardDescription>
              Suggested questions ranked by clinical urgency and relevance for this presenting complaint. No options
              are pre-selected &mdash; tick only what applies.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              {priorityItems.map((item) => (
                <div key={item.id} className="flex items-start space-x-2">
                  <Checkbox
                    id={`ai-priority-${item.id}`}
                    checked={Boolean(symptoms[item.categoryId]?.[item.id])}
                    onCheckedChange={(checked) =>
                      handleSymptomChange(item.categoryId, item.id, checked === true)
                    }
                  />
                  <div className="space-y-1">
                    <Label htmlFor={`ai-priority-${item.id}`} className="cursor-pointer text-sm font-medium">
                      {item.label}
                    </Label>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">Priority #{item.priorityIndex + 1}</Badge>
                      <span className="truncate">{item.categoryTitle}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>General Health Questionnaire for Dr diagnosis and finding</CardTitle>
                <CardDescription>Select a category, then indicate which checkboxes apply.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {aiSuggestedCategoryIds && aiSuggestedCategoryIds.length > 0 && !showAllCategories ? (
                  <>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      Showing AI-suggested categories
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAllCategories(true)}
                    >
                      Show All Categories
                    </Button>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground whitespace-nowrap">Showing all categories</p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {!selectedCategory ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Select a category to show its checkbox questions.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                  {visibleCategories.map((cat) => {
                    const selectedCount =
                      (symptoms[cat.id] && Object.values(symptoms[cat.id]).filter(Boolean).length) || 0
                    return (
                      <Button
                        key={cat.id}
                        type="button"
                        variant="outline"
                        className="h-auto py-3 px-4 justify-start text-left"
                        onClick={() => setSelectedCategoryId(cat.id)}
                      >
                        <LayoutGrid className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{cat.title}</span>
                        {selectedCount > 0 && (
                          <Badge variant="secondary" className="ml-auto flex-shrink-0">
                            {selectedCount}
                          </Badge>
                        )}
                        <ChevronRight className="w-4 h-4 flex-shrink-0 ml-1" />
                      </Button>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCategoryId(null)}
                  className="mb-2"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to categories
                </Button>
                <h3 className="font-semibold text-foreground text-lg">{selectedCategory.title}</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {selectedCategory.items.map((item) => (
                    <div key={item.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${selectedCategory.id}-${item.id}`}
                        checked={Boolean(symptoms[selectedCategory.id]?.[item.id])}
                        onCheckedChange={(checked) =>
                          handleSymptomChange(selectedCategory.id, item.id, checked === true)
                        }
                      />
                      <Label
                        htmlFor={`${selectedCategory.id}-${item.id}`}
                        className="cursor-pointer text-sm"
                      >
                        {item.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Symptom Details / Onset</CardTitle>
            <CardDescription>
              Duration, severity, character, radiation, aggravating/relieving factors, red flags, previous
              episodes. Patient medication, allergies and chronic conditions shown from record when available. If
              not recorded, leave blank or use &quot;Not recorded&quot;.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <div className="space-y-2">
                <Label htmlFor="onset-onset" className="text-sm font-medium">
                  Onset
                </Label>
                <Input
                  id="onset-onset"
                  value={onsetFields.onset}
                  onChange={(e) => setOnsetFields((p) => ({ ...p, onset: e.target.value }))}
                  placeholder="e.g. 2 days ago"
                  className="border-b rounded-none border-t-0 border-x-0 shadow-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onset-duration" className="text-sm font-medium">
                  Duration
                </Label>
                <Input
                  id="onset-duration"
                  value={onsetFields.duration}
                  onChange={(e) => setOnsetFields((p) => ({ ...p, duration: e.target.value }))}
                  placeholder="e.g. 2 days"
                  className="border-b rounded-none border-t-0 border-x-0 shadow-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onset-severity" className="text-sm font-medium">
                  Severity
                </Label>
                <Input
                  id="onset-severity"
                  value={onsetFields.severity}
                  onChange={(e) => setOnsetFields((p) => ({ ...p, severity: e.target.value }))}
                  placeholder="e.g. 6/10"
                  className="border-b rounded-none border-t-0 border-x-0 shadow-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onset-character" className="text-sm font-medium">
                  Character
                </Label>
                <Input
                  id="onset-character"
                  value={onsetFields.character}
                  onChange={(e) => setOnsetFields((p) => ({ ...p, character: e.target.value }))}
                  placeholder="e.g. dull, sharp"
                  className="border-b rounded-none border-t-0 border-x-0 shadow-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onset-radiation" className="text-sm font-medium">
                  Radiation
                </Label>
                <Input
                  id="onset-radiation"
                  value={onsetFields.radiation}
                  onChange={(e) => setOnsetFields((p) => ({ ...p, radiation: e.target.value }))}
                  placeholder="e.g. none / to left arm"
                  className="border-b rounded-none border-t-0 border-x-0 shadow-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onset-aggravating" className="text-sm font-medium">
                  Aggravating/Relieving Factors
                </Label>
                <Input
                  id="onset-aggravating"
                  value={onsetFields.aggravatingRelieving}
                  onChange={(e) =>
                    setOnsetFields((p) => ({ ...p, aggravatingRelieving: e.target.value }))
                  }
                  placeholder="e.g. worse on exertion, better at rest"
                  className="border-b rounded-none border-t-0 border-x-0 shadow-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onset-redflags" className="text-sm font-medium">
                  Red Flag Symptoms
                </Label>
                <Input
                  id="onset-redflags"
                  value={onsetFields.redFlagSymptoms}
                  onChange={(e) => setOnsetFields((p) => ({ ...p, redFlagSymptoms: e.target.value }))}
                  placeholder="Not recorded"
                  className="border-b rounded-none border-t-0 border-x-0 shadow-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onset-previous" className="text-sm font-medium">
                  Previous Episodes
                </Label>
                <Input
                  id="onset-previous"
                  value={onsetFields.previousEpisodes}
                  onChange={(e) => setOnsetFields((p) => ({ ...p, previousEpisodes: e.target.value }))}
                  placeholder="Not recorded"
                  className="border-b rounded-none border-t-0 border-x-0 shadow-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onset-currentmeds" className="text-sm font-medium">
                  Current Medication
                </Label>
                <Input
                  id="onset-currentmeds"
                  value={onsetFields.currentMedication}
                  onChange={(e) => setOnsetFields((p) => ({ ...p, currentMedication: e.target.value }))}
                  placeholder="Not recorded"
                  className="border-b rounded-none border-t-0 border-x-0 shadow-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onset-allergies" className="text-sm font-medium">
                  Allergies
                </Label>
                <Input
                  id="onset-allergies"
                  value={onsetFields.allergies}
                  onChange={(e) => setOnsetFields((p) => ({ ...p, allergies: e.target.value }))}
                  placeholder="Not recorded"
                  className="border-b rounded-none border-t-0 border-x-0 shadow-none"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="onset-chronic" className="text-sm font-medium">
                  Chronic Conditions
                </Label>
                <Input
                  id="onset-chronic"
                  value={onsetFields.chronicConditions}
                  onChange={(e) =>
                    setOnsetFields((p) => ({ ...p, chronicConditions: e.target.value }))
                  }
                  placeholder="Not recorded"
                  className="border-b rounded-none border-t-0 border-x-0 shadow-none"
                />
              </div>
            </div>
            <div className="pt-4 border-t">
              <Label htmlFor="onset-moreinfo" className="text-sm font-medium">
                Add more info (optional)
              </Label>
              <Textarea
                id="onset-moreinfo"
                value={onsetFields.moreInfo}
                onChange={(e) => setOnsetFields((p) => ({ ...p, moreInfo: e.target.value }))}
                placeholder="Any additional symptom or onset details..."
                rows={3}
                className="mt-2 resize-y"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vital Signs</CardTitle>
            <CardDescription>
              Blood Pressure, Heart Rate, Respiratory Rate, Temperature, Blood Glucose, Hemoglobin, Urine Dipstick,
              Urine Pregnancy. If empty, AI will use &quot;Not recorded&quot;.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <div className="space-y-2">
                <Label htmlFor="vs-bp" className="text-sm font-medium">
                  Blood Pressure
                </Label>
                <Input
                  id="vs-bp"
                  value={vitalSignsFields.bloodPressure}
                  onChange={(e) =>
                    setVitalSignsFields((p) => ({ ...p, bloodPressure: e.target.value }))
                  }
                  placeholder="e.g. 120/80"
                  className="border-b rounded-none border-t-0 border-x-0 shadow-none font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vs-hr" className="text-sm font-medium">
                  Heart Rate
                </Label>
                <Input
                  id="vs-hr"
                  value={vitalSignsFields.heartRate}
                  onChange={(e) =>
                    setVitalSignsFields((p) => ({ ...p, heartRate: e.target.value }))
                  }
                  placeholder="e.g. 72 bpm"
                  className="border-b rounded-none border-t-0 border-x-0 shadow-none font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vs-rr" className="text-sm font-medium">
                  Respiratory Rate
                </Label>
                <Input
                  id="vs-rr"
                  value={vitalSignsFields.respiratoryRate}
                  onChange={(e) =>
                    setVitalSignsFields((p) => ({ ...p, respiratoryRate: e.target.value }))
                  }
                  placeholder="e.g. 16/min"
                  className="border-b rounded-none border-t-0 border-x-0 shadow-none font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vs-temp" className="text-sm font-medium">
                  Temperature
                </Label>
                <Input
                  id="vs-temp"
                  value={vitalSignsFields.temperature}
                  onChange={(e) =>
                    setVitalSignsFields((p) => ({ ...p, temperature: e.target.value }))
                  }
                  placeholder="e.g. 36.5°C"
                  className="border-b rounded-none border-t-0 border-x-0 shadow-none font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vs-bg" className="text-sm font-medium">
                  Blood Glucose
                </Label>
                <Input
                  id="vs-bg"
                  value={vitalSignsFields.bloodGlucose}
                  onChange={(e) =>
                    setVitalSignsFields((p) => ({ ...p, bloodGlucose: e.target.value }))
                  }
                  placeholder="e.g. 5.2 mmol/L"
                  className="border-b rounded-none border-t-0 border-x-0 shadow-none font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vs-hb" className="text-sm font-medium">
                  Hemoglobin
                </Label>
                <Input
                  id="vs-hb"
                  value={vitalSignsFields.hemoglobin}
                  onChange={(e) =>
                    setVitalSignsFields((p) => ({ ...p, hemoglobin: e.target.value }))
                  }
                  placeholder="e.g. 14 g/dL"
                  className="border-b rounded-none border-t-0 border-x-0 shadow-none font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vs-urinedip" className="text-sm font-medium">
                  Urine Dipstick
                </Label>
                <Input
                  id="vs-urinedip"
                  value={vitalSignsFields.urineDipstick}
                  onChange={(e) =>
                    setVitalSignsFields((p) => ({ ...p, urineDipstick: e.target.value }))
                  }
                  placeholder="e.g. negative"
                  className="border-b rounded-none border-t-0 border-x-0 shadow-none font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vs-urinepreg" className="text-sm font-medium">
                  Urine Pregnancy
                </Label>
                <Input
                  id="vs-urinepreg"
                  value={vitalSignsFields.urinePregnancy}
                  onChange={(e) =>
                    setVitalSignsFields((p) => ({ ...p, urinePregnancy: e.target.value }))
                  }
                  placeholder="e.g. negative"
                  className="border-b rounded-none border-t-0 border-x-0 shadow-none font-mono"
                />
              </div>
            </div>
            <div className="pt-4 border-t">
              <Label htmlFor="vs-moreinfo" className="text-sm font-medium">
                Add more info (optional)
              </Label>
              <Textarea
                id="vs-moreinfo"
                value={vitalSignsFields.moreInfo}
                onChange={(e) =>
                  setVitalSignsFields((p) => ({ ...p, moreInfo: e.target.value }))
                }
                placeholder="Any additional vital signs or notes..."
                rows={3}
                className="mt-2 resize-y"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Physical Examination</CardTitle>
            <CardDescription>
              Systematically examine: General appearance, Cardiovascular, Respiratory, Abdominal, Neurological, ENT,
              Musculoskeletal, Skin, Mental state. If empty, &quot;Not recorded&quot;.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={physicalExamination}
              onChange={(e) => setPhysicalExamination(e.target.value)}
              placeholder="e.g. General: Well-looking. CVS: S1 S2 normal. Chest: Clear bilaterally..."
              rows={5}
              className="resize-y"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Special Investigations</CardTitle>
            <CardDescription>
              Include and interpret. If none, leave blank (AI: &quot;Not recorded&quot;).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={specialInvestigations}
              onChange={(e) => setSpecialInvestigations(e.target.value)}
              placeholder="e.g. ECG: Sinus rhythm. CXR: No focal consolidation..."
              rows={3}
              className="resize-y"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleGenerateAISummary}
              disabled={generatingAI}
              className="w-full"
            >
              {generatingAI ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                  Generating AI-Assisted Summary...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate AI-Assisted Summary
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {showSummaryBox && (
          <Card className="border-primary/20 bg-primary/5 mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Clinical Summary & Dr diagnosis and finding
                  </CardTitle>
                  <CardDescription>
                    Review and edit the AI summary below. The doctor must approve before submitting the
                    consultation.
                  </CardDescription>
                </div>
                {summaryConfirmed && (
                  <Badge className="bg-green-500">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Confirmed
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-bold text-foreground uppercase tracking-wide">
                  Clinical Summary
                </p>
                <Textarea
                  value={clinicalSummary}
                  onChange={(e) => setClinicalSummary(e.target.value)}
                  rows={4}
                  className="font-mono text-sm"
                  placeholder="Clinical summary..."
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-bold text-foreground uppercase tracking-wide">
                  Dr diagnosis and finding
                </p>
                <Textarea
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  rows={3}
                  className="font-mono text-sm"
                  placeholder="Working diagnosis, differential, next steps..."
                />
              </div>
              {!summaryConfirmed && (
                <div className="flex items-center gap-2">
                  <Button type="button" onClick={handleConfirmSummary} className="flex-1">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Doctor approves AI summary
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowSummaryBox(false)
                      setClinicalSummary("")
                      setDiagnosis("")
                      setAiSummaryRaw("")
                      setSummaryConfirmed(false)
                    }}
                  >
                    Regenerate
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Doctor Notes</CardTitle>
            <CardDescription>
              Add any additional clinical notes for this consultation (internal use only, not shown on the script).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Optional internal notes for this consultation."
                rows={4}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-4 mt-6">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || (showSummaryBox && !summaryConfirmed)}>
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Completing...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Complete Consultation
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

