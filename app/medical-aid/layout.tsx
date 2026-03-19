"use client"

import type React from "react"
import { useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"

export default function MedicalAidLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.replace("/login")
      return
    }
    if (!user || user.role !== "medical-aid") {
      router.replace("/login")
      return
    }
    if (pathname === "/medical-aid") {
      router.replace("/medical-aid/dashboard")
    }
  }, [isAuthenticated, isLoading, user, router, pathname])

  if (isLoading || !isAuthenticated || !user || user.role !== "medical-aid") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <div className="text-sm font-semibold leading-tight text-foreground">Medical Aid Portal</div>
              <div className="text-xs text-muted-foreground">Claims processing</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/">Home</Link>
            </Button>
            <Button asChild variant={pathname === "/medical-aid/dashboard" ? "secondary" : "ghost"} size="sm">
              <Link href="/medical-aid/dashboard">Dashboard</Link>
            </Button>
            <Button asChild variant={pathname?.startsWith("/medical-aid/claims") ? "secondary" : "ghost"} size="sm">
              <Link href="/medical-aid/claims">Claims</Link>
            </Button>
            <Button asChild variant={pathname === "/medical-aid/analytics" ? "secondary" : "ghost"} size="sm">
              <Link href="/medical-aid/analytics">Analytics</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => logout().finally(() => router.replace("/login"))}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}

