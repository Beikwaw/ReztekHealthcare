"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import type { Patient, Appointment, Invoice, MedicalRecord, Notification } from "./types"
import {
  mockPatients,
  mockAppointments,
  mockInvoices,
  mockMedicalRecords,
  mockNotifications,
  mockDoctors,
} from "./mock-data"

interface DataContextType {
  // Patients
  patients: Patient[]
  addPatient: (patient: Omit<Patient, "id" | "createdAt">) => Patient
  updatePatient: (id: string, data: Partial<Patient>) => void
  deletePatient: (id: string) => void
  getPatient: (id: string) => Patient | undefined

  // Appointments
  appointments: Appointment[]
  addAppointment: (appointment: Omit<Appointment, "id" | "createdAt" | "updatedAt">) => Appointment
  updateAppointment: (id: string, data: Partial<Appointment>) => void
  deleteAppointment: (id: string) => void
  getAppointment: (id: string) => Appointment | undefined

  // Invoices
  invoices: Invoice[]
  addInvoice: (invoice: Omit<Invoice, "id" | "createdAt">) => Invoice
  updateInvoice: (id: string, data: Partial<Invoice>) => void
  getInvoice: (id: string) => Invoice | undefined

  // Medical Records
  medicalRecords: MedicalRecord[]
  addMedicalRecord: (record: Omit<MedicalRecord, "id">) => MedicalRecord
  getMedicalRecordsByPatient: (patientId: string) => MedicalRecord[]

  // Notifications
  notifications: Notification[]
  markNotificationRead: (id: string) => void
  
  // Doctors
  doctors: typeof mockDoctors
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>(mockPatients)
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments)
  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices)
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>(mockMedicalRecords)
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications)

  // Patient operations
  const addPatient = useCallback((patientData: Omit<Patient, "id" | "createdAt">): Patient => {
    const newPatient: Patient = {
      ...patientData,
      id: `patient-${Date.now()}`,
      createdAt: new Date(),
    }
    setPatients((prev) => [...prev, newPatient])
    return newPatient
  }, [])

  const updatePatient = useCallback((id: string, data: Partial<Patient>) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...data } : p))
    )
  }, [])

  const deletePatient = useCallback((id: string) => {
    setPatients((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const getPatient = useCallback(
    (id: string) => patients.find((p) => p.id === id),
    [patients]
  )

  // Appointment operations
  const addAppointment = useCallback(
    (appointmentData: Omit<Appointment, "id" | "createdAt" | "updatedAt">): Appointment => {
      const newAppointment: Appointment = {
        ...appointmentData,
        id: `apt-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      setAppointments((prev) => [...prev, newAppointment])
      return newAppointment
    },
    []
  )

  const updateAppointment = useCallback((id: string, data: Partial<Appointment>) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...data, updatedAt: new Date() } : a))
    )
  }, [])

  const deleteAppointment = useCallback((id: string) => {
    setAppointments((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const getAppointment = useCallback(
    (id: string) => appointments.find((a) => a.id === id),
    [appointments]
  )

  // Invoice operations
  const addInvoice = useCallback((invoiceData: Omit<Invoice, "id" | "createdAt">): Invoice => {
    const newInvoice: Invoice = {
      ...invoiceData,
      id: `inv-${Date.now()}`,
      createdAt: new Date(),
    }
    setInvoices((prev) => [...prev, newInvoice])
    return newInvoice
  }, [])

  const updateInvoice = useCallback((id: string, data: Partial<Invoice>) => {
    setInvoices((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...data } : i))
    )
  }, [])

  const getInvoice = useCallback(
    (id: string) => invoices.find((i) => i.id === id),
    [invoices]
  )

  // Medical Record operations
  const addMedicalRecord = useCallback((recordData: Omit<MedicalRecord, "id">): MedicalRecord => {
    const newRecord: MedicalRecord = {
      ...recordData,
      id: `record-${Date.now()}`,
    }
    setMedicalRecords((prev) => [...prev, newRecord])
    return newRecord
  }, [])

  const getMedicalRecordsByPatient = useCallback(
    (patientId: string) => medicalRecords.filter((r) => r.patientId === patientId),
    [medicalRecords]
  )

  // Notification operations
  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }, [])

  return (
    <DataContext.Provider
      value={{
        patients,
        addPatient,
        updatePatient,
        deletePatient,
        getPatient,
        appointments,
        addAppointment,
        updateAppointment,
        deleteAppointment,
        getAppointment,
        invoices,
        addInvoice,
        updateInvoice,
        getInvoice,
        medicalRecords,
        addMedicalRecord,
        getMedicalRecordsByPatient,
        notifications,
        markNotificationRead,
        doctors: mockDoctors,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider")
  }
  return context
}
