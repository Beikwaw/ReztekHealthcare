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
import { usePatients, useConsultations } from "@/lib/firestore-hooks"
import Link from "next/link"
import {
  Users,
  Stethoscope,
  Clock,
  ArrowRight,
  Activity,
  FileText,
  Brain,
} from "lucide-react"

export function DoctorDashboard() {
  const { user } = useAuth()
  const { patients, loading: patientsLoading } = usePatients()
  const { consultations, loading: consultationsLoading } = useConsultations()
  
  // Get waiting patients
  const waitingPatients = patients.filter(p => p.status === "waiting")
  
  // Get in-consultation patients
  const inConsultation = patients.filter(p => p.status === "in-consultation")
  
  // Get today's consultations
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStart = today
  const todayConsultations = consultations.filter((c) => {
    if (!c.createdAt) return false
    const createdAt = c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt)
    return createdAt >= todayStart
  })

  const stats: {
    title: string
    value: number
    icon: LucideIcon
    description: string
    variant: "amber" | "blue" | "green" | "default"
  }[] = [
    {
      title: "Waiting Patients",
      value: waitingPatients.length,
      icon: Clock,
      description: "Patients in queue",
      variant: "amber",
    },
    {
      title: "In Consultation",
      value: inConsultation.length,
      icon: Stethoscope,
      description: "Currently seeing",
      variant: "blue",
    },
    {
      title: "Today's Consultations",
      value: todayConsultations.length,
      icon: FileText,
      description: "Completed today",
      variant: "green",
    },
    {
      title: "Total Patients",
      value: patients.length,
      icon: Users,
      description: "In the system",
      variant: "default",
    },
  ]

  const loading = patientsLoading || consultationsLoading

  return (
    <div className="space-y-8">
      <DashboardHero
        title={<>Welcome back, Dr. {user?.name?.split(" ").pop()}</>}
        subtitle="Here's your patient overview for today."
      >
        <Button asChild className="rounded-xl shadow-sm">
          <Link href="/dashboard/waiting">
            <Users className="mr-2 h-4 w-4" />
            View Waiting List ({waitingPatients.length})
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
              href="/dashboard/waiting"
              className={cn(dashboardQuickActionClass, "from-amber-500/10 to-muted/20 hover:border-amber-500/35")}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 shadow-sm">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">Next Patient</p>
                  <p className="text-sm text-muted-foreground">See next patient in queue</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-amber-600" />
            </Link>

            <Link
              href="/dashboard/consultations"
              className={cn(dashboardQuickActionClass, "from-primary/8 to-muted/20 hover:border-primary/35")}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary shadow-sm">
                  <FileText className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">View Consultations</p>
                  <p className="text-sm text-muted-foreground">Review past consultations</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
            </Link>

            <Link
              href="/dashboard/patients"
              className={cn(dashboardQuickActionClass, "from-sky-500/10 to-muted/20 hover:border-sky-500/35")}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-600 shadow-sm">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">All Patients</p>
                  <p className="text-sm text-muted-foreground">View patient records</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-sky-600" />
            </Link>
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Waiting Patients"
          action={
            <Button variant="ghost" size="sm" className="rounded-lg" asChild>
              <Link href="/dashboard/waiting">View All</Link>
            </Button>
          }
        >
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Activity className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : waitingPatients.length > 0 ? (
              <div className="space-y-2.5">
                {waitingPatients.slice(0, 4).map((patient, index) => (
                  <div
                    key={patient.id}
                    className={cn(dashboardListRowClass, "gap-3")}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 ring-1 ring-amber-200/80">
                        <span className="text-sm font-semibold text-amber-800">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">
                          {patient.name || "Unknown Patient"}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {patient.patientNumber ? `ID: ${patient.patientNumber}` : "General consultation"}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="shrink-0 rounded-lg" asChild>
                      <Link href={`/dashboard/consultations/new?patient=${patient.id}`}>
                        Start Consultation
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 py-10 text-center">
                <Clock className="mx-auto mb-2 h-10 w-10 text-muted-foreground/45" />
                <p className="text-muted-foreground">No patients waiting</p>
              </div>
            )}
        </DashboardPanel>
      </div>

      <Card className="overflow-hidden rounded-2xl border-primary/25 bg-gradient-to-br from-primary/8 via-card to-card shadow-[0_8px_32px_-16px_rgba(15,23,42,0.12)]">
        <CardContent className="p-6 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4 sm:items-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary shadow-md">
                <Brain className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">AI-Powered Consultations</h3>
                <p className="text-sm text-muted-foreground">
                  Get AI-generated summaries and treatment suggestions during consultations
                </p>
              </div>
            </div>
            <Badge className="w-fit rounded-full bg-primary/15 px-3 py-1 text-primary hover:bg-primary/25">Available</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
