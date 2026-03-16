import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, type User as FirebaseUser } from "firebase/auth"
import { getFirestore, collection, doc, getDoc, setDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, onSnapshot, Timestamp, arrayUnion, serverTimestamp, limit, type DocumentData } from "firebase/firestore"
import { getAnalytics, isSupported } from "firebase/analytics"

// Validate environment variables
const requiredEnvVars = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// Check for missing environment variables without crashing the build.
const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key)
const hasMissingVars = missingVars.length > 0

if (hasMissingVars) {
  console.warn(
    `Missing required Firebase environment variables: ${missingVars.join(", ")}. Please check your .env.local file.`
  )
}

const firebaseConfig = {
  apiKey: requiredEnvVars.apiKey!,
  authDomain: requiredEnvVars.authDomain!,
  projectId: requiredEnvVars.projectId!,
  storageBucket: requiredEnvVars.storageBucket!,
  messagingSenderId: requiredEnvVars.messagingSenderId!,
  appId: requiredEnvVars.appId!,
  measurementId: requiredEnvVars.measurementId!,
}

// Initialize Firebase (prevent multiple instances)
const app = !hasMissingVars ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()) : null
const auth = app ? getAuth(app) : null
const db = app ? getFirestore(app) : null

export const getFirebaseAuth = () => {
  if (!auth) throw new Error("Firebase is not configured. Check your environment variables.")
  return auth
}

// Initialize Analytics (only in browser environment)
let analytics: ReturnType<typeof getAnalytics> | null = null
if (typeof window !== "undefined" && app) {
  isSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app)
      }
    })
    .catch((error) => {
      console.warn("Firebase Analytics initialization failed:", error)
    })
}

// Collections
const COLLECTIONS = {
  USERS: "users",
  PATIENTS: "patients",
  APPOINTMENTS: "appointments",
  INVOICES: "invoices",
  MEDICAL_RECORDS: "medicalRecords",
  PRESCRIPTIONS: "prescriptions",
  PHARMACY_ORDERS: "pharmacyOrders",
  NOTIFICATIONS: "notifications",
  CONSULTATIONS: "consultations",
  PATIENT_AUDIT_LOGS: "patientAuditLogs",
  BILLING_AUDIT_LOGS: "billingAuditLogs",
  AUTH_AUDIT_LOGS: "authAuditLogs",
  MEDICAL_AID_CLAIMS: "medicalAidClaims",
  DELETION_REQUESTS: "deletionRequests",
}

// Helper to convert Firestore timestamps
const convertTimestamp = (timestamp: Timestamp | Date | undefined): Date => {
  if (!timestamp) return new Date()
  if (timestamp instanceof Timestamp) return timestamp.toDate()
  return timestamp
}

// Auth functions
export const firebaseSignIn = async (email: string, password: string) => {
  if (!auth) throw new Error("Firebase is not configured. Check your environment variables.")
  return signInWithEmailAndPassword(auth, email, password)
}

export const firebaseSignUp = async (email: string, password: string) => {
  if (!auth) throw new Error("Firebase is not configured. Check your environment variables.")
  return createUserWithEmailAndPassword(auth, email, password)
}

export const firebaseSignOut = async () => {
  if (!auth) throw new Error("Firebase is not configured. Check your environment variables.")
  return signOut(auth)
}

export const onAuthChange = (callback: (user: FirebaseUser | null) => void) => {
  if (!auth) throw new Error("Firebase is not configured. Check your environment variables.")
  return onAuthStateChanged(auth, callback)
}

// User profile shape returned from Firestore (used by auth-context)
export type UserProfileFromFirestore = {
  id: string
  email?: string
  name?: string
  role?: string
  phone?: string
  createdAt?: Timestamp | Date
  lastMfaVerifiedAt?: Timestamp | Date
}

// User functions
export const getUserProfile = async (uid: string): Promise<UserProfileFromFirestore | null> => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const docRef = doc(db, COLLECTIONS.USERS, uid)
  const docSnap = await getDoc(docRef)
  if (docSnap.exists()) {
    const data = docSnap.data()
    return {
      id: docSnap.id,
      email: data?.email as string | undefined,
      name: data?.name as string | undefined,
      role: data?.role as string | undefined,
      phone: data?.phone as string | undefined,
      createdAt: data?.createdAt,
      lastMfaVerifiedAt: data?.lastMfaVerifiedAt,
    }
  }
  return null
}

export const createUserProfile = async (uid: string, data: DocumentData) => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const docRef = doc(db, COLLECTIONS.USERS, uid)
  await setDoc(docRef, {
    ...data,
    createdAt: Timestamp.now(),
  })
}

export const updateUserProfile = async (uid: string, data: Partial<DocumentData>) => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const docRef = doc(db, COLLECTIONS.USERS, uid)
  await updateDoc(docRef, data)
}

// Patient functions
export const getPatients = async () => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const querySnapshot = await getDocs(collection(db, COLLECTIONS.PATIENTS))
  return querySnapshot.docs.map(doc => {
    const d = doc.data()
    return {
      id: doc.id,
      ...d,
      dateOfBirth: convertTimestamp(d.dateOfBirth),
      createdAt: convertTimestamp(d.createdAt),
      dateRegistered: d.dateRegistered ? convertTimestamp(d.dateRegistered) : undefined,
      lastVisitDate: d.lastVisitDate ? convertTimestamp(d.lastVisitDate) : undefined,
      visitHistory: (d.visitHistory || []).map((t: Timestamp) => convertTimestamp(t)),
    }
  })
}

/** Subscribe to patients collection for real-time updates (e.g. clerk sends patient to doctor). Returns unsubscribe. */
export const subscribeToPatients = (callback: (patients: Awaited<ReturnType<typeof getPatients>>) => void) => {
  if (!db) {
    callback([])
    return () => {}
  }
  return onSnapshot(collection(db, COLLECTIONS.PATIENTS), (snapshot) => {
    const patients = snapshot.docs.map((d) => {
      const data = d.data()
      return {
        id: d.id,
        ...data,
        dateOfBirth: convertTimestamp(data.dateOfBirth),
        createdAt: convertTimestamp(data.createdAt),
        dateRegistered: data.dateRegistered ? convertTimestamp(data.dateRegistered) : undefined,
        lastVisitDate: data.lastVisitDate ? convertTimestamp(data.lastVisitDate) : undefined,
        visitHistory: (data.visitHistory || []).map((t: Timestamp) => convertTimestamp(t)),
      }
    })
    callback(patients)
  })
}

export const getPatient = async (id: string) => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const docRef = doc(db, COLLECTIONS.PATIENTS, id)
  const docSnap = await getDoc(docRef)
  if (docSnap.exists()) {
    const data = docSnap.data()
    return {
      id: docSnap.id,
      ...data,
      dateOfBirth: convertTimestamp(data.dateOfBirth),
      createdAt: convertTimestamp(data.createdAt),
      dateRegistered: data.dateRegistered ? convertTimestamp(data.dateRegistered) : undefined,
      lastVisitDate: data.lastVisitDate ? convertTimestamp(data.lastVisitDate) : undefined,
      visitHistory: (data.visitHistory || []).map((t: Timestamp) => convertTimestamp(t)),
    }
  }
  return null
}

/** Remove undefined values so Firestore does not reject the document. */
function stripUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Record<string, unknown>
}

export const addPatient = async (data: DocumentData) => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const { dateRegistered: _dr, ...rest } = data as Record<string, unknown>
  const payload = stripUndefined({
    ...rest,
    createdAt: Timestamp.now(),
    dateRegistered: serverTimestamp(),
  } as Record<string, unknown>)
  const docRef = await addDoc(collection(db, COLLECTIONS.PATIENTS), payload)
  return docRef.id
}

export const updatePatient = async (id: string, data: Partial<DocumentData>) => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const docRef = doc(db, COLLECTIONS.PATIENTS, id)
  await updateDoc(docRef, data)
}

/** Append a visit date and set status/lastVisitDate (e.g. when DR completes consultation). */
export const appendPatientVisit = async (patientId: string) => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const docRef = doc(db, COLLECTIONS.PATIENTS, patientId)
  const now = Timestamp.now()
  await updateDoc(docRef, {
    status: "completed",
    lastVisitDate: now,
    visitHistory: arrayUnion(now),
  })
}

export const deletePatient = async (id: string) => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const docRef = doc(db, COLLECTIONS.PATIENTS, id)
  await deleteDoc(docRef)
}

// Appointment functions
export const getAppointments = async () => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const querySnapshot = await getDocs(collection(db, COLLECTIONS.APPOINTMENTS))
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    date: convertTimestamp(doc.data().date),
    createdAt: convertTimestamp(doc.data().createdAt),
    updatedAt: convertTimestamp(doc.data().updatedAt),
  }))
}

export const getAppointment = async (id: string) => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const docRef = doc(db, COLLECTIONS.APPOINTMENTS, id)
  const docSnap = await getDoc(docRef)
  if (docSnap.exists()) {
    const data = docSnap.data()
    return {
      id: docSnap.id,
      ...data,
      date: convertTimestamp(data.date),
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
    }
  }
  return null
}

export const addAppointment = async (data: DocumentData) => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const payload = stripUndefined({
    ...(data as Record<string, unknown>),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  } as Record<string, unknown>)
  const docRef = await addDoc(collection(db, COLLECTIONS.APPOINTMENTS), payload)
  return docRef.id
}

export const updateAppointment = async (id: string, data: Partial<DocumentData>) => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const docRef = doc(db, COLLECTIONS.APPOINTMENTS, id)
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  })
}

export const deleteAppointment = async (id: string) => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const docRef = doc(db, COLLECTIONS.APPOINTMENTS, id)
  await deleteDoc(docRef)
}

// Invoice functions
export const getInvoices = async () => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const querySnapshot = await getDocs(collection(db, COLLECTIONS.INVOICES))
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    dueDate: convertTimestamp(doc.data().dueDate),
    paidDate: doc.data().paidDate ? convertTimestamp(doc.data().paidDate) : undefined,
    createdAt: convertTimestamp(doc.data().createdAt),
  }))
}

export const getInvoice = async (id: string) => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const docRef = doc(db, COLLECTIONS.INVOICES, id)
  const docSnap = await getDoc(docRef)
  if (docSnap.exists()) {
    const data = docSnap.data()
    return {
      id: docSnap.id,
      ...data,
      dueDate: convertTimestamp(data.dueDate),
      paidDate: data.paidDate ? convertTimestamp(data.paidDate) : undefined,
      createdAt: convertTimestamp(data.createdAt),
    }
  }
  return null
}

export const addInvoice = async (data: DocumentData) => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const docRef = await addDoc(collection(db, COLLECTIONS.INVOICES), {
    ...data,
    createdAt: Timestamp.now(),
  })
  return docRef.id
}

export const updateInvoice = async (id: string, data: Partial<DocumentData>) => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const docRef = doc(db, COLLECTIONS.INVOICES, id)
  await updateDoc(docRef, data)
}

export const deleteInvoice = async (id: string) => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const docRef = doc(db, COLLECTIONS.INVOICES, id)
  await deleteDoc(docRef)
}

// Medical Records functions
export const getMedicalRecords = async () => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const querySnapshot = await getDocs(collection(db, COLLECTIONS.MEDICAL_RECORDS))
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    date: convertTimestamp(doc.data().date),
    followUpDate: doc.data().followUpDate ? convertTimestamp(doc.data().followUpDate) : undefined,
  }))
}

export const getMedicalRecordsByPatient = async (patientId: string) => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const q = query(collection(db, COLLECTIONS.MEDICAL_RECORDS), where("patientId", "==", patientId))
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    date: convertTimestamp(doc.data().date),
    followUpDate: doc.data().followUpDate ? convertTimestamp(doc.data().followUpDate) : undefined,
  }))
}

export const addMedicalRecord = async (data: DocumentData) => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const resolvedDate: Timestamp =
    data.date == null
      ? Timestamp.now()
      : data.date instanceof Date
        ? Timestamp.fromDate(data.date)
        : typeof (data.date as { toDate?: () => Date })?.toDate === "function"
          ? Timestamp.fromDate((data.date as { toDate: () => Date }).toDate())
          : Timestamp.fromDate(new Date(data.date as number | string))
  const docRef = await addDoc(collection(db, COLLECTIONS.MEDICAL_RECORDS), {
    ...data,
    date: resolvedDate,
  })
  return docRef.id
}

// Prescription functions
export const getPrescriptionsByPatient = async (patientId: string) => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const q = query(
    collection(db, COLLECTIONS.PRESCRIPTIONS),
    where("patientId", "==", patientId),
    orderBy("createdAt", "desc")
  )
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: convertTimestamp(doc.data().createdAt),
  }))
}

export const addPrescription = async (data: DocumentData) => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const docRef = await addDoc(collection(db, COLLECTIONS.PRESCRIPTIONS), {
    ...data,
    createdAt: Timestamp.now(),
  })
  return docRef.id
}

// Pharmacy Order functions
export const getPharmacyOrders = async () => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const querySnapshot = await getDocs(collection(db, COLLECTIONS.PHARMACY_ORDERS))
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: convertTimestamp(doc.data().createdAt),
    dispensedAt: doc.data().dispensedAt ? convertTimestamp(doc.data().dispensedAt) : undefined,
  }))
}

export const getPharmacyOrdersByStatus = async (status: string) => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const q = query(collection(db, COLLECTIONS.PHARMACY_ORDERS), where("status", "==", status))
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: convertTimestamp(doc.data().createdAt),
    dispensedAt: doc.data().dispensedAt ? convertTimestamp(doc.data().dispensedAt) : undefined,
  }))
}

export const addPharmacyOrder = async (data: DocumentData) => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const docRef = await addDoc(collection(db, COLLECTIONS.PHARMACY_ORDERS), {
    ...data,
    createdAt: Timestamp.now(),
  })
  return docRef.id
}

export const updatePharmacyOrder = async (id: string, data: Partial<DocumentData>) => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const docRef = doc(db, COLLECTIONS.PHARMACY_ORDERS, id)
  await updateDoc(docRef, data)
}

// Notification functions
export const getNotifications = async (userId: string) => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const q = query(collection(db, COLLECTIONS.NOTIFICATIONS), where("userId", "==", userId), orderBy("createdAt", "desc"))
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: convertTimestamp(doc.data().createdAt),
  }))
}

export const addNotification = async (data: DocumentData) => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const docRef = await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), {
    ...data,
    createdAt: Timestamp.now(),
  })
  return docRef.id
}

export const markNotificationRead = async (id: string) => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const docRef = doc(db, COLLECTIONS.NOTIFICATIONS, id)
  await updateDoc(docRef, { read: true })
}

// Consultation functions
export const getConsultations = async () => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const querySnapshot = await getDocs(collection(db, COLLECTIONS.CONSULTATIONS))
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: convertTimestamp(doc.data().createdAt),
    updatedAt: convertTimestamp(doc.data().updatedAt),
    confirmedAt: doc.data().confirmedAt ? convertTimestamp(doc.data().confirmedAt) : undefined,
    pdfSentAt: doc.data().pdfSentAt ? convertTimestamp(doc.data().pdfSentAt) : undefined,
  }))
}

export const getConsultation = async (id: string) => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const docRef = doc(db, COLLECTIONS.CONSULTATIONS, id)
  const docSnap = await getDoc(docRef)
  if (docSnap.exists()) {
    const data = docSnap.data()
    return {
      id: docSnap.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
      confirmedAt: data.confirmedAt ? convertTimestamp(data.confirmedAt) : undefined,
      pdfSentAt: data.pdfSentAt ? convertTimestamp(data.pdfSentAt) : undefined,
    }
  }
  return null
}

export const getConsultationsByPatient = async (patientId: string) => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const q = query(collection(db, COLLECTIONS.CONSULTATIONS), where("patientId", "==", patientId), orderBy("createdAt", "desc"))
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: convertTimestamp(doc.data().createdAt),
    updatedAt: convertTimestamp(doc.data().updatedAt),
    confirmedAt: doc.data().confirmedAt ? convertTimestamp(doc.data().confirmedAt) : undefined,
    pdfSentAt: doc.data().pdfSentAt ? convertTimestamp(doc.data().pdfSentAt) : undefined,
  }))
}

export const getLatestConsultation = async (patientId: string) => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const q = query(
    collection(db, COLLECTIONS.CONSULTATIONS),
    where("patientId", "==", patientId),
    orderBy("createdAt", "desc"),
    limit(1),
  )
  const querySnapshot = await getDocs(q)
  if (querySnapshot.empty) return null
  const snap = querySnapshot.docs[0]
  const data = snap.data()
  return {
    id: snap.id,
    ...data,
    createdAt: convertTimestamp(data.createdAt),
    updatedAt: convertTimestamp(data.updatedAt),
    confirmedAt: data.confirmedAt ? convertTimestamp(data.confirmedAt) : undefined,
    pdfSentAt: data.pdfSentAt ? convertTimestamp(data.pdfSentAt) : undefined,
  }
}

/** Subscribe to consultations (real-time). Use for pharmacy pending orders. */
export const subscribeToConsultations = (callback: (consultations: Awaited<ReturnType<typeof getConsultations>>) => void) => {
  if (!db) {
    callback([])
    return () => {}
  }
  return onSnapshot(collection(db, COLLECTIONS.CONSULTATIONS), (snapshot) => {
    const list = snapshot.docs.map((d) => {
      const data = d.data()
      return {
        id: d.id,
        ...data,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
        confirmedAt: data.confirmedAt ? convertTimestamp(data.confirmedAt) : undefined,
        pdfSentAt: data.pdfSentAt ? convertTimestamp(data.pdfSentAt) : undefined,
      }
    })
    callback(list)
  })
}

export const addConsultation = async (data: DocumentData) => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const docRef = await addDoc(collection(db, COLLECTIONS.CONSULTATIONS), {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  })
  return docRef.id
}

export const updateConsultation = async (id: string, data: Partial<DocumentData>) => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const docRef = doc(db, COLLECTIONS.CONSULTATIONS, id)
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  })
}

export const deleteConsultation = async (id: string) => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const docRef = doc(db, COLLECTIONS.CONSULTATIONS, id)
  await deleteDoc(docRef)
}

// Patient audit log functions
export const getPatientAuditLogs = async () => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const q = query(
    collection(db, COLLECTIONS.PATIENT_AUDIT_LOGS),
    orderBy("createdAt", "desc")
  )
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map((docSnap) => {
    const data = docSnap.data()
    return {
      id: docSnap.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt as Timestamp | undefined),
    }
  })
}

export const addPatientAuditLog = async (data: DocumentData) => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const docRef = await addDoc(collection(db, COLLECTIONS.PATIENT_AUDIT_LOGS), {
    ...data,
    createdAt: Timestamp.now(),
  })
  return docRef.id
}

export const addBillingAuditLog = async (data: DocumentData) => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const docRef = await addDoc(collection(db, COLLECTIONS.BILLING_AUDIT_LOGS), {
    ...data,
    createdAt: Timestamp.now(),
  })
  return docRef.id
}

export const getBillingAuditLogs = async () => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const q = query(
    collection(db, COLLECTIONS.BILLING_AUDIT_LOGS),
    orderBy("createdAt", "desc")
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      ...data,
      createdAt: data.createdAt ? convertTimestamp(data.createdAt) : new Date(),
    }
  })
}

// Auth audit logs (login/logout for security)
export const addAuthAuditLog = async (data: { action: "login" | "logout"; userId: string; userEmail?: string; userName?: string }) => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  await addDoc(collection(db, COLLECTIONS.AUTH_AUDIT_LOGS), {
    ...data,
    createdAt: Timestamp.now(),
  })
}

export const getAuthAuditLogs = async () => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const q = query(
    collection(db, COLLECTIONS.AUTH_AUDIT_LOGS),
    orderBy("createdAt", "desc")
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      ...data,
      createdAt: data.createdAt ? convertTimestamp(data.createdAt) : new Date(),
    }
  })
}

// Staff profiles (users collection, exclude patients)
export const getStaffProfiles = async () => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const snapshot = await getDocs(collection(db, COLLECTIONS.USERS))
  return snapshot.docs
    .map((d) => {
      const data = d.data()
      const role = (data.role as string) || "clerk"
      if (role === "patient") return null
      return {
        id: d.id,
        email: data.email as string | undefined,
        name: data.name as string | undefined,
        role,
        phone: data.phone as string | undefined,
        createdAt: data.createdAt ? convertTimestamp(data.createdAt) : undefined,
      }
    })
    .filter(Boolean) as { id: string; email?: string; name?: string; role: string; phone?: string; createdAt?: Date }[]
}

// Medical Aid Claims
export const addMedicalAidClaim = async (data: DocumentData) => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const docRef = await addDoc(collection(db, COLLECTIONS.MEDICAL_AID_CLAIMS), {
    ...data,
    createdAt: Timestamp.now(),
  })
  return docRef.id
}

export const getMedicalAidClaims = async () => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const q = collection(db, COLLECTIONS.MEDICAL_AID_CLAIMS)
  const snapshot = await getDocs(q)
  const list = snapshot.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      ...data,
      consultationDate: convertTimestamp(data.consultationDate),
      dateOfService: convertTimestamp(data.dateOfService),
      createdAt: data.createdAt ? convertTimestamp(data.createdAt) : new Date(),
    }
  })
  list.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
  return list
}

export const getMedicalAidClaimsByPatient = async (patientId: string) => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const q = query(
    collection(db, COLLECTIONS.MEDICAL_AID_CLAIMS),
    where("patientId", "==", patientId)
  )
  const snapshot = await getDocs(q)
  const list = snapshot.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      ...data,
      consultationDate: convertTimestamp(data.consultationDate),
      dateOfService: convertTimestamp(data.dateOfService),
      createdAt: data.createdAt ? convertTimestamp(data.createdAt) : new Date(),
    }
  })
  list.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
  return list
}

export const getMedicalAidClaim = async (id: string) => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const docRef = doc(db, COLLECTIONS.MEDICAL_AID_CLAIMS, id)
  const snapshot = await getDoc(docRef)
  if (!snapshot.exists()) return null
  const data = snapshot.data()
  return {
    id: snapshot.id,
    ...data,
    consultationDate: convertTimestamp(data.consultationDate),
    dateOfService: convertTimestamp(data.dateOfService),
    createdAt: convertTimestamp(data.createdAt),
    xmlExportedAt: data.xmlExportedAt ? convertTimestamp(data.xmlExportedAt) : null,
    patientDateOfBirth: data.patientDateOfBirth ? convertTimestamp(data.patientDateOfBirth) : undefined,
  }
}

export const updateMedicalAidClaim = async (id: string, data: Partial<DocumentData>) => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const docRef = doc(db, COLLECTIONS.MEDICAL_AID_CLAIMS, id)
  await updateDoc(docRef, data)
}

// Deletion requests (clerk creates; admin approves via API)
export const getDeletionRequests = async (status?: "pending" | "completed" | "rejected") => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const q = query(
    collection(db, COLLECTIONS.DELETION_REQUESTS),
    orderBy("createdAt", "desc")
  )
  const snapshot = await getDocs(q)
  let list = snapshot.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      ...data,
      status: data.status as string | undefined,
      createdAt: data.createdAt ? convertTimestamp(data.createdAt) : new Date(),
      completedAt: data.completedAt ? convertTimestamp(data.completedAt) : undefined,
    }
  })
  if (status) {
    list = list.filter((r) => r.status === status)
  }
  return list
}

export const createDeletionRequest = async (data: {
  patientId: string
  patientName?: string
  requestedByUserId: string
  requestedByName: string
}) => {
  if (!db) throw new Error("Firebase is not configured. Check your environment variables.")
  const docRef = await addDoc(collection(db, COLLECTIONS.DELETION_REQUESTS), {
    ...data,
    status: "pending",
    createdAt: Timestamp.now(),
  })
  return docRef.id
}

export { app, auth, db, analytics, COLLECTIONS, Timestamp }
