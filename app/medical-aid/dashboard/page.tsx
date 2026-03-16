"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useMedicalAidClaims } from "@/lib/firestore-hooks"
import type { MedicalAidClaim } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, CheckCircle, Clock, XCircle, AlertCircle, ArrowRight, FileEdit } from "lucide-react"
import { cn } from "@/lib/utils"

const statusLabels: Record<string, string> = {
  SUBMITTED: "Submitted",
  PAID: "Paid",
  PARTIALLY_PAID: "Partially paid",
  REJECTED: "Rejected",
}

export default function MedicalAidDashboardPage() {
  const { claims, loading, error } = useMedicalAidClaims()

  const stats = useMemo(() => {
    const list: MedicalAidClaim[] = Array.isArray(claims) ? claims : []
    const base = list.filter((c) => (c.status ?? "SUBMITTED") !== "DRAFT")
    const inProgress = base.filter((c) => !c.outcomeRecordedAt)
    const completed = base.filter((c) => !!c.outcomeRecordedAt)
    const submitted = base.filter((c) => (c.status ?? "SUBMITTED") === "SUBMITTED")
    const paid = base.filter((c) => c.status === "PAID")
    const partiallyPaid = base.filter((c) => c.status === "PARTIALLY_PAID")
    const rejected = base.filter((c) => c.status === "REJECTED")
    const totalBilled = base.reduce((sum, c) => sum + Number(c.billAmount ?? c.totalAmountClaimed ?? 0), 0)
    const totalPaid = base.reduce((sum, c) => sum + (typeof c.paidAmount === "number" ? c.paidAmount : 0), 0)

    return {
      total: base.length,
      inProgress: inProgress.length,
      completed: completed.length,
      submitted: submitted.length,
      paid: paid.length,
      partiallyPaid: partiallyPaid.length,
      rejected: rejected.length,
      totalBilled,
      totalPaid,
    }
  }, [claims])

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Overview of medical aid claims and processing.</p>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error.message}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className={cn("shadow-[var(--shadow-card)] border-border")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
            <FileEdit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "…" : stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">Claims being reviewed or edited</p>
          </CardContent>
        </Card>

        <Card className={cn("shadow-[var(--shadow-card)] border-border")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "…" : stats.completed}</div>
            <p className="text-xs text-muted-foreground">Paid amount recorded & emailed</p>
          </CardContent>
        </Card>

        <Card className={cn("shadow-[var(--shadow-card)] border-border")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Awaiting outcome</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "…" : stats.submitted}</div>
            <p className="text-xs text-muted-foreground">{statusLabels.SUBMITTED}</p>
          </CardContent>
        </Card>

        <Card className={cn("shadow-[var(--shadow-card)] border-border")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "…" : stats.paid + stats.partiallyPaid}</div>
            <p className="text-xs text-muted-foreground">Paid + Partially paid</p>
          </CardContent>
        </Card>

        <Card className={cn("shadow-[var(--shadow-card)] border-border")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "…" : stats.rejected}</div>
            <p className="text-xs text-muted-foreground">{statusLabels.REJECTED}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className={cn("shadow-[var(--shadow-card)] border-border")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total billed</CardTitle>
            <span className="text-lg font-bold text-muted-foreground">R</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R {loading ? "…" : stats.totalBilled.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Sum of all claim amounts</p>
          </CardContent>
        </Card>

        <Card className={cn("shadow-[var(--shadow-card)] border-border")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total paid by schemes</CardTitle>
            <span className="text-lg font-bold text-muted-foreground">R</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R {loading ? "…" : stats.totalPaid.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Amounts received from medical aids</p>
          </CardContent>
        </Card>
      </div>

      <Card className={cn("shadow-[var(--shadow-card)] border-border")}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Quick actions
          </CardTitle>
          <CardDescription>Process claims and view analytics.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/medical-aid/claims?tab=in-progress" className="inline-flex items-center gap-2">
              In Progress claims
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/medical-aid/claims?tab=completed" className="inline-flex items-center gap-2">
              Completed claims
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/medical-aid/analytics" className="inline-flex items-center gap-2">
              Analytics & charts
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
