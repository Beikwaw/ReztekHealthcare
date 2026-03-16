'use client'

import { useMemo } from "react"
import { useAuth } from "@/lib/auth-context"
import { usePatientAuditLogs, useBillingAuditLogs } from "@/lib/firestore-hooks"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Loader2, Activity, FileText } from "lucide-react"

export default function AuditLogsPage() {
  const { user } = useAuth()
  const { logs: patientLogs, loading: patientLoading } = usePatientAuditLogs()
  const { logs: billingLogs, loading: billingLoading } = useBillingAuditLogs()

  const loading = patientLoading || billingLoading

  const sortedPatientLogs = useMemo(
    () => [...patientLogs].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
    [patientLogs]
  )

  const sortedBillingLogs = useMemo(
    () => [...billingLogs].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
    [billingLogs]
  )

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Only administrators can view the full audit logs.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground">
          Detailed history of patient edits and billing changes for compliance and oversight.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="patients" className="space-y-4">
          <TabsList>
            <TabsTrigger value="patients" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Patient Edits
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Billing Changes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="patients" className="space-y-4">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Patient Edit & Activity Logs</CardTitle>
                <CardDescription>Edits, deletions, and status changes for patient records.</CardDescription>
              </CardHeader>
              <CardContent>
                {sortedPatientLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">No patient audit logs recorded yet.</p>
                ) : (
                  <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1">
                    {sortedPatientLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start justify-between gap-3 border-b border-border/40 pb-3 last:border-0 last:pb-0"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Badge variant="outline" className="uppercase text-[10px] tracking-wide">
                              {log.action}
                            </Badge>
                            <span className="truncate">
                              {log.action === "delete"
                                ? "Patient deleted"
                                : log.action === "status-change"
                                ? "Status change"
                                : "Details edited"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            Patient: {log.patientName || log.patientId}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            By: {log.performedByName} ({log.performedByRole})
                          </p>
                          {log.action === "status-change" && (
                            <p className="text-xs text-muted-foreground">
                              {log.fromStatus ?? "—"} → {log.toStatus ?? "—"}
                            </p>
                          )}
                          {log.action === "edit" && log.changedFields && log.changedFields.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Changed fields: {log.changedFields.join(", ")}
                            </p>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground text-right whitespace-nowrap shrink-0">
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
          </TabsContent>

          <TabsContent value="billing" className="space-y-4">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Billing Audit Logs</CardTitle>
                <CardDescription>
                  Changes to invoices, totals, and other billing information across the system.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sortedBillingLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">No billing audit logs recorded yet.</p>
                ) : (
                  <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1">
                    {sortedBillingLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start justify-between gap-3 border-b border-border/40 pb-3 last:border-0 last:pb-0"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Badge variant="outline" className="uppercase text-[10px] tracking-wide">
                              BILLING
                            </Badge>
                            <span className="truncate">Invoice {String(log.invoiceId).toUpperCase()}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            Patient: {log.patientName || log.patientId || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            By: {log.performedByName} ({log.performedByRole})
                          </p>
                          {log.changedFields && log.changedFields.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Changed fields: {log.changedFields.join(", ")}
                            </p>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground text-right whitespace-nowrap shrink-0">
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
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

