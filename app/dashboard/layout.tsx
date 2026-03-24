"use client"

import React, { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"

import { useAuth } from "@/lib/auth-context"
import { DataProvider } from "@/lib/data-context"
import { PageTransition } from "@/components/animations/page-transition"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardBottomNav } from "@/components/dashboard/bottom-nav"
import { FullPageLoading } from "@/components/feedback/full-page-loading"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, isLoading, user } = useAuth()
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
  }, [isAuthenticated, isLoading, user, pathname, router])

  if (isLoading || !isAuthenticated || !user || user.role === "patient") {
    return <FullPageLoading text="Reztek Dashboard" />
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
      <div className="flex min-h-screen bg-gradient-to-br from-muted/50 via-background to-muted/40">
        {/* Desktop/Tablet Sidebar - full at lg, collapsed (icons only) at md */}
        <aside className="sticky top-0 self-start h-screen shrink-0 hidden md:block w-16 lg:w-64 transition-[width] duration-200">
          <DashboardSidebar />
        </aside>

        {/* Main Content - single page scroll */}
        <div className="flex flex-1 flex-col min-w-0">
          <DashboardHeader />
          <main className="flex-1 p-4 pb-20 lg:p-6 lg:pb-6">
            <PageTransition transitionKey={pathname} className="h-full">
              {children}
            </PageTransition>
          </main>
          <DashboardBottomNav role={user?.role} />
        </div>
      </div>
    </DataProvider>
  )
}
