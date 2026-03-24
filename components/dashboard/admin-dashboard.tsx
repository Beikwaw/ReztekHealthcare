"use client"

import { useState } from "react"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DashboardHero } from "@/components/dashboard/dashboard-hero"
import { DashboardPanel } from "@/components/dashboard/dashboard-card"
import { StatCard } from "@/components/dashboard/stat-card"
import { useAuth } from "@/lib/auth-context"
import { usePatients, useConsultations, usePatientAuditLogs, useDeletionRequests } from "@/lib/firestore-hooks"
import { useData } from "@/lib/data-context"
import Link from "next/link"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Users,
  UserCog,
  FileText,
  Settings,
  ArrowRight,
  Activity,
  Receipt,
  Stethoscope,
  Trash2,
  Loader2,
} from "lucide-react"

export function AdminDashboard() {
  const { user, firebaseUser } = useAuth()
  const { patients, loading: patientsLoading } = usePatients()
  const { consultations, loading: consultationsLoading } = useConsultations()
  const { invoices } = useData()
  const { logs: auditLogs } = usePatientAuditLogs()
  const { requests: deletionRequests, loading: deletionRequestsLoading, refetch: refetchDeletionRequests } = useDeletionRequests("pending")
  const [approvingId, setApprovingId] = useState<string | null>(null)

  const waitingCount = patients.filter((p) => p.status === "waiting").length
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayConsultations = consultations.filter((c) => {
    if (!c.createdAt) return false
    const createdAt = c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt)
    return createdAt >= today
  })

  const loading = patientsLoading || consultationsLoading

  const handleApproveDeletion = async (patientId: string, deletionRequestId: string) => {
    if (!firebaseUser) {
      toast.error("You must be signed in to approve deletions.")
      return
    }
    setApprovingId(deletionRequestId)
    try {
      const token = await firebaseUser.getIdToken()
      const res = await fetch("/api/admin/delete-patient", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ patientId, deletionRequestId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "Failed to delete patient.")
        return
      }
      toast.success("Patient deleted successfully.")
      refetchDeletionRequests()
    } catch (err) {
      console.error("Approve deletion error:", err)
      toast.error("Failed to delete patient. Please try again.")
    } finally {
      setApprovingId(null)
    }
  }

  const stats: {
    title: string
    value: number
    icon: LucideIcon
    description: string
    variant: "blue" | "amber" | "green" | "default"
  }[] = [
    {
      title: "Total Patients",
      value: patients.length,
      icon: Users,
      description: "Registered patients",
      variant: "blue",
    },
    {
      title: "Waiting Today",
      value: waitingCount,
      icon: Activity,
      description: "In queue",
      variant: "amber",
    },
    {
      title: "Consultations Today",
      value: todayConsultations.length,
      icon: Stethoscope,
      description: "Completed",
      variant: "green",
    },
    {
      title: "Invoices",
      value: invoices.length,
      icon: Receipt,
      description: "Billing records",
      variant: "default",
    },
  ]

  return (
    <div className="space-y-8">
      <DashboardHero
        title={<>Admin – {user?.name ?? "Dashboard"}</>}
        subtitle="Overview of the practice and quick links."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={loading && stat.title === "Total Patients" ? "…" : stat.value}
            description={stat.description}
            icon={stat.icon}
            variant={stat.variant}
            className={cn(
              "animate-in slide-in-from-bottom-4 duration-300 fill-mode-backwards",
              i === 0 && "delay-0",
              i === 1 && "delay-75",
              i === 2 && "delay-100",
              i === 3 && "delay-150",
            )}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardPanel title="Quick Actions" contentClassName="space-y-3">
            <Link
              href="/admin/leads"
              className="flex items-center justify-between p-4 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Quote Requests</p>
                  <p className="text-sm text-muted-foreground">View all quotes captured via get-quote</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>

            <Link
              href="/admin/demo-requests"
              className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Demo Requests</p>
                  <p className="text-sm text-muted-foreground">Review in-person demo bookings</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
            </Link>

            <Link
              href="/dashboard/staff"
              className="flex items-center justify-between p-4 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                  <UserCog className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Staff</p>
                  <p className="text-sm text-muted-foreground">Manage staff and roles</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>

            <Link
              href="/dashboard/patients"
              className="flex items-center justify-between p-4 rounded-xl bg-blue-500/5 hover:bg-blue-500/10 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Patients</p>
                  <p className="text-sm text-muted-foreground">View all patients</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-blue-500 transition-colors" />
            </Link>

            <Link
              href="/dashboard/settings"
              className="flex items-center justify-between rounded-xl border border-border/50 bg-gradient-to-br from-muted/80 to-muted/40 p-4 shadow-sm transition-all hover:border-border hover:shadow-md group"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted-foreground/15">
                  <Settings className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Settings</p>
                  <p className="text-sm text-muted-foreground">Practice and app settings</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-foreground" />
            </Link>
        </DashboardPanel>

        <DashboardPanel title="Reports" contentClassName="space-y-3">
            <Link
              href="/dashboard/reports"
              className="flex items-center justify-between rounded-xl border border-border/50 bg-gradient-to-br from-primary/8 to-muted/30 p-4 shadow-sm transition-all hover:border-primary/25 hover:shadow-md group"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary shadow-sm">
                  <FileText className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Reports</p>
                  <p className="text-sm text-muted-foreground">View and export reports</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
            </Link>
        </DashboardPanel>

        <DashboardPanel title="Deletion requests">
            {deletionRequestsLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : deletionRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending deletion requests.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {deletionRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/25 p-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{req.patientName || req.patientId}</p>
                      <p className="text-xs text-muted-foreground">
                        Requested by {req.requestedByName}{" "}
                        {req.createdAt instanceof Date
                          ? req.createdAt.toLocaleString("en-ZA")
                          : new Date(req.createdAt).toLocaleString("en-ZA")}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="shrink-0 rounded-lg"
                      disabled={approvingId !== null}
                      onClick={() => handleApproveDeletion(req.patientId, req.id)}
                    >
                      {approvingId === req.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-1" />
                          Approve & delete
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
        </DashboardPanel>

        <DashboardPanel title="Patient Activity (deletions & status)" contentClassName="space-y-3">
            {auditLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No patient activity logged yet.
              </p>
            ) : (
              <div className="max-h-80 space-y-2 overflow-y-auto rounded-xl border border-border/40 bg-muted/15 p-2">
                {auditLogs.slice(0, 10).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-transparent px-2 py-2 transition-colors hover:border-border/60 hover:bg-background/80"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">
                        {log.action === "delete" ? "Patient deleted" : "Status change"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Patient: {log.patientName || log.patientId}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        By: {log.performedByName} ({log.performedByRole})
                      </p>
                      {log.action === "status-change" && (
                        <p className="text-xs text-muted-foreground">
                          {log.fromStatus ?? "unknown"} → {log.toStatus ?? "unknown"}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {log.createdAt instanceof Date
                        ? log.createdAt.toLocaleString("en-ZA")
                        : new Date(log.createdAt).toLocaleString("en-ZA")}
                    </div>
                  </div>
                ))}
              </div>
            )}
        </DashboardPanel>
      </div>
    </div>
  )
}
