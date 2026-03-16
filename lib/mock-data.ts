import type {
  User,
  Doctor,
  Patient,
  Appointment,
  Invoice,
  MedicalRecord,
  Notification,
  InventoryItem,
} from "./types"

/**
 * Empty initial data – real data comes from Firestore via firestore-hooks.
 * DataProvider uses these as initial state; components typically use
 * usePatients(), useAppointments(), useInvoices() etc. which sync with Firestore.
 */

export const mockUsers: User[] = []

export const mockDoctors: Doctor[] = []

export const mockPatients: Patient[] = []

export const mockAppointments: Appointment[] = []

export const mockInvoices: Invoice[] = []

export const mockMedicalRecords: MedicalRecord[] = []

export const mockNotifications: Notification[] = []

export const mockInventory: InventoryItem[] = []
