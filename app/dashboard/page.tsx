"use client"

import { useAuth } from "@/lib/auth-context"
import { ClerkDashboard } from "@/components/dashboard/clerk-dashboard"
import { DoctorDashboard } from "@/components/dashboard/doctor-dashboard"
import { PharmacyDashboard } from "@/components/dashboard/pharmacy-dashboard"
import { AdminDashboard } from "@/components/dashboard/admin-dashboard"

export default function DashboardPage() {
  const { user } = useAuth()

  // Render role-specific dashboard
  switch (user?.role) {
    case "clerk":
      return <ClerkDashboard />
    case "doctor":
      return <DoctorDashboard />
    case "pharmacy":
      return <PharmacyDashboard />
    case "admin":
      return <AdminDashboard />
    default:
      return <ClerkDashboard />
  }
}
