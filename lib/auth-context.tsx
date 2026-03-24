"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import type { User, UserRole } from "./types"
import {
  firebaseSignIn,
  firebaseSignOut,
  onAuthChange,
  getUserProfile,
  createUserProfile,
  firebaseSignUp,
  addAuthAuditLog,
  type UserProfileFromFirestore,
} from "./firebase"
import { type User as FirebaseUser } from "firebase/auth"
import { mapFirebaseClientError } from "@/lib/client-errors"

interface AuthContextType {
  user: User | null
  firebaseUser: FirebaseUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (email: string, password: string, name: string, role: UserRole) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  hasPermission: (allowedRoles: UserRole[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Demo credentials for development only. Do not use in production; use real Firebase Auth users.
export const demoCredentials = {
  admin: {
    email: "admin@reztek-health.co.za",
    password: "admin123",
    name: "Reztek System Administrator",
    role: "admin" as UserRole,
  },
  doctor: {
    email: "doctor@reztek-health.co.za",
    password: "doctor123",
    name: "Reztek Clinician",
    role: "doctor" as UserRole,
  },
  clerk: {
    email: "clerk@reztek-health.co.za",
    password: "clerk123",
    name: "Reztek Clerk",
    role: "clerk" as UserRole,
  },
  pharmacy: {
    email: "pharmacy@reztek-health.co.za",
    password: "pharmacy123",
    name: "Reztek Pharmacy",
    role: "pharmacy" as UserRole,
  },
}

// Role permissions mapping
export const rolePermissions = {
  clerk: {
    canViewPatientAdmin: true,
    canEditPatientAdmin: true,
    canViewSymptoms: false,
    canViewDiagnosis: false,
    canViewAISummary: false,
    canRegisterPatients: true,
    canNotifyDoctor: true,
  },
  doctor: {
    canViewPatientAdmin: true,
    canEditPatientAdmin: true,
    canViewSymptoms: true,
    canCaptureSymptoms: true,
    canViewDiagnosis: true,
    canEditDiagnosis: true,
    canViewAISummary: true,
    canEditAISummary: true,
    canSendPrescription: true,
    canSendPDF: true,
  },
  pharmacy: {
    canViewPatientAdmin: false,
    canViewDiagnosis: true,
    canViewPrescription: true,
    canDispenseMedication: true,
    canViewSymptoms: false,
    canViewAISummary: false,
  },
  admin: {
    canViewPatientAdmin: true,
    canEditPatientAdmin: true,
    canViewSymptoms: true,
    canCaptureSymptoms: true,
    canViewDiagnosis: true,
    canEditDiagnosis: true,
    canViewAISummary: true,
    canEditAISummary: true,
    canSendPrescription: true,
    canSendPDF: true,
    canViewPrescription: true,
    canDispenseMedication: true,
    canRegisterPatients: true,
    canNotifyDoctor: true,
    canManageUsers: true,
    canViewReports: true,
  },
  receptionist: {
    canViewPatientAdmin: true,
    canEditPatientAdmin: true,
    canRegisterPatients: true,
    canViewSymptoms: false,
    canViewDiagnosis: false,
    canViewAISummary: false,
  },
  patient: {
    canViewOwnRecords: true,
    canViewOwnAppointments: true,
    canBookAppointments: true,
  },
  "medical-aid": {
    // Medical aid officers only work in their own portal.
    // No access to patient admin, consultations, pharmacy, etc.
  },
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthChange(async (fbUser) => {
      setFirebaseUser(fbUser)
      
      if (fbUser) {
        try {
          // Get user profile from Firestore
          const profile: UserProfileFromFirestore | null = await getUserProfile(fbUser.uid)
          if (profile) {
            const createdAt = profile.createdAt && typeof (profile.createdAt as { toDate?: () => Date }).toDate === "function"
              ? (profile.createdAt as { toDate: () => Date }).toDate()
              : profile.createdAt instanceof Date ? profile.createdAt : new Date()
            const lastMfaVerifiedAt =
              profile.lastMfaVerifiedAt && typeof (profile.lastMfaVerifiedAt as { toDate?: () => Date }).toDate === "function"
                ? (profile.lastMfaVerifiedAt as { toDate: () => Date }).toDate()
                : profile.lastMfaVerifiedAt instanceof Date
                  ? profile.lastMfaVerifiedAt
                  : undefined
            setUser({
              id: fbUser.uid,
              email: fbUser.email || "",
              name: profile.name || fbUser.displayName || "User",
              role: (profile.role === "patient" ? "clerk" : (profile.role || "clerk")) as UserRole,
              phone: profile.phone,
              createdAt,
              lastMfaVerifiedAt,
            })
          } else {
            setUser({
              id: fbUser.uid,
              email: fbUser.email || "",
              name: fbUser.displayName || "User",
              role: "clerk",
              createdAt: new Date(),
            })
          }
        } catch (error) {
          console.error("Error fetching user profile:", error)
          setUser(null)
        }
      } else {
        setUser(null)
      }
      
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)
    try {
      const userCredential = await firebaseSignIn(email, password)
      const fbUser = userCredential.user

      let profile: UserProfileFromFirestore | null = await getUserProfile(fbUser.uid)
      if (!profile) {
        const demoUser = Object.values(demoCredentials).find(cred => cred.email === email)
        if (demoUser) {
          await createUserProfile(fbUser.uid, {
            email: demoUser.email,
            name: demoUser.name,
            role: demoUser.role,
          })
          profile = {
            id: fbUser.uid,
            email: demoUser.email,
            name: demoUser.name,
            role: demoUser.role,
          }
        }
      }

      if (profile) {
        const role = profile.role || "clerk"
        const createdAt = profile.createdAt && typeof (profile.createdAt as { toDate?: () => Date }).toDate === "function"
          ? (profile.createdAt as { toDate: () => Date }).toDate()
          : profile.createdAt instanceof Date ? profile.createdAt : new Date()
        const lastMfaVerifiedAt =
          profile.lastMfaVerifiedAt && typeof (profile.lastMfaVerifiedAt as { toDate?: () => Date }).toDate === "function"
            ? (profile.lastMfaVerifiedAt as { toDate: () => Date }).toDate()
            : profile.lastMfaVerifiedAt instanceof Date
              ? profile.lastMfaVerifiedAt
              : undefined
        setUser({
          id: fbUser.uid,
          email: fbUser.email || "",
          name: profile.name || "User",
          role: (role === "patient" ? "clerk" : role) as UserRole,
          phone: profile.phone,
          createdAt,
          lastMfaVerifiedAt,
        })
      }

      try {
        await addAuthAuditLog({
          action: "login",
          userId: fbUser.uid,
          userEmail: fbUser.email ?? undefined,
          userName: profile?.name ?? fbUser.displayName ?? undefined,
        })
      } catch (_) {
        // best-effort; do not block login
      }

      setIsLoading(false)
      return { success: true }
    } catch (error: unknown) {
      setIsLoading(false)
      return { success: false, error: mapFirebaseClientError(error) }
    }
  }, [])

  const register = useCallback(async (
    email: string, 
    password: string, 
    name: string, 
    role: UserRole
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)
    
    try {
      const userCredential = await firebaseSignUp(email, password)
      const fbUser = userCredential.user
      
      // Create user profile in Firestore
      await createUserProfile(fbUser.uid, {
        email,
        name,
        role,
      })

      setUser({
        id: fbUser.uid,
        email,
        name,
        role,
        createdAt: new Date(),
      })
      
      setIsLoading(false)
      return { success: true }
    } catch (error: unknown) {
      setIsLoading(false)
      return { success: false, error: mapFirebaseClientError(error) }
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      if (firebaseUser) {
        try {
          await addAuthAuditLog({
            action: "logout",
            userId: firebaseUser.uid,
            userEmail: firebaseUser.email ?? undefined,
            userName: user?.name,
          })
        } catch (_) {
          // best-effort
        }
      }
      await firebaseSignOut()
      setUser(null)
      setFirebaseUser(null)
    } catch (error) {
      console.error("Logout error:", error)
    }
  }, [firebaseUser, user])

  const hasPermission = useCallback(
    (allowedRoles: UserRole[]): boolean => {
      if (!user) return false
      return allowedRoles.includes(user.role)
    },
    [user]
  )

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// Hook to check specific permissions
export function usePermission(permission: string): boolean {
  const { user } = useAuth()
  if (!user) return false
  
  const permissions = rolePermissions[user.role as keyof typeof rolePermissions]
  return permissions ? (permissions as Record<string, boolean>)[permission] ?? false : false
}
