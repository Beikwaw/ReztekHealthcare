"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth } from "@/lib/auth-context"
import { useConsultations, usePatients, usePrescriptions } from "@/lib/firestore-hooks"
import type { Consultation } from "@/lib/types"
import { addPatientAuditLog } from "@/lib/firebase"
import { addMedicalRecord } from "@/lib/firebase"
import Link from "next/link"
import {
  Stethoscope,
  ArrowLeft,
  FileText,
  Activity,
  AlertCircle,
  FileDown,
  CheckCircle2,
  Mail,
  Printer,
  Sparkles,
  Save,
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { GENERAL_HEALTH_QUESTIONNAIRE, flattenSelectedSymptoms } from "@/lib/general-health-questionnaire"
import { parseSummaryAndDiagnosis, generateConsultationSummaryPdf } from "@/lib/consultation-summary-pdf"
import { getSafeClientErrorMessage, getSafeMessageFromApiPayload } from "@/lib/client-errors"
import { ERROR_MESSAGES } from "@/lib/error-messages"
import { formatFrequencyForDisplay } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type PrescriptionFormItem = {
  medication: string
  dosage: string
  frequency: string
  duration: string
  instructions: string
}

const FOLLOW_UP_TIME_SLOTS: string[] = (() => {
  const slots: string[] = []
  for (let hour = 8; hour < 18; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
      slots.push(time)
    }
  }
  return slots
})()

export default function ConsultationDetailView() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const { user } = useAuth()
  const { consultations, loading, updateConsultation, refetch: refetchConsultations } = useConsultations()
  const { patients, appendPatientVisit } = usePatients()
  const [emailSending, setEmailSending] = useState(false)
  const [scriptPdfLoading, setScriptPdfLoading] = useState(false)
  const [printScriptLoading, setPrintScriptLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [showEmailConfirmDialog, setShowEmailConfirmDialog] = useState(false)
  const [showResendWarningDialog, setShowResendWarningDialog] = useState(false)
  const [showPrescriptionDialog, setShowPrescriptionDialog] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionFormItem[]>([
    { medication: "", dosage: "", frequency: "", duration: "", instructions: "" },
  ])
  const [editableClinicalSummary, setEditableClinicalSummary] = useState("")
  const [editableDiagnosis, setEditableDiagnosis] = useState("")
  const [editableIcd10, setEditableIcd10] = useState("")
  const [savingSummary, setSavingSummary] = useState(false)
  const [regeneratingAI, setRegeneratingAI] = useState(false)
  const [showClaimModal, setShowClaimModal] = useState(false)
  const [showClaimNextStepDialog, setShowClaimNextStepDialog] = useState(false)
  const [showNoMedicationDialog, setShowNoMedicationDialog] = useState(false)
  const [showCompletionSuccessDialog, setShowCompletionSuccessDialog] = useState(false)
  const [lastCreatedClaimId, setLastCreatedClaimId] = useState<string | null>(null)
  const [claimIcd10, setClaimIcd10] = useState("")
  const [claimClinicalSummaryShort, setClaimClinicalSummaryShort] = useState("")
  const [claimCreating, setClaimCreating] = useState(false)

  const [claimDiagnosisRows, setClaimDiagnosisRows] = useState<
    { line: string; icd10: string }[]
  >([
    { line: "", icd10: "" },
    { line: "", icd10: "" },
    { line: "", icd10: "" },
    { line: "", icd10: "" },
  ])
  const [claimInjectionsText, setClaimInjectionsText] = useState("")
  const [claimProceduresText, setClaimProceduresText] = useState("")
  const [claimMaterials, setClaimMaterials] = useState({
    syringeNeedle: "",
    swab: "",
    glove: "",
    bandage: "",
    other: "",
  })
  const [claimMedicationRows, setClaimMedicationRows] = useState<
    { name: string; quantity: string; duration: string; dosage: string; instructions: string }[]
  >([])
  const [claimChronicCodes, setClaimChronicCodes] = useState<string[]>([])

  const [followUpEnabled, setFollowUpEnabled] = useState(false)
  const [followUpDate, setFollowUpDate] = useState("")
  const [followUpStartTime, setFollowUpStartTime] = useState("")
  const [followUpEndTime, setFollowUpEndTime] = useState("")
  const [followUpType, setFollowUpType] = useState<"consultation" | "follow-up" | "emergency" | "routine-checkup" | "vaccination" | "">("")
  const [followUpReason, setFollowUpReason] = useState("")

  const consultation = consultations.find((c) => c.id === id)
  const patient = consultation
    ? patients.find((p) => p.id === consultation.patientId)
    : null

  const isMedicalAidPatient = (p: typeof patient): boolean => {
    if (!p) return false
    if ((p as { paymentMethod?: string }).paymentMethod === "medical-aid") return true
    if (p.medicalAidInfo?.name || p.medicalAidInfo?.memberNumber) return true
    if ((p as { insuranceInfo?: { provider?: string } }).insuranceInfo?.provider) return true
    return false
  }

  const isCashPatient = !!patient && (patient as { paymentMethod?: string }).paymentMethod === "cash"

  const {
    prescriptions,
    loading: prescriptionsLoading,
    addPrescription,
    refetch: refetchPrescriptions,
  } = usePrescriptions(consultation?.patientId)

  const previousCompletedConsultation = useMemo(() => {
    if (!consultation) return null
    const completedStatuses = new Set<Consultation["status"]>([
      "confirmed",
      "pending-review",
      "sent-to-pharmacy",
    ])
    const candidates = consultations.filter(
      (c) =>
        c.patientId === consultation.patientId &&
        c.id !== consultation.id &&
        completedStatuses.has(c.status),
    )
    if (candidates.length === 0) return null
    return candidates.reduce((latest, current) => {
      const latestDate = latest.createdAt instanceof Date ? latest.createdAt : new Date(latest.createdAt)
      const currentDate = current.createdAt instanceof Date ? current.createdAt : new Date(current.createdAt)
      return currentDate.getTime() > latestDate.getTime() ? current : latest
    })
  }, [consultation, consultations])

  // Keep prescription items in sync with consultation
  useEffect(() => {
    if (!consultation) return
    if (consultation.prescription && consultation.prescription.length > 0) {
      setPrescriptionItems(
        consultation.prescription.map((p) => ({
          medication: p.medication,
          dosage: p.dosage,
          frequency: p.frequency,
          duration: p.duration,
          instructions: p.instructions ?? "",
        }))
      )
    } else {
      setPrescriptionItems([{ medication: "", dosage: "", frequency: "", duration: "", instructions: "" }])
    }
  }, [consultation])

  // One-box summary/diagnosis: use stored clinicalSummary + diagnosis, or parse aiSummary
  const displaySummary = (() => {
    if (!consultation) return { clinicalSummary: "", diagnosis: "" }
    if (
      (consultation as { clinicalSummary?: string }).clinicalSummary != null ||
      (consultation as { diagnosis?: string }).diagnosis != null
    ) {
      return {
        clinicalSummary: (consultation as { clinicalSummary?: string }).clinicalSummary ?? "",
        diagnosis: (consultation as { diagnosis?: string }).diagnosis ?? "",
      }
    }
    if (consultation.aiSummary) {
      return parseSummaryAndDiagnosis(consultation.aiSummary)
    }
    return { clinicalSummary: "", diagnosis: "" }
  })()

  // Keep editable summary and ICD-10 in sync with consultation
  useEffect(() => {
    setEditableClinicalSummary(displaySummary.clinicalSummary)
    setEditableDiagnosis(displaySummary.diagnosis)
    setEditableIcd10((consultation as { icd10Code?: string })?.icd10Code ?? "")
  }, [consultation, displaySummary.clinicalSummary, displaySummary.diagnosis])

  const handleSaveSummary = async () => {
    if (!consultation) return
    setSavingSummary(true)
    try {
      const fullText = `CLINICAL SUMMARY\n${editableClinicalSummary}\n\nDIAGNOSIS / IMPRESSION\n${editableDiagnosis}`
      const updateData: Record<string, unknown> = {
        clinicalSummary: editableClinicalSummary.trim() || undefined,
        diagnosis: editableDiagnosis.trim() || undefined,
        aiSummary: fullText,
      }
      const icd = editableIcd10.trim()
      if (icd) {
        updateData.icd10Code = icd
      }
      await updateConsultation(consultation.id, updateData)
      await refetchConsultations()
      toast.success("Summary and diagnosis saved.")
    } catch (error) {
      console.error("Failed to save summary:", error)
      toast.error(getSafeClientErrorMessage(error, ERROR_MESSAGES.OPERATION_FAILED))
    } finally {
      setSavingSummary(false)
    }
  }

  const handleRegenerateAISummary = async () => {
    if (!consultation || !patient) return
    const symptomsMap = (consultation.symptoms || {}) as unknown as Record<string, Record<string, boolean>>
    const symptomList = Object.keys(symptomsMap).length
      ? flattenSelectedSymptoms(symptomsMap)
      : []
    const hasContext =
      symptomList.length > 0 ||
      (consultation as { symptomDetails?: string }).symptomDetails ||
      (consultation as { presentingComplaint?: string }).presentingComplaint ||
      (consultation as { onset?: string }).onset ||
      (consultation as { vitalSigns?: string }).vitalSigns ||
      (consultation as { physicalExamination?: string }).physicalExamination ||
      (consultation as { specialInvestigations?: string }).specialInvestigations
    if (!hasContext) {
      toast.error("Add at least one symptom or section (PC, onset, vitals, exam, investigations) before regenerating.")
      return
    }
    setRegeneratingAI(true)
    try {
      const res = await fetch("/api/consultation-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: patient.name || consultation.patientName,
          symptoms: symptomList,
          symptomDetails: (consultation as { symptomDetails?: string }).symptomDetails,
          presentingComplaint: (consultation as { presentingComplaint?: string }).presentingComplaint,
          onset: (consultation as { onset?: string }).onset,
          vitalSigns: (consultation as { vitalSigns?: string }).vitalSigns,
          physicalExamination: (consultation as { physicalExamination?: string }).physicalExamination,
          specialInvestigations: (consultation as { specialInvestigations?: string }).specialInvestigations,
          allergies: patient.medicalHistory?.allergies,
          chronicConditions: patient.medicalHistory?.chronicConditions,
          currentMedications: patient.medicalHistory?.currentMedications,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Failed to generate summary")
        return
      }
      const parsed = parseSummaryAndDiagnosis(data.summary as string)
      setEditableClinicalSummary(parsed.clinicalSummary)
      setEditableDiagnosis(parsed.diagnosis)

      const icdFromApi = (data.icd10Code as string | undefined)?.trim()
      if (icdFromApi) {
        setEditableIcd10(icdFromApi)
      } else if (parsed.diagnosis) {
        const match =
          parsed.diagnosis.match(/(?:ICD-10|ICD10)\s*:?\s*([A-Z]\d{2}(?:\.\d{1,2})?)/i) ||
          parsed.diagnosis.match(/\b([A-Z]\d{2}(?:\.\d{1,2})?)\b/)
        if (match?.[1]) {
          setEditableIcd10(match[1].trim())
        }
      }
      toast.success("AI summary regenerated. Review and click Save to update the consultation.")
    } catch {
      toast.error("Failed to regenerate AI summary")
    } finally {
      setRegeneratingAI(false)
    }
  }

  const openPrescriptionDialog = () => {
    if (!consultation) return
    // Prefill items from existing structured prescription if available
    if (consultation.prescription && consultation.prescription.length > 0) {
      setPrescriptionItems(
        consultation.prescription.map((p) => ({
          medication: p.medication,
          dosage: p.dosage,
          frequency: p.frequency,
          duration: p.duration,
          instructions: p.instructions ?? "",
        }))
      )
    } else {
      setPrescriptionItems([{ medication: "", dosage: "", frequency: "", duration: "", instructions: "" }])
    }
    setShowPrescriptionDialog(true)
  }

  const addPrescriptionRow = () => {
    setPrescriptionItems((prev) => [
      ...prev,
      { medication: "", dosage: "", frequency: "", duration: "", instructions: "" },
    ])
  }

  const updatePrescriptionRow = (index: number, field: keyof PrescriptionFormItem, value: string) => {
    setPrescriptionItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }

  const removePrescriptionRow = (index: number) => {
    setPrescriptionItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSavePrescription = async () => {
    if (!consultation || !user) return

    const cleanedItems = prescriptionItems
      .map((item) => ({
        medication: item.medication.trim(),
        dosage: item.dosage.trim(),
        frequency: item.frequency.trim(),
        duration: item.duration.trim(),
        instructions: item.instructions.trim() || undefined,
      }))
      .filter((item) => item.medication && item.dosage)

    if (cleanedItems.length === 0) {
      toast.error("Add at least one medicine before saving.")
      return
    }

    // Derive scriptText from structured rows for backward compatibility / PDF
    const scriptText = cleanedItems
      .map((item) => {
        const parts: string[] = []
        if (item.medication) parts.push(item.medication)
        if (item.dosage) parts.push(item.dosage)
        if (item.frequency) parts.push(formatFrequencyForDisplay(item.frequency))
        if (item.duration) parts.push(item.duration)
        if (item.instructions) parts.push(item.instructions)
        return parts.join(" – ")
      })
      .join("\n")

    try {
      await updateConsultation(consultation.id, {
        prescription: cleanedItems,
        scriptText: scriptText || undefined,
        scriptCreatedAt: new Date(),
      })

      await addPrescription({
        patientId: consultation.patientId,
        doctorId: consultation.doctorId,
        consultationId: consultation.id,
        items: cleanedItems,
        scriptText: scriptText || undefined,
      })

      await Promise.all([refetchConsultations(), refetchPrescriptions()])
      toast.success(`Script saved for ${patient?.name || consultation.patientName || "patient"}.`)
      setShowPrescriptionDialog(false)
    } catch (error) {
      console.error("Failed to save prescription:", error)
      toast.error(getSafeClientErrorMessage(error, ERROR_MESSAGES.OPERATION_FAILED))
    }
  }

  const handleDownloadPdf = async () => {
    const patientName = patient?.name ?? consultation?.patientName ?? "Patient"
    const date =
      consultation?.createdAt instanceof Date
        ? consultation.createdAt
        : consultation?.createdAt
          ? new Date(consultation.createdAt)
          : new Date()
    const c = consultation as {
      presentingComplaint?: string
      onset?: string
      vitalSigns?: string
      physicalExamination?: string
      specialInvestigations?: string
    }
    const extra =
      c.presentingComplaint || c.onset || c.vitalSigns || c.physicalExamination || c.specialInvestigations
        ? {
            presentingComplaint: c.presentingComplaint,
            onset: c.onset,
            vitalSigns: c.vitalSigns,
            physicalExamination: c.physicalExamination,
            specialInvestigations: c.specialInvestigations,
          }
        : undefined
    await generateConsultationSummaryPdf(
      {
        name: patientName,
        phone: patient?.phone,
        email: patient?.email,
        address: patient?.address,
        patientNumber: patient?.patientNumber,
      },
      displaySummary.clinicalSummary,
      displaySummary.diagnosis,
      date,
      undefined,
      extra
    )
    toast.success("PDF downloaded")
  }

  const handleCompleteConsultation = async () => {
    if (!consultation || !user) return
    if (completing) return
    setCompleting(true)
    try {
      const summaryToUse = editableClinicalSummary.trim()
      const diagnosisToUse = editableDiagnosis.trim()
      const hasContent =
        summaryToUse.length > 0 ||
        diagnosisToUse.length > 0 ||
        ((consultation as { scriptText?: string }).scriptText ?? "").trim().length > 0 ||
        (consultation.prescription && consultation.prescription.length > 0)

      if (!hasContent) {
        toast.error(
          "Add consultation details (summary, diagnosis, script, or prescription) before completing."
        )
        setCompleting(false)
        return
      }

      const hasMedication =
        (consultation.prescription &&
          Array.isArray(consultation.prescription) &&
          (consultation.prescription as { medication?: string }[]).some(
            (p) => (p?.medication ?? "").trim() !== ""
          )) ||
        ((consultation as { scriptText?: string }).scriptText ?? "").trim().length > 0

      if (!hasMedication) {
        setShowNoMedicationDialog(true)
        setCompleting(false)
        return
      }

      // Persist current summary/diagnosis/ICD-10 so PDF API sees latest
      const completionUpdate: Record<string, unknown> = {
        clinicalSummary: summaryToUse || undefined,
        diagnosis: diagnosisToUse || undefined,
        aiSummary:
          summaryToUse || diagnosisToUse
            ? `CLINICAL SUMMARY\n${summaryToUse}\n\nDIAGNOSIS / IMPRESSION\n${diagnosisToUse}`
            : undefined,
      }
      const icdFromField = editableIcd10.trim()
      if (icdFromField) {
        completionUpdate.icd10Code = icdFromField
      }
      await updateConsultation(consultation.id, completionUpdate)
      await refetchConsultations()

      // If medical aid patient, show claim step before generating PDFs
      if (isMedicalAidPatient(patient)) {
        const lines = editableClinicalSummary.trim().split(/\r?\n/).filter(Boolean)
        setClaimIcd10((editableIcd10.trim() || (consultation as { icd10Code?: string })?.icd10Code) ?? "")
        setClaimClinicalSummaryShort(lines.slice(0, 6).join("\n"))
        const primaryDiagnosis =
          editableDiagnosis.trim() ||
          (consultation as { finalDiagnosis?: string }).finalDiagnosis ||
          displaySummary.diagnosis ||
          ""
        const icdForFirstRow =
          editableIcd10.trim() ||
          ((consultation as { icd10Code?: string }).icd10Code ?? "") ||
          ""
        setClaimDiagnosisRows([
          { line: primaryDiagnosis, icd10: icdForFirstRow },
          { line: "", icd10: "" },
          { line: "", icd10: "" },
          { line: "", icd10: "" },
        ])

        const existingMeds =
          (consultation.prescription as {
            medication: string
            dosage: string
            frequency?: string
            duration?: string
            instructions?: string
          }[]) ?? []
        const initialClaimMeds =
          existingMeds.length > 0
            ? existingMeds.map((m) => ({
                name: m.medication ?? "",
                quantity: "",
                duration: m.duration ?? "",
                dosage: m.dosage ?? "",
                instructions: m.instructions ?? "",
              }))
            : [
                {
                  name: "",
                  quantity: "",
                  duration: "",
                  dosage: "",
                  instructions: "",
                },
              ]
        setClaimMedicationRows(initialClaimMeds)
        setClaimInjectionsText("")
        setClaimProceduresText("")
        setClaimMaterials({
          syringeNeedle: "",
          swab: "",
          glove: "",
          bandage: "",
          other: "",
        })
        setShowClaimModal(true)
        setCompleting(false)
        return
      }

      await doCompletionFlow()
    } catch (error) {
      console.error("Failed to complete consultation:", error)
      toast.error(getSafeClientErrorMessage(error, ERROR_MESSAGES.OPERATION_FAILED))
    } finally {
      setCompleting(false)
    }
  }

  const handleProceedWithoutMedication = async () => {
    if (!consultation || !user) return
    setShowNoMedicationDialog(false)
    setCompleting(true)
    try {
      const summaryToUse = editableClinicalSummary.trim()
      const diagnosisToUse = editableDiagnosis.trim()
      const completionUpdate: Record<string, unknown> = {
        clinicalSummary: summaryToUse || undefined,
        diagnosis: diagnosisToUse || undefined,
        aiSummary:
          summaryToUse || diagnosisToUse
            ? `CLINICAL SUMMARY\n${summaryToUse}\n\nDIAGNOSIS / IMPRESSION\n${diagnosisToUse}`
            : undefined,
      }
      const icdFromField = editableIcd10.trim()
      if (icdFromField) completionUpdate.icd10Code = icdFromField
      await updateConsultation(consultation.id, completionUpdate)
      await refetchConsultations()

      if (isMedicalAidPatient(patient)) {
        const lines = editableClinicalSummary.trim().split(/\r?\n/).filter(Boolean)
        setClaimIcd10((editableIcd10.trim() || (consultation as { icd10Code?: string })?.icd10Code) ?? "")
        setClaimClinicalSummaryShort(lines.slice(0, 6).join("\n"))
        const primaryDiagnosis =
          editableDiagnosis.trim() ||
          (consultation as { finalDiagnosis?: string }).finalDiagnosis ||
          displaySummary.diagnosis ||
          ""
        const icdForFirstRow =
          editableIcd10.trim() ||
          ((consultation as { icd10Code?: string }).icd10Code ?? "") ||
          ""
        setClaimDiagnosisRows([
          { line: primaryDiagnosis, icd10: icdForFirstRow },
          { line: "", icd10: "" },
          { line: "", icd10: "" },
          { line: "", icd10: "" },
        ])
        const existingMeds =
          (consultation.prescription as {
            medication: string
            dosage: string
            frequency?: string
            duration?: string
            instructions?: string
          }[]) ?? []
        const initialClaimMeds =
          existingMeds.length > 0
            ? existingMeds.map((m) => ({
                name: m.medication ?? "",
                quantity: "",
                duration: m.duration ?? "",
                dosage: m.dosage ?? "",
                instructions: m.instructions ?? "",
              }))
            : [{ name: "", quantity: "", duration: "", dosage: "", instructions: "" }]
        setClaimMedicationRows(initialClaimMeds)
        setClaimInjectionsText("")
        setClaimProceduresText("")
        setClaimMaterials({
          syringeNeedle: "",
          swab: "",
          glove: "",
          bandage: "",
          other: "",
        })
        setShowClaimModal(true)
        setCompleting(false)
        return
      }
      await doCompletionFlow()
    } catch (error) {
      console.error("Failed to proceed:", error)
      toast.error(getSafeClientErrorMessage(error, ERROR_MESSAGES.OPERATION_FAILED))
    } finally {
      setCompleting(false)
    }
  }

  const doCompletionFlow = async () => {
    if (!consultation || !user || !patient) return
    setCompleting(true)
    try {
      let followUpAppointmentId: string | undefined
      let followUpAppointmentDate: Date | undefined
      let followUpAppointmentTime: string | undefined

      if (
        followUpEnabled &&
        followUpDate &&
        followUpStartTime &&
        followUpEndTime &&
        followUpType
      ) {
        try {
          const date = new Date(followUpDate)
          const baseReason =
            followUpReason.trim() ||
            (displaySummary.diagnosis?.trim()
              ? `Follow-up for ${displaySummary.diagnosis.trim()}`
              : (consultation as { presentingComplaint?: string }).presentingComplaint?.trim()
              ? `Follow-up for ${(consultation as { presentingComplaint?: string }).presentingComplaint}`
              : "Follow-up appointment")

          // Lazy import to avoid circular dependencies in hooks
          const { addAppointment } = await import("@/lib/firebase")

          const createdId = await addAppointment({
            patientId: consultation.patientId,
            doctorId: consultation.doctorId,
            doctorName: consultation.doctorName || user.name,
            date,
            startTime: followUpStartTime,
            endTime: followUpEndTime,
            type: followUpType,
            status: "scheduled",
            reason: baseReason,
            notes: followUpReason.trim() || undefined,
            consultationId: consultation.id,
          })

          followUpAppointmentId = createdId
          followUpAppointmentDate = date
          followUpAppointmentTime = `${followUpStartTime} - ${followUpEndTime}`
        } catch (err) {
          console.error("Follow-up appointment creation failed:", err)
          toast.error(
            "Follow-up appointment could not be created. The consultation will still be completed.",
          )
        }
      }

      // 1) Try to generate consultation and script PDFs and store in Firebase Storage.
      // If this fails in production (e.g. Firebase admin/service-account issues),
      // we still want the consultation to be marked as completed.
      let pdfStorageUrl: string | undefined
      let scriptPdfUrl: string | undefined
      try {
        const pdfRes = await fetch("/api/consultation-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ consultationId: consultation.id }),
        })
        if (pdfRes.ok) {
          const body = (await pdfRes.json()) as { url?: string }
          if (body?.url) {
            pdfStorageUrl = body.url
          }
        } else {
          const err = await pdfRes.json().catch(() => ({}))
          console.error("Failed to generate consultation PDF:", err)
          toast.error(
            (err as { error?: string })?.error ||
              "Could not generate consultation PDF. The consultation will still be completed."
          )
        }
      } catch (err) {
        console.error("Consultation PDF API call failed:", err)
        toast.error("Could not generate consultation PDF. The consultation will still be completed.")
      }

      // Try to store prescription/script PDF (if any script or prescription exists)
      if (
        ((consultation as { scriptText?: string }).scriptText ?? "").trim().length > 0 ||
        (consultation.prescription && consultation.prescription.length > 0)
      ) {
        try {
          const scriptRes = await fetch("/api/prescription-pdf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ consultationId: consultation.id, store: true }),
          })
          if (scriptRes.ok) {
            const body = (await scriptRes.json()) as { url?: string }
            if (body?.url) {
              scriptPdfUrl = body.url
            }
          } else {
            const err = await scriptRes.json().catch(() => ({}))
            console.error("Failed to generate prescription PDF:", err)
            toast.error(
              (err as { error?: string }).error ||
                "Could not generate prescription PDF. The consultation will still be completed."
            )
          }
        } catch (err) {
          console.error("Prescription PDF API call failed:", err)
          toast.error("Could not generate prescription PDF. The consultation will still be completed.")
        }
      }

      // 2) Update consultation with status (and PDF URL when available)
      const followUpUpdate: Record<string, unknown> = {}
      if (followUpAppointmentId && followUpAppointmentDate && followUpAppointmentTime) {
        followUpUpdate.followUpAppointmentId = followUpAppointmentId
        followUpUpdate.followUpAppointmentDate = followUpAppointmentDate
        followUpUpdate.followUpAppointmentTime = followUpAppointmentTime
      }

      await updateConsultation(consultation.id, {
        status: "confirmed",
        confirmedAt: new Date(),
        ...(pdfStorageUrl ? { pdfStorageUrl } : {}),
        ...(scriptPdfUrl ? { scriptPdfUrl } : {}),
        ...followUpUpdate,
      })

      const symptomList = consultation.symptoms
        ? (GENERAL_HEALTH_QUESTIONNAIRE as unknown as Record<string, unknown>[]).length
          ? flattenSelectedSymptoms(
              consultation.symptoms as unknown as Record<string, Record<string, boolean>>
            )
          : []
        : []

      // 3) Add medical record (with PDF link so it's accessible from patient records)
      await addMedicalRecord({
        patientId: consultation.patientId,
        appointmentId: consultation.appointmentId ?? "",
        doctorId: consultation.doctorId,
        date: consultation.createdAt instanceof Date ? consultation.createdAt : new Date(consultation.createdAt),
        chiefComplaint: symptomList.slice(0, 5).join("; ") || "Consultation",
        symptoms: symptomList,
        examination: displaySummary.clinicalSummary,
        diagnosis: displaySummary.diagnosis,
        treatment: "",
        prescription: consultation.prescription ?? [],
        scriptText: (consultation as { scriptText?: string }).scriptText,
        scriptCreatedAt:
          (consultation as { scriptCreatedAt?: Date }).scriptCreatedAt ?? new Date(),
        scriptPdfUrl,
        consultationId: consultation.id,
        pdfStorageUrl,
      })

      // 4) Send completion confirmation/billing email (best-effort, no scripts attached)
      if (patient?.email?.trim()) {
        const mode =
          isMedicalAidPatient(patient) || (patient as { paymentMethod?: string }).paymentMethod === "medical-aid"
            ? "medical-aid"
            : (patient as { paymentMethod?: string }).paymentMethod === "cash"
              ? "cash"
              : undefined

        if (mode === "medical-aid" || mode === "cash") {
          const emailToastId = toast.loading("Sending consultation confirmation email…")
          try {
            const res = await fetch("/api/send-consultation-complete-email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ consultationId: consultation.id, mode }),
            })
            if (!res.ok) {
              const data = (await res.json().catch(() => ({}))) as { error?: string }
              const msg =
                data.error ||
                "Consultation completed but confirmation email could not be sent. The patient can still be seen in the portal."
              toast.error(msg)
            }
          } catch (err) {
            console.error("[ConsultationDetail] Completion email failed:", err)
            toast.error(
              "Consultation completed but confirmation email could not be sent. The patient can still be seen in the portal."
            )
          } finally {
            toast.dismiss(emailToastId)
          }
        }
      }

      await appendPatientVisit(consultation.patientId)
      await refetchConsultations()
      if (user) {
        await addPatientAuditLog({
          patientId: consultation.patientId,
          patientName: patient?.name || consultation.patientName,
          action: "status-change",
          fromStatus: consultation.status,
          toStatus: "completed",
          performedByUserId: user.id,
          performedByName: user.name,
          performedByRole: user.role,
        })
      }
      toast.success("Consultation completed successfully.")
      setShowCompletionSuccessDialog(true)
    } catch (error) {
      console.error("Failed to complete consultation:", error)
      toast.error(getSafeClientErrorMessage(error, ERROR_MESSAGES.OPERATION_FAILED))
    } finally {
      setCompleting(false)
    }
  }

  const handleBackToWaitingList = () => {
    setShowCompletionSuccessDialog(false)
    router.push("/dashboard/waiting")
  }

  const handleClaimCreateAndContinue = async () => {
    if (!consultation || !user) return
    setClaimCreating(true)
    try {
      const chronicFromCheckbox = claimChronicCodes.join(", ")
      const icd = (claimIcd10.trim() || chronicFromCheckbox).trim()

      const diagnosisLines = claimDiagnosisRows
        .map((row) => ({
          line: row.line.trim(),
          icd10: row.icd10.trim(),
        }))
        .filter((row) => row.line || row.icd10)

      const hasDiagnosis = diagnosisLines.length > 0

      if (!icd || !hasDiagnosis) {
        toast.error("Add at least one diagnosis line and an ICD-10 code or chronic code selection.")
        setClaimCreating(false)
        return
      }

      if (icd) {
        await updateConsultation(consultation.id, { icd10Code: icd })
        await refetchConsultations()
      }

      if (diagnosisLines.length > 0 && !diagnosisLines[0].icd10) {
        diagnosisLines[0].icd10 = icd
      }

      const medications = claimMedicationRows
        .map((row) => ({
          name: row.name.trim(),
          quantity: row.quantity.trim(),
          duration: row.duration.trim(),
          dosage: row.dosage.trim(),
          instructions: row.instructions.trim(),
        }))
        .filter((row) => row.name)

      const res = await fetch("/api/medical-aid-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultationId: consultation.id,
          icd10Code: icd || undefined,
          createdBy: user.id,
          createdByName: user.name,
          diagnosisLines,
          injectionsText: claimInjectionsText.trim() || undefined,
          proceduresText: claimProceduresText.trim() || undefined,
          materials: {
            syringeNeedle: claimMaterials.syringeNeedle.trim() || undefined,
            swab: claimMaterials.swab.trim() || undefined,
            glove: claimMaterials.glove.trim() || undefined,
            bandage: claimMaterials.bandage.trim() || undefined,
            other: claimMaterials.other.trim() || undefined,
          },
          medications,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; claimId?: string }
      if (!res.ok) {
        toast.error(data.error ?? "Failed to create medical aid claim")
        return
      }
      const claimId = data.claimId ?? null
      toast.success("Medical aid claim created.")
      setShowClaimModal(false)
      await doCompletionFlow()
      if (claimId) {
        setLastCreatedClaimId(claimId)
        setShowClaimNextStepDialog(true)
      }
    } catch (e) {
      console.error("Claim create failed:", e)
      toast.error(e instanceof Error ? e.message : "Failed to create claim")
    } finally {
      setClaimCreating(false)
    }
  }

  const handleSendClaimNow = async () => {
    if (!lastCreatedClaimId) {
      setShowClaimNextStepDialog(false)
      return
    }
    try {
      const res = await fetch("/api/medical-aid-claim-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId: lastCreatedClaimId }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast.error(data.error ?? "Failed to send claim to Medical Aid Portal.")
        return
      }
      toast.success("Claim sent to Medical Aid Portal.")
      setShowClaimNextStepDialog(false)
    } catch (e) {
      console.error("Send claim now failed:", e)
      toast.error(e instanceof Error ? e.message : "Failed to send claim to Medical Aid Portal.")
    }
  }

  const handleEditClaim = () => {
    setShowClaimNextStepDialog(false)
    if (lastCreatedClaimId) {
      router.push(`/dashboard/medical-aid-claims/${lastCreatedClaimId}/edit`)
    } else {
      router.push("/dashboard/medical-aid-claims")
    }
  }

  const handleClaimSkip = () => {
    setShowClaimModal(false)
    doCompletionFlow()
  }

  const handlePrintPdf = () => {
    const url = (consultation as { pdfStorageUrl?: string })?.pdfStorageUrl
    if (!url) {
      toast.error("PDF not yet generated. Complete the consultation first.")
      return
    }
    const w = window.open(url, "_blank", "noopener,noreferrer")
    if (w) w.onload = () => w.print()
    else toast.error("Allow pop-ups to print the PDF.")
  }

  const handleDownloadScriptPdf = async () => {
    if (!consultation) return
    setActionError(null)
    setScriptPdfLoading(true)
    try {
      const res = await fetch("/api/prescription-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultationId: consultation.id }),
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        const errMsg = getSafeMessageFromApiPayload(errBody, ERROR_MESSAGES.PDF_GENERATION_FAILED)
        setActionError(`Script PDF: ${errMsg}`)
        toast.error(errMsg)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const w = window.open(url, "_blank", "noopener,noreferrer")
      if (!w) {
        const link = document.createElement("a")
        link.href = url
        link.download = `prescription-${consultation.id}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
      toast.success("Script PDF downloaded")
    } catch (error) {
      const msg = getSafeClientErrorMessage(error, ERROR_MESSAGES.NETWORK)
      setActionError(`Script PDF: ${msg}`)
      console.error("[ConsultationDetail] Failed to download prescription PDF:", error)
      toast.error(`Script PDF: ${msg}`)
    } finally {
      setScriptPdfLoading(false)
    }
  }

  const handlePrintScript = async () => {
    if (!consultation) return
    setActionError(null)
    setPrintScriptLoading(true)
    try {
      const res = await fetch("/api/prescription-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultationId: consultation.id }),
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        const errMsg = getSafeMessageFromApiPayload(errBody, ERROR_MESSAGES.PDF_GENERATION_FAILED)
        setActionError(`Print script: ${errMsg}`)
        toast.error(errMsg)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const w = window.open(url, "_blank", "noopener,noreferrer")
      if (w) w.onload = () => w.print()
      else {
        setActionError("Print script: Allow pop-ups for this site to print.")
        toast.error("Allow pop-ups to print the script.")
      }
    } catch (error) {
      const msg = getSafeClientErrorMessage(error, ERROR_MESSAGES.NETWORK)
      setActionError(`Print script: ${msg}`)
      console.error("[ConsultationDetail] Failed to print script:", error)
      toast.error(`Print script: ${msg}`)
    } finally {
      setPrintScriptLoading(false)
    }
  }

  const handleEmailToPatientClick = () => {
    if (!consultation || !patient) return

    // Check if email was already sent
    const emailAlreadySent = (consultation as { pdfSentAt?: Date; pdfSentTo?: string }).pdfSentAt ||
                            (consultation as { pdfSentAt?: Date; pdfSentTo?: string }).pdfSentTo

    if (emailAlreadySent) {
      // Show re-send warning dialog
      setShowResendWarningDialog(true)
    } else {
      // Show confirmation dialog
      setShowEmailConfirmDialog(true)
    }
  }

  const handleConfirmEmailSend = async () => {
    if (!consultation) return
    setShowEmailConfirmDialog(false)
    await sendEmailToPatient()
  }

  const handleConfirmResend = async () => {
    if (!consultation) return
    setShowResendWarningDialog(false)
    await sendEmailToPatient()
  }

  const sendEmailToPatient = async () => {
    if (!consultation) return
    setActionError(null)
    setEmailSending(true)
    try {
      const pdfUrl = (consultation as { pdfStorageUrl?: string }).pdfStorageUrl
      if (!pdfUrl) {
        const pdfRes = await fetch("/api/consultation-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ consultationId: consultation.id }),
        })
        const pdfErr = await pdfRes.json().catch(() => ({}))
        if (!pdfRes.ok) {
          const msg = getSafeMessageFromApiPayload(pdfErr, ERROR_MESSAGES.PDF_GENERATION_FAILED)
          setActionError(`Email (PDF step): ${msg}`)
          toast.error(msg)
          return
        }
        await refetchConsultations()
      }
      const res = await fetch("/api/send-consultation-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultationId: consultation.id }),
      })
      const data = await res.json().catch(() => ({})) as { error?: string; mailto?: string }
      const patientName = patient?.name || consultation.patientName || "patient"
      if (res.ok) {
        toast.success("Email sent to patient successfully.")
        refetchConsultations()
      } else if (res.status === 503 && data.mailto) {
        window.location.href = data.mailto
        toast.success(`Open your email client and send the link to ${patientName}.`)
      } else {
        const msg = getSafeMessageFromApiPayload(data, ERROR_MESSAGES.EMAIL_SEND_FAILED)
        setActionError(`Email: ${msg}`)
        toast.error(msg)
      }
    } catch (error) {
      const msg = getSafeClientErrorMessage(error, ERROR_MESSAGES.EMAIL_SEND_FAILED)
      setActionError(`Email: ${msg}`)
      console.error("[ConsultationDetail] Send email error:", error)
      toast.error(msg)
    } finally {
      setEmailSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Activity className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!consultation) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href="/dashboard/consultations">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Consultations
          </Link>
        </Button>
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Consultation Not Found</h3>
            <p className="text-muted-foreground mb-4">The consultation you're looking for doesn't exist.</p>
            <Button asChild>
              <Link href="/dashboard/consultations">View All Consultations</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isNewQuestionnaireFormat = (s: Record<string, unknown>) => {
    const categoryIds = new Set(GENERAL_HEALTH_QUESTIONNAIRE.map((c) => c.id))
    return Object.keys(s).some((k) => categoryIds.has(k))
  }

  const selectedSymptomsLegacy = (symptoms: Record<string, unknown>) => {
    const labels: string[] = []
    const add = (value: unknown, label: string) => {
      if (value === true) labels.push(label)
    }
    const flu = (symptoms.fluLikeInfectious || {}) as Record<string, unknown>
    add(flu.fever, "Fever")
    add(flu.coughOrShortnessOfBreath, "Cough or shortness of breath")
    add(flu.fatigueOrWeakness, "Fatigue or weakness")
    add(flu.soreThroat, "Sore throat")
    add(flu.runnyOrBlockedNose, "Runny or blocked nose")
    const pain = (symptoms.painAndDiscomfort || {}) as Record<string, unknown>
    add(pain.headache, "Headache")
    add(pain.pain, "Pain")
    add(pain.backOrNeckPain, "Back or neck pain")
    add(pain.muscleAches, "Muscle aches")
    const other = (symptoms.otherConcerns || {}) as Record<string, unknown>
    if (other.otherConcernsDescription) labels.push(`Other: ${String(other.otherConcernsDescription)}`)
    return labels
  }

  const symptomList = consultation.symptoms
    ? isNewQuestionnaireFormat(consultation.symptoms as unknown as Record<string, unknown>)
      ? flattenSelectedSymptoms(
          consultation.symptoms as unknown as Record<string, Record<string, boolean>>
        )
      : selectedSymptomsLegacy(consultation.symptoms as unknown as Record<string, unknown>)
    : []

  return (
    <div className="space-y-6 min-w-0">
      {previousCompletedConsultation && (
        <Card className="border-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-950/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
              Last Visit
            </CardTitle>
            <CardDescription className="text-xs text-emerald-900/80 dark:text-emerald-100/80">
              Most recent completed consultation before this visit.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-medium">
              {format(
                previousCompletedConsultation.createdAt instanceof Date
                  ? previousCompletedConsultation.createdAt
                  : new Date(previousCompletedConsultation.createdAt),
                "dd MMM yyyy – hh:mm a",
              )}
            </p>
            <p className="text-xs text-emerald-900/80 dark:text-emerald-100/80">
              <span className="font-semibold">Diagnosis Summary: </span>
              {previousCompletedConsultation.diagnosis ||
                previousCompletedConsultation.finalDiagnosis ||
                previousCompletedConsultation.clinicalSummary ||
                "No diagnosis recorded for the last visit."}
            </p>
          </CardContent>
        </Card>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/consultations">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2 truncate">
              <Stethoscope className="w-6 h-6 text-primary shrink-0" />
              Consultation Details
            </h1>
            <p className="text-muted-foreground truncate">
              {patient?.name || consultation.patientName}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 w-full min-w-0 sm:grid sm:grid-cols-2 lg:flex lg:flex-row lg:flex-wrap lg:gap-2">
          {(displaySummary.clinicalSummary || displaySummary.diagnosis) && (
            <Button size="sm" variant="outline" onClick={handleDownloadPdf}>
              <FileDown className="w-4 h-4 mr-1" />
              Consultation PDF
            </Button>
          )}
          {(consultation.prescription?.length ||
            (consultation as { scriptText?: string }).scriptText) && (
            <>
              <Button size="sm" variant="outline" onClick={handleDownloadScriptPdf} disabled={scriptPdfLoading}>
                {scriptPdfLoading ? <Activity className="w-4 h-4 mr-1 animate-spin" /> : <FileDown className="w-4 h-4 mr-1" />}
                Script PDF
              </Button>
              <Button size="sm" variant="outline" onClick={handlePrintScript} disabled={printScriptLoading}>
                {printScriptLoading ? <Activity className="w-4 h-4 mr-1 animate-spin" /> : <Printer className="w-4 h-4 mr-1" />}
                Print script
              </Button>
            </>
          )}
          {(consultation as { scriptPdfUrl?: string }).scriptPdfUrl && (
            <Button size="sm" variant="outline" asChild>
              <a href={(consultation as { scriptPdfUrl?: string }).scriptPdfUrl} target="_blank" rel="noopener noreferrer">
                <FileDown className="w-4 h-4 mr-1" />
                View script
              </a>
            </Button>
          )}
          {(consultation as { billPdfStorageUrl?: string }).billPdfStorageUrl && (
            <Button size="sm" variant="outline" asChild>
              <a href={(consultation as { billPdfStorageUrl?: string }).billPdfStorageUrl} target="_blank" rel="noopener noreferrer">
                <FileText className="w-4 h-4 mr-1" />
                View bill
              </a>
            </Button>
          )}
          {consultation.status === "confirmed" && (consultation as { pdfStorageUrl?: string }).pdfStorageUrl && (
            <Button size="sm" variant="outline" onClick={handlePrintPdf}>
              <Printer className="w-4 h-4 mr-1" />
              Print summary
            </Button>
          )}
          {!isCashPatient &&
            patient?.email &&
            (consultation.prescription?.length || (consultation as { scriptText?: string }).scriptText) && (
            <Button size="sm" variant="outline" onClick={handleEmailToPatientClick} disabled={emailSending}>
              {emailSending ? (
                <Activity className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Mail className="w-4 h-4 mr-1" />
              )}
              Email script & bill to patient
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={openPrescriptionDialog}>
            <FileText className="w-4 h-4 mr-1" />
            New Script
          </Button>
          {consultation.status === "in-progress" && (
            <Button size="sm" onClick={handleCompleteConsultation} disabled={completing}>
              {completing ? (
                <>
                  <Activity className="w-4 h-4 mr-1 animate-spin" />
                  Completing…
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Complete Consultation
                </>
              )}
            </Button>
          )}
          <Badge
            variant={
              consultation.status === "confirmed"
                ? "default"
                : consultation.status === "in-progress"
                  ? "secondary"
                  : "outline"
            }
          >
            {consultation.status}
          </Badge>
        </div>
      </div>

      {actionError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium">Action failed</p>
            <p className="mt-1 break-words">{actionError}</p>
            <p className="mt-2 text-xs opacity-90">On Vercel: add RESEND_API_KEY and FIREBASE_SERVICE_ACCOUNT_JSON (full JSON key) in Environment Variables. Check Deployment logs for details.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setActionError(null)} className="shrink-0">Dismiss</Button>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Patient Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Patient name</p>
                <p className="font-medium">{patient?.name || consultation.patientName}</p>
              </div>
              {patient?.patientNumber && (
                <div>
                  <p className="text-muted-foreground">Patient number</p>
                  <p className="font-medium">{patient.patientNumber}</p>
                </div>
              )}
              {patient?.idNumber && (
                <div>
                  <p className="text-muted-foreground">ID number</p>
                  <p className="font-medium">{patient.idNumber}</p>
                </div>
              )}
              {patient?.phone && (
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="font-medium">{patient.phone}</p>
                </div>
              )}
              {patient?.email && (
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium break-all">{patient.email}</p>
                </div>
              )}
              {patient?.address && (
                <div className="col-span-2 sm:col-span-3">
                  <p className="text-muted-foreground">Address</p>
                  <p className="font-medium">{patient.address}</p>
                </div>
              )}
              {patient?.dateOfBirth && (
                <div>
                  <p className="text-muted-foreground">Date of birth</p>
                  <p className="font-medium">
                    {patient.dateOfBirth instanceof Date
                      ? patient.dateOfBirth.toLocaleDateString()
                      : new Date(patient.dateOfBirth).toLocaleDateString()}
                  </p>
                </div>
              )}
              {patient?.gender && (
                <div>
                  <p className="text-muted-foreground">Gender</p>
                  <p className="font-medium capitalize">{patient.gender}</p>
                </div>
              )}
            </div>
            {patient?.emergencyContact && (patient.emergencyContact.name || patient.emergencyContact.phone) && (
              <div className="border-t pt-4">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide mb-2">Emergency contact</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
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
            {(patient?.medicalAidInfo?.name || patient?.medicalAidInfo?.memberNumber || patient?.insuranceInfo) && (
              <div className="border-t pt-4">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide mb-2">Medical aid / insurance</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                  {patient?.medicalAidInfo?.name && (
                    <div>
                      <p className="text-muted-foreground">Medical aid</p>
                      <p className="font-medium">{patient.medicalAidInfo.name}</p>
                    </div>
                  )}
                  {patient?.medicalAidInfo?.memberNumber && (
                    <div>
                      <p className="text-muted-foreground">Member number</p>
                      <p className="font-medium">{patient.medicalAidInfo.memberNumber}</p>
                    </div>
                  )}
                  {patient?.insuranceInfo?.provider && (
                    <div>
                      <p className="text-muted-foreground">Insurance</p>
                      <p className="font-medium">{patient.insuranceInfo!.provider}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            {patient?.accountResponsible && (patient.accountResponsible.surname || patient.accountResponsible.firstNames) && (
              <div className="border-t pt-4">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide mb-2">Account responsible</p>
                <p className="text-sm font-medium">
                  {[patient.accountResponsible.title, patient.accountResponsible.firstNames, patient.accountResponsible.surname].filter(Boolean).join(" ")}
                </p>
              </div>
            )}
            {patient?.medicalHistory &&
              ((patient.medicalHistory.allergies?.length ?? 0) > 0 ||
                (patient.medicalHistory.chronicConditions?.length ?? 0) > 0 ||
                (patient.medicalHistory.currentMedications?.length ?? 0) > 0) && (
              <div className="border-t pt-4">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide mb-2">Medical history</p>
                <div className="space-y-2 text-sm">
                  {patient.medicalHistory.allergies && patient.medicalHistory.allergies.length > 0 && (
                    <div>
                      <p className="text-muted-foreground">Allergies</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {patient.medicalHistory.allergies.map((a: string) => (
                          <Badge key={a} variant="destructive" className="text-xs">
                            {a}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {patient.medicalHistory.chronicConditions && patient.medicalHistory.chronicConditions.length > 0 && (
                    <div>
                      <p className="text-muted-foreground">Chronic conditions</p>
                      <p className="font-medium">{patient.medicalHistory.chronicConditions.join(", ")}</p>
                    </div>
                  )}
                  {patient.medicalHistory.currentMedications && patient.medicalHistory.currentMedications.length > 0 && (
                    <div>
                      <p className="text-muted-foreground">Current medications</p>
                      <p className="font-medium">{patient.medicalHistory.currentMedications.join(", ")}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Consultation Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Doctor</p>
                <p className="font-medium break-words">{consultation.doctorName || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Consultation Start Time</p>
                <p className="font-medium">
                  {consultation.createdAt instanceof Date
                    ? format(consultation.createdAt, "d MMM yyyy – HH:mm")
                    : format(new Date(consultation.createdAt), "d MMM yyyy – HH:mm")}
                </p>
              </div>
              {consultation.updatedAt && (
                <div>
                  <p className="text-muted-foreground">Last Updated Time</p>
                  <p className="font-medium">
                    {format(consultation.updatedAt instanceof Date ? consultation.updatedAt : new Date(consultation.updatedAt), "d MMM yyyy – HH:mm")}
                  </p>
                </div>
              )}
              {consultation.status === "confirmed" && consultation.confirmedAt && (
                <div>
                  <p className="text-muted-foreground">Completion Time</p>
                  <p className="font-medium">
                    {format(consultation.confirmedAt instanceof Date ? consultation.confirmedAt : new Date(consultation.confirmedAt), "d MMM yyyy – HH:mm")}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Structured Medicine: editable inline – moved up for prominence */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Structured Medicine
          </CardTitle>
          <CardDescription>
            Enter medicines and instructions below. This will appear on the script PDF and consultation summary.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Medicines</Label>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={addPrescriptionRow} className="min-h-[44px]">
                  Add medicine
                </Button>
                <Button type="button" variant="default" size="sm" onClick={handleSavePrescription} className="min-h-[44px]">
                  Save script
                </Button>
              </div>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto min-h-0">
              {prescriptionItems.map((item, index) => (
                <div key={index} className="flex flex-wrap items-end gap-2 rounded-lg border p-3">
                  <div className="flex-1 min-w-[120px]">
                    <Label className="text-xs">Medicine Name</Label>
                    <Input
                      className="min-h-[44px]"
                      value={item.medication}
                      onChange={(e) => updatePrescriptionRow(index, "medication", e.target.value)}
                      placeholder="e.g. Amoxicillin 500mg"
                    />
                  </div>
                  <div className="w-24">
                    <Label className="text-xs">Dosage</Label>
                    <Input
                      value={item.dosage}
                      onChange={(e) => updatePrescriptionRow(index, "dosage", e.target.value)}
                      placeholder="1 cap"
                    />
                  </div>
                  <div className="w-28">
                    <Label className="text-xs">Frequency</Label>
                    <Input
                      value={item.frequency}
                      onChange={(e) => updatePrescriptionRow(index, "frequency", e.target.value)}
                      placeholder="3x daily"
                    />
                  </div>
                  <div className="w-24">
                    <Label className="text-xs">Duration</Label>
                    <Input
                      value={item.duration}
                      onChange={(e) => updatePrescriptionRow(index, "duration", e.target.value)}
                      placeholder="5 days"
                    />
                  </div>
                  <div className="flex-1 min-w-[120px]">
                    <Label className="text-xs">Notes</Label>
                    <Input
                      className="min-h-[44px]"
                      value={item.instructions}
                      onChange={(e) => updatePrescriptionRow(index, "instructions", e.target.value)}
                      placeholder="e.g. Take after food"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removePrescriptionRow(index)}
                    disabled={prescriptionItems.length === 1}
                    className="shrink-0"
                    aria-label="Remove row"
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Presenting Complaint, Onset, Vital Signs, Physical Exam, Special Investigations */}
      <Card>
        <CardHeader>
          <CardTitle>Consultation details</CardTitle>
          <CardDescription>Presenting complaint, onset, vitals, examination, and investigations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Presenting Complaint</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {(consultation as { presentingComplaint?: string }).presentingComplaint?.trim() || "Not recorded"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Onset</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {(consultation as { onset?: string }).onset?.trim() || "Not recorded"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Vital Signs</p>
            <p className="text-sm text-foreground whitespace-pre-wrap font-mono">
              {(consultation as { vitalSigns?: string }).vitalSigns?.trim() || "Not recorded"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Physical Examination</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {(consultation as { physicalExamination?: string }).physicalExamination?.trim() || "Not recorded"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Special Investigations</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {(consultation as { specialInvestigations?: string }).specialInvestigations?.trim() || "Not recorded"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* One box: Clinical Summary & Diagnosis / Impression – editable when in-progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Clinical Summary & Diagnosis
          </CardTitle>
          {consultation.status === "in-progress" && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRegenerateAISummary}
                disabled={regeneratingAI}
              >
                {regeneratingAI ? (
                  <Activity className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-1" />
                )}
                Regenerate AI summary
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveSummary}
                disabled={savingSummary}
              >
                {savingSummary ? (
                  <Activity className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-1" />
                )}
                Save summary
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {consultation.status === "in-progress" ? (
            <>
              <div>
                <p className="text-sm font-bold text-foreground uppercase tracking-wide mb-2">Clinical Summary</p>
                <Textarea
                  value={editableClinicalSummary}
                  onChange={(e) => setEditableClinicalSummary(e.target.value)}
                  rows={4}
                  className="font-mono text-sm"
                  placeholder="Clinical summary..."
                />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground uppercase tracking-wide mb-2">Diagnosis / Impression</p>
                <Textarea
                  value={editableDiagnosis}
                  onChange={(e) => setEditableDiagnosis(e.target.value)}
                  rows={3}
                  className="font-mono text-sm"
                  placeholder="Working diagnosis, ICD-10 if applicable..."
                />
              </div>
              <div>
                <Label className="text-sm font-bold text-foreground uppercase tracking-wide">ICD-10 code</Label>
                <Input
                  value={editableIcd10}
                  onChange={(e) => setEditableIcd10(e.target.value)}
                  className="mt-1 font-mono max-w-[12rem]"
                  placeholder="e.g. J06.9"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-sm font-bold text-foreground uppercase tracking-wide mb-2">Clinical Summary</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {displaySummary.clinicalSummary || "—"}
                </p>
              </div>
              <div>
                <p className="text-sm font-bold text-foreground uppercase tracking-wide mb-2">Diagnosis / Impression</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {displaySummary.diagnosis || "—"}
                </p>
              </div>
              {(consultation as { icd10Code?: string })?.icd10Code && (
                <div>
                  <p className="text-sm font-bold text-foreground uppercase tracking-wide mb-1">ICD-10</p>
                  <p className="text-sm text-foreground">{(consultation as { icd10Code?: string }).icd10Code}</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {consultation.symptoms && Object.keys(consultation.symptoms).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Symptoms</CardTitle>
            <CardDescription>Selected from General Health Questionnaire</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {symptomList.length > 0 ? (
              <ul className="grid gap-2 sm:grid-cols-2 text-sm">
                {symptomList.map((item) => (
                  <li key={item} className="rounded-md bg-muted/60 px-3 py-2">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No symptoms recorded</p>
            )}
            {(consultation as { symptomDetails?: string }).symptomDetails && (
              <div className="pt-3 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-1">Additional details</p>
                <p className="text-sm whitespace-pre-wrap">
                  {(consultation as { symptomDetails?: string }).symptomDetails}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {consultation.finalDiagnosis && (
        <Card>
          <CardHeader>
            <CardTitle>Final Diagnosis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-foreground">{consultation.finalDiagnosis}</p>
          </CardContent>
        </Card>
      )}

      {/* Follow-up appointment booking */}
      <Card>
        <CardHeader>
          <CardTitle>Book Follow-up Appointment</CardTitle>
          <CardDescription>
            Optionally schedule a follow-up for this patient. If created, the follow-up date and time will be included in the completion email.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="follow-up-enabled"
              checked={followUpEnabled}
              onCheckedChange={(checked) => setFollowUpEnabled(checked === true)}
            />
            <Label htmlFor="follow-up-enabled" className="text-sm">
              Book appointment for this patient
            </Label>
          </div>
          {followUpEnabled && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="follow-up-date" className="text-sm font-medium">
                  Date
                </Label>
                <Input
                  id="follow-up-date"
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Start time</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={followUpStartTime}
                  onChange={(e) => setFollowUpStartTime(e.target.value)}
                >
                  <option value="">Select start time</option>
                  {FOLLOW_UP_TIME_SLOTS.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">End time</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={followUpEndTime}
                  onChange={(e) => setFollowUpEndTime(e.target.value)}
                >
                  <option value="">Select end time</option>
                  {FOLLOW_UP_TIME_SLOTS.filter((t) => !followUpStartTime || t > followUpStartTime).map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Appointment type</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={followUpType}
                  onChange={(e) =>
                    setFollowUpType(
                      e.target.value as
                        | "consultation"
                        | "follow-up"
                        | "emergency"
                        | "routine-checkup"
                        | "vaccination"
                        | "",
                    )
                  }
                >
                  <option value="">Select type</option>
                  <option value="follow-up">Follow-up</option>
                  <option value="consultation">Consultation</option>
                  <option value="routine-checkup">Routine checkup</option>
                  <option value="vaccination">Vaccination</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="follow-up-reason" className="text-sm font-medium">
                  Notes / reason (optional)
                </Label>
                <Input
                  id="follow-up-reason"
                  value={followUpReason}
                  onChange={(e) => setFollowUpReason(e.target.value)}
                  placeholder="e.g. Review blood pressure control in 1 month"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {consultation.prescription && consultation.prescription.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Prescription</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {consultation.prescription.map(
                (
                  prescription: {
                    medication: string
                    dosage: string
                    frequency?: string
                    duration?: string
                    instructions?: string
                  },
                  index: number,
                ) => {
                  const lineParts: string[] = []
                  if (prescription.dosage) lineParts.push(prescription.dosage)
                  if (prescription.frequency) lineParts.push(formatFrequencyForDisplay(prescription.frequency))
                  if (prescription.duration) lineParts.push(prescription.duration)
                  const metaLine = lineParts.join(" · ")
                  return (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium">{prescription.medication}</p>
                        {prescription.dosage && (
                          <Badge variant="outline" className="ml-2">
                            {prescription.dosage}
                          </Badge>
                        )}
                      </div>
                      {metaLine && (
                        <p className="text-xs text-muted-foreground mb-1">{metaLine}</p>
                      )}
                      {prescription.instructions && (
                        <p className="text-sm text-muted-foreground">{prescription.instructions}</p>
                      )}
                    </div>
                  )
                },
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Medical Aid Claim step – before consultation/script PDFs for medical-aid patients */}
      <Dialog open={showClaimModal} onOpenChange={(open) => !claimCreating && setShowClaimModal(open)}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Medical Aid Consultation Claim</DialogTitle>
            <DialogDescription>
              Review the auto-filled main member and patient details, then capture diagnosis, chronic code, procedures, materials and medicines for the claim. Bill amount will be taken from the latest invoice.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 flex-1 overflow-y-auto pr-1">
            {/* Auto-filled context */}
            <div className="grid gap-4 md:grid-cols-2 rounded-lg border bg-muted/30 p-3">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Main member
                </p>
                <p className="text-sm font-medium">
                  {patient?.medicalAidInfo?.mainMemberName ||
                    patient?.medicalAidInfo?.memberName ||
                    patient?.name ||
                    consultation.patientName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Medical Aid: {patient?.medicalAidInfo?.name || "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Membership No: {patient?.medicalAidInfo?.memberNumber || "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Main member ID:{" "}
                  {patient?.medicalAidInfo?.mainMemberIdNumber || patient?.idNumber || "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Tel: {patient?.medicalAidInfo?.cell || patient?.phone || "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Email: {patient?.email || "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Patient
                </p>
                <p className="text-sm font-medium">
                  {patient?.name || consultation.patientName}
                </p>
                <p className="text-xs text-muted-foreground">
                  DOB:{" "}
                  {patient?.dateOfBirth
                    ? (patient.dateOfBirth instanceof Date
                        ? patient.dateOfBirth
                        : new Date(patient.dateOfBirth)
                      ).toLocaleDateString()
                    : "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Sex: {patient?.gender ? patient.gender : "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  ID: {patient?.idNumber || "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Contact: {patient?.phone || "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Address: {patient?.address || "—"}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-sm font-medium">ICD-10 code (chronic code)</Label>
                <Input
                  value={claimIcd10}
                  onChange={(e) => setClaimIcd10(e.target.value)}
                  placeholder="e.g. J06.9"
                  className="mt-1 font-mono"
                />
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-muted-foreground">Or select chronic code:</p>
                  <div className="flex flex-wrap gap-3">
                    {["0190", "0181A", "269", "254"].map((code) => (
                      <label key={code} className="flex items-center gap-1 text-xs cursor-pointer">
                        <Checkbox
                          checked={claimChronicCodes.includes(code)}
                          onCheckedChange={(checked) =>
                            setClaimChronicCodes((prev) =>
                              checked
                                ? Array.from(new Set([...prev, code]))
                                : prev.filter((c) => c !== code),
                            )
                          }
                        />
                          <span>{code}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Consultation date</Label>
                <Input
                  disabled
                  value={
                    consultation.createdAt instanceof Date
                      ? format(consultation.createdAt, "dd MMM yyyy")
                      : format(new Date(consultation.createdAt), "dd MMM yyyy")
                  }
                  className="mt-1"
                />
              </div>
            </div>

            {/* Diagnosis rows */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Diagnosis (up to 4 lines)
              </Label>
              <div className="space-y-2">
                {claimDiagnosisRows.map((row, index) => (
                  <div key={index} className="space-y-1">
                    <p className="text-xs text-muted-foreground">Line {index + 1}</p>
                    <Textarea
                      value={row.line}
                      onChange={(e) =>
                        setClaimDiagnosisRows((prev) =>
                          prev.map((r, i) =>
                            i === index ? { ...r, line: e.target.value } : r,
                          ),
                        )
                      }
                      rows={index === 0 ? 3 : 2}
                      className="text-sm"
                      placeholder={index === 0 ? "Working diagnosis (can be a full paragraph)" : "Optional diagnosis line"}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Injections & Procedures */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-sm font-medium">Injections (1–3)</Label>
                <Textarea
                  value={claimInjectionsText}
                  onChange={(e) => setClaimInjectionsText(e.target.value)}
                  rows={3}
                  className="mt-1 text-sm"
                  placeholder={"1.\n2.\n3."}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Procedures (1–4)</Label>
                <Textarea
                  value={claimProceduresText}
                  onChange={(e) => setClaimProceduresText(e.target.value)}
                  rows={3}
                  className="mt-1 text-sm"
                  placeholder={"1.\n2.\n3.\n4."}
                />
              </div>
            </div>

            {/* Materials */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Materials</Label>
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Syringe &amp; Needle</Label>
                  <Input
                    className="mt-1"
                    value={claimMaterials.syringeNeedle}
                    onChange={(e) =>
                      setClaimMaterials((prev) => ({ ...prev, syringeNeedle: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Swab</Label>
                  <Input
                    className="mt-1"
                    value={claimMaterials.swab}
                    onChange={(e) =>
                      setClaimMaterials((prev) => ({ ...prev, swab: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Glove</Label>
                  <Input
                    className="mt-1"
                    value={claimMaterials.glove}
                    onChange={(e) =>
                      setClaimMaterials((prev) => ({ ...prev, glove: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Bandage</Label>
                  <Input
                    className="mt-1"
                    value={claimMaterials.bandage}
                    onChange={(e) =>
                      setClaimMaterials((prev) => ({ ...prev, bandage: e.target.value }))
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs text-muted-foreground">Other materials used</Label>
                  <Input
                    className="mt-1"
                    value={claimMaterials.other}
                    onChange={(e) =>
                      setClaimMaterials((prev) => ({ ...prev, other: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Medicines for claim */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Medicines (for medical aid claim)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setClaimMedicationRows((prev) => [
                      ...prev,
                      { name: "", quantity: "", duration: "", dosage: "", instructions: "" },
                    ])
                  }
                >
                  Add medicine
                </Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {claimMedicationRows.map((row, index) => (
                  <div key={index} className="grid gap-2 md:grid-cols-5">
                    <Input
                      className="md:col-span-2"
                      placeholder="Medicine name"
                      value={row.name}
                      onChange={(e) =>
                        setClaimMedicationRows((prev) =>
                          prev.map((r, i) =>
                            i === index ? { ...r, name: e.target.value } : r,
                          ),
                        )
                      }
                    />
                    <Input
                      placeholder="Qty"
                      value={row.quantity}
                      onChange={(e) =>
                        setClaimMedicationRows((prev) =>
                          prev.map((r, i) =>
                            i === index ? { ...r, quantity: e.target.value } : r,
                          ),
                        )
                      }
                    />
                    <Input
                      placeholder="Duration"
                      value={row.duration}
                      onChange={(e) =>
                        setClaimMedicationRows((prev) =>
                          prev.map((r, i) =>
                            i === index ? { ...r, duration: e.target.value } : r,
                          ),
                        )
                      }
                    />
                    <Input
                      placeholder="Dosage / notes"
                      value={row.dosage}
                      onChange={(e) =>
                        setClaimMedicationRows((prev) =>
                          prev.map((r, i) =>
                            i === index ? { ...r, dosage: e.target.value } : r,
                          ),
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClaimSkip} disabled={claimCreating}>
              Skip
            </Button>
            <Button type="button" onClick={handleClaimCreateAndContinue} disabled={claimCreating}>
              {claimCreating ? (
                <>
                  <Activity className="w-4 h-4 mr-2 animate-spin" />
                  Creating claim…
                </>
              ) : (
                "Create claim & continue"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Next-step decision after claim creation */}
      {/* No medication entered – confirm before proceeding */}
      <Dialog open={showNoMedicationDialog} onOpenChange={setShowNoMedicationDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>No medication entered</DialogTitle>
            <DialogDescription>
              No medication has been entered for this consultation. Would you like to ignore medication and move on to the next step?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowNoMedicationDialog(false)
                setShowPrescriptionDialog(true)
              }}
            >
              No, add medication
            </Button>
            <Button type="button" onClick={handleProceedWithoutMedication}>
              Yes, continue without medication
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Consultation completed – confirmation and back to waiting list */}
      <Dialog open={showCompletionSuccessDialog} onOpenChange={setShowCompletionSuccessDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
              Consultation completed
            </DialogTitle>
            <DialogDescription>
              This consultation has been completed successfully. The patient has been updated and any PDFs have been generated. You can return to the waiting list to see the next patient.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" onClick={handleBackToWaitingList}>
              Back to waiting list
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showClaimNextStepDialog} onOpenChange={setShowClaimNextStepDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send claim to Medical Aid Portal?</DialogTitle>
            <DialogDescription>
              The medical aid consultation claim has been created. You can review and edit it in the Medical Aid
              Claim Portal first, or send it directly to the Medical Aid Officer Portal now.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleEditClaim}>
              Make further changes
            </Button>
            <Button type="button" onClick={handleSendClaimNow}>
              Send Claim to Medical Aid Portal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Prescription / Script creation dialog - responsive, touch-friendly */}
      <Dialog open={showPrescriptionDialog} onOpenChange={setShowPrescriptionDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Structured Medicine</DialogTitle>
            <DialogDescription>
              Prescribe using the fields below. Add multiple rows if needed. This will appear on the script PDF and consultation summary. Previous scripts for this patient are shown below for reference.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 md:grid-cols-2 mt-2 min-h-0 flex-1 overflow-auto">
            <div className="space-y-4 min-h-0 flex flex-col">
              <div className="space-y-3 min-h-0 flex flex-col">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label>Medicines</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addPrescriptionRow} className="min-h-[44px] min-w-[44px] sm:min-w-0">
                    Add medicine
                  </Button>
                </div>
                <div className="space-y-3 max-h-48 md:max-h-64 overflow-y-auto overflow-x-hidden pr-1 min-h-0">
                  {prescriptionItems.map((item, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <Label className="text-xs">Medicine Name</Label>
                            <Input
                              value={item.medication}
                              onChange={(e) => updatePrescriptionRow(index, "medication", e.target.value)}
                              placeholder="e.g. Amoxicillin 500mg"
                              className="min-h-[44px]"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removePrescriptionRow(index)}
                            disabled={prescriptionItems.length === 1}
                            className="shrink-0 min-h-[44px] min-w-[44px] self-end sm:self-center"
                            aria-label="Remove row"
                          >
                            ×
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <Label className="text-xs">Dosage</Label>
                            <Input
                              value={item.dosage}
                              onChange={(e) => updatePrescriptionRow(index, "dosage", e.target.value)}
                              placeholder="1 capsule"
                              className="min-h-[44px]"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Frequency</Label>
                            <Input
                              value={item.frequency}
                              onChange={(e) => updatePrescriptionRow(index, "frequency", e.target.value)}
                              placeholder="3 times daily"
                              className="min-h-[44px]"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Duration</Label>
                            <Input
                              value={item.duration}
                              onChange={(e) => updatePrescriptionRow(index, "duration", e.target.value)}
                              placeholder="5 days"
                              className="min-h-[44px]"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Notes</Label>
                          <Input
                            value={item.instructions}
                            onChange={(e) => updatePrescriptionRow(index, "instructions", e.target.value)}
                            placeholder="Take after food"
                            className="min-h-[44px]"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3 min-h-0 flex flex-col">
              <p className="text-sm font-medium">Previous prescriptions for this patient</p>
              {prescriptionsLoading ? (
                <div className="text-sm text-muted-foreground">Loading prescriptions…</div>
              ) : prescriptions.length === 0 ? (
                <div className="text-sm text-muted-foreground">No previous prescriptions recorded.</div>
              ) : (
                <div className="space-y-3 max-h-48 md:max-h-80 overflow-y-auto pr-1 min-h-0">
                  {prescriptions.map((p, index) => (
                    <Card key={p.id}>
                      <CardContent className="pt-4 space-y-1 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {format(
                              p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt),
                              "MMM d, yyyy HH:mm"
                            )}
                          </span>
                          {index === 0 && (
                            <Badge variant="secondary" className="text-[11px]">
                              Latest
                            </Badge>
                          )}
                        </div>
                        {Array.isArray(p.items) && p.items.length > 0 && (
                          <p className="text-muted-foreground">
                            {p.items[0].medication} ({p.items[0].dosage})
                            {p.items.length > 1 ? ` + ${p.items.length - 1} more` : ""}
                          </p>
                        )}
                        {p.scriptText && (
                          <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">
                            {p.scriptText}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 gap-2">
            <Button variant="outline" onClick={() => setShowPrescriptionDialog(false)} className="min-h-[44px]">
              Cancel
            </Button>
            <Button onClick={handleSavePrescription} className="min-h-[44px]">Save prescription</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Confirmation Dialog */}
      <Dialog open={showEmailConfirmDialog} onOpenChange={setShowEmailConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Email to Patient</DialogTitle>
            <DialogDescription>
              Are you sure you want to send the consultation summary and invoice to {patient?.name || "this patient"}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmEmailSend}>
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Re-send Warning Dialog */}
      <Dialog open={showResendWarningDialog} onOpenChange={setShowResendWarningDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email Already Sent</DialogTitle>
            <DialogDescription>
              You have already sent an email to this patient.
              {patient?.name && (
                <>
                  <br />
                  <br />
                  Would you like to send {patient.name.split(" ")[0]} {patient.name.split(" ").slice(1).join(" ") || ""} an email again?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResendWarningDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmResend}>
              Send Again
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
