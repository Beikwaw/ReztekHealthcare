"use client"

import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DashboardHero, dashboardQuickActionClass, dashboardListRowClass } from "@/components/dashboard/dashboard-hero"
import { DashboardPanel } from "@/components/dashboard/dashboard-card"
import { StatCard } from "@/components/dashboard/stat-card"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import { useConsultationsRealtime } from "@/lib/firestore-hooks"
import Link from "next/link"
import {
  Package,
  Clock,
  CheckCircle2,
  ArrowRight,
  Activity,
  ShoppingCart,
  FileText,
} from "lucide-react"

export function PharmacyDashboard() {
  const { user } = useAuth()
  const { consultations } = useConsultationsRealtime()

  // Get prescriptions from consultations (confirmed or sent-to-pharmacy)
  const prescriptionConsultations = consultations.filter(
    (c) =>
      (c.status === "confirmed" || c.status === "sent-to-pharmacy") &&
      ((c.prescription && c.prescription.length > 0) || (c as { scriptText?: string }).scriptText?.trim())
  )

  const prescriptions = prescriptionConsultations.flatMap((c) =>
    (c.prescription && c.prescription.length > 0
      ? c.prescription
      : [{ medication: "Script", dosage: "", frequency: "", duration: "", instructions: "" }]
    ).map((p) => ({
      ...p,
      consultationId: c.id,
      patientId: c.patientId,
      patientName: c.patientName || "Unknown Patient",
      date: c.createdAt,
      dispensed: false,
    }))
  )

  const pendingPrescriptions = prescriptions
  const dispensedPrescriptions: typeof prescriptions = []

  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
  const todayPrescriptions = prescriptions.filter(
    (p) => new Date(p.date) >= todayStart && new Date(p.date) < todayEnd
  )

  const stats: {
    title: string
    value: number
    icon: LucideIcon
    description: string
    variant: "amber" | "green" | "blue" | "default"
  }[] = [
    {
      title: "Pending Prescriptions",
      value: pendingPrescriptions.length,
      icon: Clock,
      description: "Awaiting fulfillment",
      variant: "amber",
    },
    {
      title: "Dispensed Today",
      value: todayPrescriptions.filter((p) => p.dispensed).length,
      icon: CheckCircle2,
      description: "Completed today",
      variant: "green",
    },
    {
      title: "Total Dispensed",
      value: dispensedPrescriptions.length,
      icon: Package,
      description: "All time",
      variant: "blue",
    },
    {
      title: "Total Prescriptions",
      value: prescriptions.length,
      icon: FileText,
      description: "In system",
      variant: "default",
    },
  ]

  // Recent prescriptions
  const recentPrescriptions = [...prescriptions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  return (
    <div className="space-y-8">
      <DashboardHero
        title={<>Welcome back, {user?.name?.split(" ")[0]}</>}
        subtitle="Manage prescriptions and pharmacy orders."
      >
        <Button asChild className="rounded-xl shadow-sm">
          <Link href="/dashboard/pharmacy/orders">
            <ShoppingCart className="mr-2 h-4 w-4" />
            View Orders
          </Link>
        </Button>
      </DashboardHero>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            description={stat.description}
            icon={stat.icon}
            variant={stat.variant}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardPanel title="Quick Actions">
          <div className="space-y-3">
            <Link
              href="/dashboard/pharmacy/pending"
              className={cn(dashboardQuickActionClass, "from-amber-500/10 to-muted/20 hover:border-amber-500/35")}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 shadow-sm">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">Pending Prescriptions</p>
                  <p className="text-sm text-muted-foreground">Review and fulfill orders</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-amber-600" />
            </Link>

            <Link
              href="/dashboard/pharmacy/inventory"
              className={cn(dashboardQuickActionClass, "from-sky-500/10 to-muted/20 hover:border-sky-500/35")}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-600 shadow-sm">
                  <Package className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">Inventory Management</p>
                  <p className="text-sm text-muted-foreground">Manage stock levels</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-sky-600" />
            </Link>

            <Link
              href="/dashboard/pharmacy/orders"
              className={cn(dashboardQuickActionClass, "from-emerald-500/10 to-muted/20 hover:border-emerald-500/35")}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 shadow-sm">
                  <ShoppingCart className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">All Orders</p>
                  <p className="text-sm text-muted-foreground">View order history</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-emerald-600" />
            </Link>
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Recent Prescriptions"
          action={
            <Button variant="ghost" size="sm" className="rounded-lg" asChild>
              <Link href="/dashboard/pharmacy/orders">View All</Link>
            </Button>
          }
        >
            {recentPrescriptions.length > 0 ? (
              <div className="space-y-2.5">
                {recentPrescriptions.map((prescription, index) => (
                  <div
                    key={`${prescription.consultationId}-${index}`}
                    className={dashboardListRowClass}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm text-foreground">
                        {prescription.patientName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {prescription.medication} - {prescription.dosage}
                      </p>
                    </div>
                    <Badge variant="secondary" className="rounded-full bg-amber-500 text-white hover:bg-amber-600">
                      Pending
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 py-10 text-center">
                <Package className="mx-auto mb-2 h-10 w-10 text-muted-foreground/45" />
                <p className="text-muted-foreground">No prescriptions yet</p>
              </div>
            )}
        </DashboardPanel>
      </div>

      {pendingPrescriptions.length > 0 && (
        <Card className="overflow-hidden rounded-2xl border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-card to-card shadow-[0_8px_32px_-16px_rgba(245,158,11,0.2)]">
          <CardContent className="p-6 sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4 sm:items-center">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 shadow-md">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {pendingPrescriptions.length} Pending Prescription{pendingPrescriptions.length !== 1 ? "s" : ""}
                  </h3>
                  <p className="text-sm text-muted-foreground">Review and fulfill pending pharmacy orders</p>
                </div>
              </div>
              <Button className="rounded-xl shadow-sm" asChild>
                <Link href="/dashboard/pharmacy/pending">
                  Review Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

