"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"

import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.push("/login")
      return
    }
    if (!user || user.role !== "admin") {
      router.push("/dashboard")
      return
    }
  }, [isAuthenticated, isLoading, user, pathname, router])

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    )
  }

  if (user.role !== "admin") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Redirecting…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-3">
                <Image
                  src="/reztek-logo.svg"
                  alt="Reztek"
                  width={160}
                  height={56}
                  className="h-9 w-auto object-contain"
                  priority
                />
              </Link>
              <nav className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <Link
                  href="/admin/leads"
                  className="rounded-lg px-3 py-2 hover:bg-muted hover:text-foreground transition-colors"
                >
                  Leads
                </Link>
                <Link
                  href="/admin/demo-requests"
                  className="rounded-lg px-3 py-2 hover:bg-muted hover:text-foreground transition-colors"
                >
                  Demo Requests
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/dashboard">
                <Button variant="outline">Dashboard</Button>
              </Link>
              <Button
                variant="secondary"
                onClick={() => {
                  void logout()
                }}
              >
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 animate-in fade-in duration-200">
        {children}
      </main>
    </div>
  )
}

