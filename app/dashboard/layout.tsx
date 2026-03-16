"use client"

import React, { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { multiFactor } from "firebase/auth"

import { useAuth } from "@/lib/auth-context"
import { DataProvider } from "@/lib/data-context"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardBottomNav } from "@/components/dashboard/bottom-nav"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, isLoading, user, firebaseUser, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (isLoading) {
      return
    }

    if (!isAuthenticated) {
      router.push("/login")
      return
    }
    if (user?.role === "patient") {
      router.push("/login")
      return
    }
    if (user?.role === "medical-aid") {
      router.push("/medical-aid/claims")
      return
    }

    // Allow MFA enrollment route for clerks
    if (pathname?.startsWith("/dashboard/mfa")) {
      return
    }

    // Only clerks require MFA; admin does not
    if (user?.role === "clerk") {
      if (!firebaseUser) return

      const enrolled = multiFactor(firebaseUser).enrolledFactors
      if (!enrolled || enrolled.length === 0) {
        router.push("/dashboard/mfa/enroll")
        return
      }

      const fourDaysMs = 4 * 24 * 60 * 60 * 1000
      const last = user.lastMfaVerifiedAt?.getTime()
      if (!last || Date.now() - last > fourDaysMs) {
        logout().finally(() => router.push("/login?mfa=expired"))
      }
    }
  }, [isAuthenticated, isLoading, user, firebaseUser, pathname, router, logout])

  if (isLoading || !isAuthenticated || !user || user.role === "patient") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (user.role === "medical-aid") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Redirecting to medical-aid portal…</div>
      </div>
    )
  }

  return (
    <DataProvider>
      <div className="flex min-h-screen bg-muted/30">
        {/* Desktop/Tablet Sidebar - full at lg, collapsed (icons only) at md */}
        <aside className="sticky top-0 self-start h-screen shrink-0 hidden md:block w-16 lg:w-64 transition-[width] duration-200">
          <DashboardSidebar />
        </aside>

        {/* Main Content - single page scroll */}
        <div className="flex flex-1 flex-col min-w-0">
          <DashboardHeader />
          <main className="flex-1 p-4 pb-20 lg:p-6 lg:pb-6 animate-in fade-in duration-200">
            {children}
          </main>
          <DashboardBottomNav role={user?.role} />
        </div>
      </div>
    </DataProvider>
  )
}
