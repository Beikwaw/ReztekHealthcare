"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
  const { appointments, invoices } = useData()
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

  const stats = [
    {
      title: "Total Patients",
      value: patients.length,
      icon: Users,
      color: "bg-blue-500",
      description: "Registered patients",
    },
    {
      title: "Waiting Today",
      value: waitingCount,
      icon: Activity,
      color: "bg-amber-500",
      description: "In queue",
    },
    {
      title: "Consultations Today",
      value: todayConsultations.length,
      icon: Stethoscope,
      color: "bg-emerald-500",
      description: "Completed",
    },
    {
      title: "Invoices",
      value: invoices.length,
      icon: Receipt,
      color: "bg-primary",
      description: "Billing records",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Admin – {user?.name ?? "Dashboard"}
          </h1>
          <p className="text-muted-foreground">
            Overview of the practice and quick links.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card
            key={stat.title}
            className={cn(
              "border-border shadow-[var(--shadow-card)] animate-in slide-in-from-bottom-4 duration-300 fill-mode-backwards",
              i === 0 && "delay-0",
              i === 1 && "delay-75",
              i === 2 && "delay-100",
              i === 3 && "delay-150",
            )}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold text-foreground">
                    {loading && stat.title === "Total Patients" ? "…" : stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
              className="flex items-center justify-between p-4 rounded-xl bg-muted hover:bg-muted/80 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-muted-foreground/20 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Settings</p>
                  <p className="text-sm text-muted-foreground">Practice and app settings</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/dashboard/reports"
              className="flex items-center justify-between p-4 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Reports</p>
                  <p className="text-sm text-muted-foreground">View and export reports</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Deletion requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {deletionRequestsLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : deletionRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending deletion requests.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {deletionRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3"
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
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Patient Activity (deletions & status)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {auditLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No patient activity logged yet.
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {auditLogs.slice(0, 10).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start justify-between gap-3 border-b border-border/40 pb-2 last:border-0 last:pb-0"
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
