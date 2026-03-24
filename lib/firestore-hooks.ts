"use client"

import { useState, useEffect, useCallback } from "react"
import type { Patient, Consultation, Appointment, Invoice, Prescription, PatientAuditLog, BillingAuditLog, MedicalAidClaim, DeletionRequest } from "./types"
import {
  subscribeToPatients,
  getPatients,
  getAppointments,
  addAppointment as addAppointmentToFirebase,
  updateAppointment as updateAppointmentInFirebase,
  deleteAppointment as deleteAppointmentFromFirebase,
  addPatient as addPatientToFirebase,
  updatePatient,
  appendPatientVisit as appendPatientVisitInFirebase,
  deletePatient as deletePatientFromFirebase,
  getConsultations,
  getConsultationsByPatient,
  subscribeToConsultations,
  addConsultation as addConsultationToFirebase,
  updateConsultation as updateConsultationInFirebase,
  deleteConsultation as deleteConsultationFromFirebase,
  getInvoices,
  addInvoice as addInvoiceToFirebase,
  updateInvoice as updateInvoiceInFirebase,
  deleteInvoice as deleteInvoiceFromFirebase,
  getPrescriptionsByPatient,
  addPrescription as addPrescriptionToFirebase,
  getPatientAuditLogs,
  getAuthAuditLogs,
  getBillingAuditLogs,
  getStaffProfiles,
  getMedicalAidClaims,
  getMedicalAidClaimsByPatient,
  getMedicalAidClaim,
  getDeletionRequests,
  createDeletionRequest as createDeletionRequestInFirebase,
} from "./firebase"
import { ERROR_MESSAGES } from "@/lib/error-messages"
import { useData } from "./data-context"

// Transform raw patient data to Patient type (shared for one-time and real-time)
function transformPatients(data: any[]): Patient[] {
  return data.map((p: any) => ({
    ...p,
    dateOfBirth: p.dateOfBirth instanceof Date ? p.dateOfBirth : new Date(p.dateOfBirth),
    createdAt: p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt),
    lastVisitDate: p.lastVisitDate ? (p.lastVisitDate instanceof Date ? p.lastVisitDate : new Date(p.lastVisitDate)) : undefined,
    visitHistory: (p.visitHistory || []).map((d: Date | string) => d instanceof Date ? d : new Date(d)),
  })) as Patient[]
}

// Hook for real-time patients from Firebase (updates when clerk adds/sends patient)
export function usePatients() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setLoading(true)
    const unsubscribe = subscribeToPatients((data) => {
      setPatients(transformPatients(data))
      setLoading(false)
    })
    return () => {
      unsubscribe()
    }
  }, [])

  // Add patient function
  const addPatient = useCallback(async (patientData: any) => {
    try {
      // Transform the form data to match Patient type
      const patientToAdd: any = {
        accountNumber: patientData.accountNumber || "",
        title: patientData.title || "",
        firstName: patientData.firstName || "",
        lastName: patientData.lastName || "",
        idNumber: patientData.idNumber || "",
        name: `${patientData.firstName} ${patientData.lastName}`.trim(),
        email: patientData.email ?? "",
        phone: patientData.cellPhone || patientData.phone || "",
        homePhone: patientData.homePhone || "",
        workPhone: patientData.workPhone || "",
        cellPhone: patientData.cellPhone || "",
        dateOfBirth: patientData.dateOfBirth ? new Date(patientData.dateOfBirth) : new Date(),
        gender: patientData.gender || "other",
        address: patientData.address || "",
        occupation: patientData.occupation || "",
        maritalStatus: patientData.maritalStatus || "",
        homeLanguage: patientData.homeLanguage || "",
        emergencyContact: patientData.guardian?.name
          ? {
              name: patientData.guardian.name,
              phone: patientData.guardian.phone || "",
              relationship: patientData.guardian.relationship || "Guardian",
            }
          : {
              name: patientData.nearestFamilyFriend?.name || "",
              phone: patientData.nearestFamilyFriend?.cell || patientData.nearestFamilyFriend?.telHome || "",
              relationship: patientData.nearestFamilyFriend?.relationship || "Emergency Contact",
            },
        accountResponsible: patientData.accountResponsible || {},
        medicalAidInfo: patientData.medicalAidInfo || {},
        nearestFamilyFriend: patientData.nearestFamilyFriend || {},
        familyDetails: Array.isArray(patientData.familyDetails) ? patientData.familyDetails : [],
        medicalHistory: {
          allergies: [],
          chronicConditions: [],
          currentMedications: [],
          pastSurgeries: [],
          familyHistory: [],
        },
        paymentMethod: patientData.paymentMethod || (patientData.medicalAidInfo?.name ? "medical-aid" : "cash"),
      }

      // Add optional fields
      if (patientData.medicalAidInfo?.memberNumber) {
        patientToAdd.medicalAidNumber = patientData.medicalAidInfo.memberNumber
      }
      if (patientData.idNumber) {
        patientToAdd.patientNumber = `PAT-${patientData.idNumber.replace(/\D/g, "").slice(-6)}`
      } else if (patientData.passportNumber?.trim()) {
        patientToAdd.patientNumber = `PAT-${patientData.passportNumber.trim().slice(-6)}`
      } else {
        patientToAdd.patientNumber = `PAT-${Date.now().toString().slice(-6)}`
      }
      if (patientData.passportNumber != null && patientData.passportNumber !== "") {
        patientToAdd.passportNumber = patientData.passportNumber
      }
      if (patientData.status) {
        patientToAdd.status = patientData.status
      }
      if (patientData.medicalAidInfo?.name) {
        patientToAdd.insuranceInfo = {
          provider: patientData.medicalAidInfo.name,
          policyNumber: patientData.medicalAidInfo.memberNumber || "",
          expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        }
      }

      const patientId = await addPatientToFirebase(patientToAdd)
      // List updates automatically via real-time subscription
      return { id: patientId, ...patientToAdd }
    } catch (err) {
      console.error("Error adding patient:", err)
      throw new Error(ERROR_MESSAGES.OPERATION_FAILED)
    }
  }, [])

  // Update patient function
  const updatePatientData = useCallback(async (patientId: string, updates: Partial<Patient>) => {
    try {
      await updatePatient(patientId, updates)
      // List updates automatically via real-time subscription
    } catch (err) {
      console.error("updatePatient:", err)
      throw new Error(ERROR_MESSAGES.OPERATION_FAILED)
    }
  }, [])

  const appendPatientVisit = useCallback(async (patientId: string) => {
    try {
      await appendPatientVisitInFirebase(patientId)
      // List updates automatically via real-time subscription
    } catch (err) {
      console.error("appendPatientVisit:", err)
      throw new Error(ERROR_MESSAGES.OPERATION_FAILED)
    }
  }, [])

  // Delete patient and all related records (appointments, invoices, consultations)
  const removePatient = useCallback(async (patientId: string) => {
    try {
      const [appointmentsList, invoicesList, consultationsList] = await Promise.all([
        getAppointments(),
        getInvoices(),
        getConsultationsByPatient(patientId),
      ])
      await Promise.all([
        ...appointmentsList.filter((a: { id: string; patientId?: string }) => a.patientId === patientId).map((a) => deleteAppointmentFromFirebase(a.id)),
        ...invoicesList.filter((i: { id: string; patientId?: string }) => i.patientId === patientId).map((i) => deleteInvoiceFromFirebase(i.id)),
        ...consultationsList.map((c) => deleteConsultationFromFirebase(c.id)),
      ])
      await deletePatientFromFirebase(patientId)
      // List updates automatically via real-time subscription
    } catch (err) {
      console.error("removePatient:", err)
      throw new Error(ERROR_MESSAGES.OPERATION_FAILED)
    }
  }, [])

  const refetchPatients = useCallback(async () => {
    try {
      const data = await getPatients()
      setPatients(transformPatients(data))
    } catch {
      // Keep current state on error
    }
  }, [])

  return { 
    patients, 
    loading, 
    appendPatientVisit,
    error, 
    addPatient,
    updatePatient: updatePatientData,
    deletePatient: removePatient,
    refetch: refetchPatients,
  }
}

// Hook for fetching consultations
export function useConsultations() {
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchConsultations = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getConsultations()
      // Transform Firebase data to match Consultation type
      const transformedConsultations = data.map((c: any) => ({
        ...c,
        createdAt: c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt),
        updatedAt: c.updatedAt instanceof Date ? c.updatedAt : new Date(c.updatedAt),
        confirmedAt: c.confirmedAt ? (c.confirmedAt instanceof Date ? c.confirmedAt : new Date(c.confirmedAt)) : undefined,
        pdfSentAt: c.pdfSentAt ? (c.pdfSentAt instanceof Date ? c.pdfSentAt : new Date(c.pdfSentAt)) : undefined,
      })) as Consultation[]
      setConsultations(transformedConsultations)
    } catch (err) {
      console.error("fetchConsultations:", err)
      setError(new Error(ERROR_MESSAGES.OPERATION_FAILED))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConsultations()
  }, [fetchConsultations])

  const addConsultation = useCallback(async (consultationData: any) => {
    try {
      const consultationId = await addConsultationToFirebase(consultationData)
      await fetchConsultations()
      return consultationId
    } catch (err) {
      console.error("addConsultation:", err)
      throw new Error(ERROR_MESSAGES.OPERATION_FAILED)
    }
  }, [fetchConsultations])

  const updateConsultation = useCallback(async (id: string, data: any) => {
    try {
      await updateConsultationInFirebase(id, data)
      await fetchConsultations()
    } catch (err) {
      console.error("updateConsultation:", err)
      throw new Error(ERROR_MESSAGES.OPERATION_FAILED)
    }
  }, [fetchConsultations])

  return { consultations, loading, error, addConsultation, updateConsultation, refetch: fetchConsultations }
}

/** Real-time consultations (snapshot). Use for pharmacy pending orders so list updates live. */
export function useConsultationsRealtime() {
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(true)

  const updateConsultation = useCallback(async (id: string, data: Parameters<typeof updateConsultationInFirebase>[1]) => {
    await updateConsultationInFirebase(id, data)
  }, [])

  useEffect(() => {
    setLoading(true)
    const unsubscribe = subscribeToConsultations((data) => {
      const transformed = data.map((c: any) => ({
        ...c,
        createdAt: c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt),
        updatedAt: c.updatedAt instanceof Date ? c.updatedAt : new Date(c.updatedAt),
        confirmedAt: c.confirmedAt ? (c.confirmedAt instanceof Date ? c.confirmedAt : new Date(c.confirmedAt)) : undefined,
        pdfSentAt: c.pdfSentAt ? (c.pdfSentAt instanceof Date ? c.pdfSentAt : new Date(c.pdfSentAt)) : undefined,
      })) as Consultation[]
      setConsultations(transformed)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  return { consultations, loading, updateConsultation }
}

// Hook for fetching appointments
export function useAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getAppointments()
      const transformedAppointments = data.map((a: any) => ({
        ...a,
        date: a.date instanceof Date ? a.date : new Date(a.date),
        createdAt: a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt),
        updatedAt: a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt),
      })) as Appointment[]
      setAppointments(transformedAppointments)
    } catch (err) {
      console.error("fetchAppointments:", err)
      setError(new Error(ERROR_MESSAGES.OPERATION_FAILED))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  const addAppointment = useCallback(async (appointmentData: any) => {
    try {
      const appointmentId = await addAppointmentToFirebase(appointmentData)
      await fetchAppointments()
      return appointmentId
    } catch (err) {
      console.error("addAppointment:", err)
      throw new Error(ERROR_MESSAGES.OPERATION_FAILED)
    }
  }, [fetchAppointments])

  const updateAppointment = useCallback(async (id: string, data: any) => {
    try {
      await updateAppointmentInFirebase(id, data)
      await fetchAppointments()
    } catch (err) {
      console.error("updateAppointment:", err)
      throw new Error(ERROR_MESSAGES.OPERATION_FAILED)
    }
  }, [fetchAppointments])

  const deleteAppointment = useCallback(async (id: string) => {
    try {
      await deleteAppointmentFromFirebase(id)
      await fetchAppointments()
    } catch (err) {
      console.error("deleteAppointment:", err)
      throw new Error(ERROR_MESSAGES.OPERATION_FAILED)
    }
  }, [fetchAppointments])

  return { appointments, loading, error, addAppointment, updateAppointment, deleteAppointment, refetch: fetchAppointments }
}

// Hook for fetching invoices from Firebase
export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getInvoices()
      const transformed = data.map((inv: any) => ({
        ...inv,
        dueDate: inv.dueDate instanceof Date ? inv.dueDate : new Date(inv.dueDate),
        createdAt: inv.createdAt instanceof Date ? inv.createdAt : new Date(inv.createdAt),
        paidDate: inv.paidDate ? (inv.paidDate instanceof Date ? inv.paidDate : new Date(inv.paidDate)) : undefined,
      })) as Invoice[]
      setInvoices(transformed)
    } catch (err) {
      console.error("fetchInvoices:", err)
      setError(new Error(ERROR_MESSAGES.OPERATION_FAILED))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  const addInvoice = useCallback(async (invoiceData: Omit<Invoice, "id" | "createdAt">) => {
    try {
      const id = await addInvoiceToFirebase({
        ...invoiceData,
        dueDate: invoiceData.dueDate instanceof Date ? invoiceData.dueDate : new Date(invoiceData.dueDate),
      })
      await fetchInvoices()
      return id
    } catch (err) {
      console.error("addInvoice:", err)
      throw new Error(ERROR_MESSAGES.OPERATION_FAILED)
    }
  }, [fetchInvoices])

  const updateInvoice = useCallback(async (id: string, data: Partial<Invoice>) => {
    try {
      await updateInvoiceInFirebase(id, data)
      await fetchInvoices()
    } catch (err) {
      console.error("updateInvoice:", err)
      throw new Error(ERROR_MESSAGES.OPERATION_FAILED)
    }
  }, [fetchInvoices])

  return { invoices, loading, error, addInvoice, updateInvoice, refetch: fetchInvoices }
}

// Hook for prescriptions by patient
export function usePrescriptions(patientId?: string) {
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchPrescriptions = useCallback(async () => {
    try {
      if (!patientId) {
        setPrescriptions([])
        setLoading(false)
        return
      }
      setLoading(true)
      const data = await getPrescriptionsByPatient(patientId)
      const transformed = data.map((p: any) => ({
        ...p,
        createdAt: p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt),
      })) as Array<
        {
          id: string
          patientId: string
          doctorId: string
          consultationId?: string
          items?: Prescription[]
          scriptText?: string
          createdAt: Date
        }
      >
      setPrescriptions(transformed)
    } catch (err) {
      console.error("fetchPrescriptions:", err)
      setError(new Error(ERROR_MESSAGES.OPERATION_FAILED))
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    fetchPrescriptions()
  }, [fetchPrescriptions])

  const addPrescription = useCallback(
    async (prescriptionData: any) => {
      try {
        await addPrescriptionToFirebase(prescriptionData)
        await fetchPrescriptions()
      } catch (err) {
        console.error("addPrescription:", err)
        throw new Error(ERROR_MESSAGES.OPERATION_FAILED)
      }
    },
    [fetchPrescriptions]
  )

  return { prescriptions, loading, error, addPrescription, refetch: fetchPrescriptions }
}

// Hook for deletion requests (clerk creates; admin lists pending and approves via API)
export function useDeletionRequests(status?: "pending" | "completed" | "rejected") {
  const [requests, setRequests] = useState<DeletionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getDeletionRequests(status)
      setRequests(data as DeletionRequest[])
    } catch (err) {
      console.error("fetchDeletionRequests:", err)
      setError(new Error(ERROR_MESSAGES.OPERATION_FAILED))
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const createDeletionRequest = useCallback(
    async (data: { patientId: string; patientName?: string; requestedByUserId: string; requestedByName: string }) => {
      const id = await createDeletionRequestInFirebase(data)
      await fetchRequests()
      return id
    },
    [fetchRequests]
  )

  return { requests, loading, error, refetch: fetchRequests, createDeletionRequest }
}

// Hook for patient audit logs (admin view)
export function usePatientAuditLogs() {
  const [logs, setLogs] = useState<PatientAuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getPatientAuditLogs()
      const transformed = data.map((log: any) => ({
        ...log,
        createdAt: log.createdAt instanceof Date ? log.createdAt : new Date(log.createdAt),
      })) as PatientAuditLog[]
      setLogs(transformed)
    } catch (err) {
      console.error("fetchPatientAuditLogs:", err)
      setError(new Error(ERROR_MESSAGES.OPERATION_FAILED))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  return { logs, loading, error, refetch: fetchLogs }
}

// Hook for billing audit logs
export function useBillingAuditLogs() {
  const [logs, setLogs] = useState<BillingAuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getBillingAuditLogs()
      const transformed = data.map((log: any) => ({
        ...log,
        createdAt: log.createdAt instanceof Date ? log.createdAt : new Date(log.createdAt),
      })) as BillingAuditLog[]
      setLogs(transformed)
    } catch (err) {
      console.error("fetchBillingAuditLogs:", err)
      setError(new Error(ERROR_MESSAGES.OPERATION_FAILED))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  return { logs, loading, error, refetch: fetchLogs }
}

// Hook for auth audit logs (login/logout)
export function useAuthAuditLogs() {
  const [logs, setLogs] = useState<{ id: string; action: string; userId: string; userEmail?: string; userName?: string; createdAt: Date }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getAuthAuditLogs()
      setLogs(data as { id: string; action: string; userId: string; userEmail?: string; userName?: string; createdAt: Date }[])
    } catch (err) {
      console.error("fetchAuthAuditLogs:", err)
      setError(new Error(ERROR_MESSAGES.OPERATION_FAILED))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  return { logs, loading, error, refetch: fetchLogs }
}

// Hook for staff profiles (Firestore users, exclude patients)
export function useStaffProfiles() {
  const [staff, setStaff] = useState<{ id: string; email?: string; name?: string; role: string; phone?: string; createdAt?: Date }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getStaffProfiles()
      setStaff(data)
    } catch (err) {
      console.error("fetchStaff:", err)
      setError(new Error(ERROR_MESSAGES.OPERATION_FAILED))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStaff()
  }, [fetchStaff])

  return { staff, loading, error, refetch: fetchStaff }
}

// Hook for medical aid claims (all or by patientId)
export function useMedicalAidClaims(patientId?: string) {
  const [claims, setClaims] = useState<MedicalAidClaim[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchClaims = useCallback(async () => {
    try {
      setLoading(true)
      const data = patientId
        ? await getMedicalAidClaimsByPatient(patientId)
        : await getMedicalAidClaims()
      const transformed = data.map((c: any) => ({
        ...c,
        consultationDate: c.consultationDate instanceof Date ? c.consultationDate : new Date(c.consultationDate),
        dateOfService: c.dateOfService instanceof Date ? c.dateOfService : new Date(c.dateOfService),
        createdAt: c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt),
      })) as MedicalAidClaim[]
      setClaims(transformed)
    } catch (err) {
      console.error("fetchClaims:", err)
      setError(new Error(ERROR_MESSAGES.OPERATION_FAILED))
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    fetchClaims()
  }, [fetchClaims])

  return { claims, loading, error, refetch: fetchClaims }
}

export function useMedicalAidClaim(claimId?: string) {
  const [claim, setClaim] = useState<MedicalAidClaim | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchClaim = useCallback(async () => {
    try {
      if (!claimId) {
        setClaim(null)
        setLoading(false)
        return
      }
      setLoading(true)
      const data = await getMedicalAidClaim(claimId)
      setClaim(data as MedicalAidClaim | null)
      setError(null)
    } catch (err) {
      console.error("fetchClaim:", err)
      setError(new Error(ERROR_MESSAGES.OPERATION_FAILED))
    } finally {
      setLoading(false)
    }
  }, [claimId])

  useEffect(() => {
    fetchClaim()
  }, [fetchClaim])

  return { claim, loading, error, refetch: fetchClaim }
}

// Hook that provides addPatient function
export function usePatientActions() {
  const { addPatient: addPatientToContext } = useData()
  const { patients } = useData()

  const addPatient = async (patientData: Omit<Patient, "id" | "createdAt">) => {
    // For now, use the context's addPatient
    // In the future, this could call Firebase directly
    return addPatientToContext(patientData)
  }

  return {
    addPatient,
    patients,
  }
}

