"use client"

import { useMemo, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { usePatientAuditLogs, useAuthAuditLogs } from "@/lib/firestore-hooks"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Activity, Loader2, Shield, Trash2, RefreshCw } from "lucide-react"

type PatientActivityFilter = "all" | "delete" | "status-change"

export default function PatientActivityPage() {
  const { user } = useAuth()
  const { logs: patientLogs, loading: patientLoading, refetch: refetchPatient } = usePatientAuditLogs()
  const { logs: authLogs, loading: authLoading, refetch: refetchAuth } = useAuthAuditLogs()
  const [patientFilter, setPatientFilter] = useState<PatientActivityFilter>("all")

  const filteredPatientLogs = useMemo(() => {
    if (patientFilter === "all") return patientLogs
    return patientLogs.filter((log) => log.action === patientFilter)
  }, [patientLogs, patientFilter])

  const loading = patientLoading || authLoading

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Only administrators can view patient activity and audit logs.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Patient Activity & Audit</h1>
          <p className="text-muted-foreground">Patient changes and security audit (login/logout)</p>
        </div>
        <button
          type="button"
          onClick={() => {
            refetchPatient()
            refetchAuth()
          }}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Patient activity – scrollable + filter */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Patient Activity (deletions & status)
            </CardTitle>
            <CardDescription>Filter by action type</CardDescription>
          </div>
          <Select value={patientFilter} onValueChange={(v) => setPatientFilter(v as PatientActivityFilter)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="delete">Deleted</SelectItem>
              <SelectItem value="status-change">Status change</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPatientLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">No patient activity for this filter.</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {filteredPatientLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between gap-3 border-b border-border/40 py-3 last:border-0"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-sm font-medium flex items-center gap-2">
                      {log.action === "delete" ? (
                        <>
                          <Trash2 className="h-4 w-4 text-destructive shrink-0" />
                          Patient deleted
                        </>
                      ) : (
                        "Status change"
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">Patient: {log.patientName || log.patientId}</p>
                    <p className="text-xs text-muted-foreground">
                      By: {log.performedByName} ({log.performedByRole})
                    </p>
                    {log.action === "status-change" && (
                      <p className="text-xs text-muted-foreground">
                        {log.fromStatus ?? "—"} → {log.toStatus ?? "—"}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
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

      {/* Security audit – login/logout */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security audit (login / logout)
          </CardTitle>
          <CardDescription>Who signed in or signed out and when</CardDescription>
        </CardHeader>
        <CardContent>
          {authLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : authLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">No auth events recorded yet.</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {authLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between gap-3 border-b border-border/40 py-3 last:border-0"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-sm font-medium">
                      {log.action === "login" ? "Signed in" : "Signed out"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.userName || log.userEmail || log.userId}
                      {log.userEmail && log.userName !== log.userEmail && ` (${log.userEmail})`}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
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
  )
}
