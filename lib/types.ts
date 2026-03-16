// User Roles
export type UserRole = "admin" | "doctor" | "receptionist" | "clerk" | "pharmacy" | "patient" | "medical-aid"

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  avatar?: string
  phone?: string
  createdAt: Date
  lastMfaVerifiedAt?: Date
}

export interface Doctor extends User {
  role: "doctor"
  specialization: string
  licenseNumber: string
  consultationFee: number
  availability: DoctorAvailability[]
}

export interface DoctorAvailability {
  dayOfWeek: number // 0-6 (Sunday-Saturday)
  startTime: string // "09:00"
  endTime: string // "17:00"
}

export interface Patient {
  id: string
  patientNumber?: string // Auto-generated patient number
  accountNumber?: string
  title?: string
  firstName?: string
  lastName?: string
  idNumber?: string
  passportNumber?: string
  name: string
  email?: string
  phone: string
  homePhone?: string
  workPhone?: string
  cellPhone?: string
  dateOfBirth: Date
  gender: "male" | "female" | "other"
  address: string
  occupation?: string
  maritalStatus?: string
  homeLanguage?: string
  emergencyContact: {
    name: string
    phone: string
    relationship: string
  }
  accountResponsible?: {
    surname?: string
    firstNames?: string
    title?: string
    idNumber?: string
    homeAddress?: string
    postalAddress?: string
    employer?: string
    workAddress?: string
    telHome?: string
    telWork?: string
    cell?: string
    email?: string
  }
  medicalAidInfo?: {
    name?: string
    memberName?: string
    memberNumber?: string
    idNumber?: string
    cell?: string
    dependentCode?: string
    mainMemberName?: string
    mainMemberIdNumber?: string
  }
  nearestFamilyFriend?: {
    name?: string
    surname?: string
    relationship?: string
    address?: string
    telHome?: string
    telWork?: string
    cell?: string
  }
  familyDetails?: Array<{
    name?: string
    surname?: string
    contactNumber?: string
  }>
  medicalHistory: MedicalHistory
  insuranceInfo?: InsuranceInfo
  paymentMethod: PaymentMethod
  medicalAidNumber?: string
  clinicLocation?: string
  registeredBy?: string // Clerk who registered the patient
  attendanceDate?: Date
  createdAt: Date
  /** Server timestamp when patient was registered (Firestore serverTimestamp) */
  dateRegistered?: Date
  userId?: string // Link to User if they have portal access
  status?: "waiting" | "in-consultation" | "completed" | "discharged"
  lastVisitDate?: Date // Last consultation/visit date (updated when DR completes consultation)
  visitHistory?: Date[] // Full history of visit dates (consultations); used for continuous last-visit and history display
}

export interface MedicalHistory {
  allergies: string[]
  chronicConditions: string[]
  currentMedications: string[]
  pastSurgeries: string[]
  familyHistory: string[]
  bloodType?: string
}

export interface InsuranceInfo {
  provider: string
  policyNumber: string
  groupNumber?: string
  expiryDate: Date
}

// Symptom Categories for Doctor Consultation
export interface SymptomCategories {
  fluLikeInfectious: {
    fever: boolean
    coughOrShortnessOfBreath: boolean
    fatigueOrWeakness: boolean
    recentTravelIllness: boolean
    allergiesFlaring: boolean
    soreThroat: boolean
    runnyOrBlockedNose: boolean
    lossOfTasteOrSmell: boolean
  }
  painAndDiscomfort: {
    headache: boolean
    pain: boolean // chest, abdominal, joint, or other
    recentInjuryOrFall: boolean
    backOrNeckPain: boolean
    muscleAches: boolean
  }
  digestiveGastrointestinal: {
    nauseaOrVomiting: boolean
    diarrheaOrConstipation: boolean
    abdominalPain: boolean
    appetiteLoss: boolean
  }
  urinaryReproductive: {
    urinaryIssues: boolean // pain, frequency, burning
    menstrualIrregularities: boolean
    urinaryBlood: boolean
  }
  neurologicalSensory: {
    dizzinessOrBalanceProblems: boolean
    visionOrHearingChanges: boolean
    numbnessOrTingling: boolean
    confusionOrMemoryChanges: boolean
  }
  skinAndGeneralHealth: {
    skinRashOrItching: boolean
    weightChanges: boolean // gain or loss
    sleepDisturbances: boolean
    stressOrAnxiety: boolean
    worseningChronicConditions: boolean // e.g. diabetes, hypertension
    swellingOrEdema: boolean
    nightSweatsOrChills: boolean
  }
  otherConcerns: {
    hasOtherConcerns: boolean
    otherConcernsDescription?: string
  }
}

export interface Consultation {
  id: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  appointmentId?: string
  intakeChecklist?: {
    patientCalled: boolean
    patientArrived: boolean
  }
  symptoms: SymptomCategories
  /** Presenting complaint (free text) */
  presentingComplaint?: string
  /** Onset: duration, severity, character, radiation, aggravating/relieving, red flags, previous episodes, current medication, allergies, chronic conditions */
  onset?: string
  /** Vital signs: BP, HR, RR, temp, blood glucose, Hb, urine dipstick, urine pregnancy */
  vitalSigns?: string
  /** Physical examination (systematic) */
  physicalExamination?: string
  /** Special investigations and interpretation */
  specialInvestigations?: string
  symptomDetails?: string
  aiSummary?: string
  clinicalSummary?: string
  diagnosis?: string
  /** Editable ICD-10 code for medical aid claims (pre-filled from AI diagnosis when possible) */
  icd10Code?: string
  aiDiagnosis?: string
  doctorNotes?: string
  finalDiagnosis?: string
  prescription: Prescription[]
  /** Optional free-text prescription script captured by the doctor */
  scriptText?: string
  /** When the scriptText was last authored/updated */
  scriptCreatedAt?: Date
  /** Firebase Storage URL for prescription/script PDF */
  scriptPdfUrl?: string
  status: "in-progress" | "pending-review" | "confirmed" | "sent-to-pharmacy"
  /** Set by pharmacy: dispensed | unavailable */
  pharmacyStatus?: "pending" | "dispensed" | "unavailable"
  createdAt: Date
  updatedAt: Date
  confirmedAt?: Date
  pdfSentAt?: Date
  pdfSentTo?: string // email or phone
  pdfStorageUrl?: string // Firebase Storage URL for summary PDF
  /** Firebase Storage URL for clerk invoice/bill PDF (when sent to patient) */
  billPdfStorageUrl?: string
  /** Billed amount from clerk – shown in summary PDF */
  billedAmount?: number
  /** Line items from clerk – shown in summary PDF (overrides billedAmount if set) */
  billItems?: { description: string; amount: number }[]
}

/** Medical aid claim for submission to scheme (SA compliant) */
export interface MedicalAidClaimDiagnosisLine {
  line: string
  icd10?: string
}

export interface MedicalAidClaimMaterials {
  syringeNeedle?: string
  swab?: string
  glove?: string
  bandage?: string
  other?: string
}

export interface MedicalAidClaimMedication {
  name: string
  quantity?: string
  duration?: string
  dosage?: string
  instructions?: string
}

export interface MedicalAidClaim {
  id: string
  patientId: string
  consultationId: string
  patientName: string
  firstName: string
  lastName: string
  idNumber?: string
  practiceNumber: string
  doctorHpcsaNumber: string
  schemeName: string
  membershipNumber: string
  consultationDate: Date
  dateOfService: Date
  billAmount: number
  totalAmountClaimed: number
  icd10Code: string
  clinicalSummaryShort: string
  servicesRendered: string
  createdAt: Date
  createdBy: string
  createdByName?: string
  /** Optional denormalized patient email for outcome emails */
  patientEmail?: string | null
  /** Overall claim status from creation to final outcome */
  status?: "DRAFT" | "SUBMITTED" | "PAID" | "PARTIALLY_PAID" | "REJECTED"
  /** Amount actually paid by medical aid (for PAID/PARTIALLY_PAID) */
  paidAmount?: number | null
  /** Calculated shortfall when PARTIALLY_PAID or REJECTED (patient liable) */
  shortfallAmount?: number | null
  /** Link to shortfall invoice in invoices collection, when created */
  shortfallInvoiceId?: string | null
  /** Metadata about who recorded the latest outcome */
  outcomeRecordedAt?: Date | null
  outcomeRecordedBy?: string | null
  /** Internal notes when outcome was recorded (portal only, not on PDF) */
  outcomeNotes?: string | null
  /** Set when officer marks claim as pending after edits (billing table) */
  markedPendingAt?: Date | null
  pdfStorageUrl?: string
  xmlStorageUrl?: string
  storagePathPdf?: string
  storagePathXml?: string
  /** Display label for dashboard, e.g. LastName_FirstName_ID_timestamp.pdf */
  fileLabel?: string

  // ---- Medical aid consultation form extensions ----

  /** Main member / scheme details (auto-filled, read-only in UI) */
  mainMemberFullName?: string
  mainMemberSurname?: string
  mainMemberSex?: "male" | "female" | "other" | string
  mainMemberIdNumber?: string
  mainMemberTel?: string
  mainMemberAddress?: string
  mainMemberEmail?: string

  /** Patient demographics for the consultation form */
  patientDateOfBirth?: Date
  patientSex?: "male" | "female" | "other" | string

  /** Up to four diagnosis lines plus per-line ICD-10/chronic code */
  diagnosisLines?: MedicalAidClaimDiagnosisLine[]

  /** Free-text blocks matching the paper consultation form */
  injectionsText?: string
  proceduresText?: string
  /** Procedure code for XML export (e.g. ECR). Overrides proceduresText in XML when set. */
  procedureCode?: string | null

  /** Materials section: syringe & needle, swab, gloves, bandage, other */
  materials?: MedicalAidClaimMaterials | null

  /** Structured medicines attached to this claim (for claim PDF & portal) */
  medications?: MedicalAidClaimMedication[]

  /** Link to the primary invoice billed to the scheme for this claim */
  billInvoiceId?: string | null

  /** Line items for billing (Consultation + consumables). When set, totalAmountClaimed = sum of amounts */
  billItems?: { description: string; amount: number }[]

  /** When the Medical Aid Officer exported the final XML. Set = Completed tab */
  xmlExportedAt?: Date | null
}

export interface Appointment {
  id: string
  patientId: string
  doctorId: string
  doctorName?: string
  date: Date
  startTime: string
  endTime: string
  type: AppointmentType
  status: AppointmentStatus
  reason: string
  notes?: string
  diagnosis?: string
  prescription?: Prescription[]
  consultationId?: string
  createdAt: Date
  updatedAt: Date
}

export type AppointmentType = "consultation" | "follow-up" | "emergency" | "routine-checkup" | "vaccination"

export type AppointmentStatus = "scheduled" | "confirmed" | "in-progress" | "completed" | "cancelled" | "no-show"

export interface Prescription {
  medication: string
  dosage: string
  frequency: string
  duration: string
  instructions?: string
}

export interface Invoice {
  id: string
  patientId: string
  appointmentId?: string
  items: InvoiceItem[]
  subtotal: number
  tax: number
  discount: number
  total: number
  status: InvoiceStatus
  dueDate: Date
  paidDate?: Date
  paymentMethod?: PaymentMethod
  createdAt: Date
}

export interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled" | "completed"

export type PaymentMethod = "cash" | "card" | "medical-aid" | "bank-transfer"

export interface MedicalRecord {
  id: string
  patientId: string
  appointmentId: string
  doctorId: string
  date: Date
  chiefComplaint: string
  symptoms: string[]
  examination: string
  diagnosis: string
  treatment: string
  prescription: Prescription[]
  /** Optional free-text prescription script as captured by the doctor */
  scriptText?: string
  /** When the scriptText was authored/recorded */
  scriptCreatedAt?: Date
  /** Firebase Storage URL for prescription/script PDF */
  scriptPdfUrl?: string
  labResults?: LabResult[]
  followUpDate?: Date
  notes?: string
  /** Link to consultation summary PDF (when created from completed consultation) */
  pdfStorageUrl?: string
  consultationId?: string
}

export interface LabResult {
  testName: string
  result: string
  normalRange: string
  date: Date
  notes?: string
}

export interface Notification {
  id: string
  userId: string
  targetRole?: UserRole // Target specific role
  type: "appointment" | "billing" | "system" | "reminder" | "pharmacy" | "new-patient" | "consultation"
  title: string
  message: string
  data?: {
    patientId?: string
    patientName?: string
    appointmentId?: string
    consultationId?: string
    prescriptionId?: string
  }
  read: boolean
  createdAt: Date
}

// Pharmacy Types
export interface PharmacyOrder {
  id: string
  patientId: string
  patientName: string
  appointmentId?: string
  consultationId?: string
  doctorId: string
  doctorName: string
  diagnosis: string
  prescriptions: Prescription[]
  status: PharmacyOrderStatus
  priority: "normal" | "urgent"
  notes?: string
  dispensedBy?: string
  dispensedAt?: Date
  createdAt: Date
}

export type PharmacyOrderStatus = "pending" | "processing" | "ready" | "dispensed" | "cancelled"

export interface InventoryItem {
  id: string
  name: string
  genericName?: string
  category: string
  quantity: number
  unit: string
  minStock: number
  price: number
  expiryDate?: Date
  supplier?: string
  lastRestocked?: Date
}

export interface PatientAuditLog {
  id: string
  patientId: string
  patientName?: string
  action: "delete" | "status-change" | "edit"
  fromStatus?: string
  toStatus?: string
  /** Optional list of fields that changed on edit */
  changedFields?: string[]
  /** Optional before/after snapshot for edited fields */
  changes?: Record<string, { before: unknown; after: unknown }>
  performedByUserId: string
  performedByName: string
  performedByRole: UserRole
  createdAt: Date
}

export interface BillingAuditLog {
  id: string
  invoiceId: string
  patientId?: string
  patientName?: string
  changedFields?: string[]
  changes?: Record<string, { before: unknown; after: unknown }>
  performedByUserId: string
  performedByName: string
  performedByRole: UserRole
  createdAt: Date
}

export type DeletionRequestStatus = "pending" | "approved" | "completed" | "rejected"

export interface DeletionRequest {
  id: string
  patientId: string
  patientName?: string
  requestedByUserId: string
  requestedByName: string
  status: DeletionRequestStatus
  createdAt: Date
  completedAt?: Date
  completedByUserId?: string
  completedByName?: string
}

// Clinic Locations
export const CLINIC_LOCATIONS = [
  "Johannesburg Central",
  "Sandton",
  "Pretoria",
  "Midrand",
  "Soweto",
] as const

export type ClinicLocation = typeof CLINIC_LOCATIONS[number]
