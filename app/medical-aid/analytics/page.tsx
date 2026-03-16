"use client"

import { useMemo, useState } from "react"
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from "date-fns"
import { useMedicalAidClaims } from "@/lib/firestore-hooks"
import type { MedicalAidClaim } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { BarChart3, FileText, DollarSign, PieChart as PieChartIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts"

const statusOrder = ["SUBMITTED", "PAID", "PARTIALLY_PAID", "REJECTED"] as const
const statusLabel: Record<string, string> = {
  SUBMITTED: "Submitted",
  PAID: "Paid",
  PARTIALLY_PAID: "Partially paid",
  REJECTED: "Rejected",
}

const statusChartConfig: ChartConfig = {
  SUBMITTED: { label: "Submitted", theme: { light: "oklch(0.94 0.035 240)", dark: "oklch(0.7 0.06 240)" } },
  PAID: { label: "Paid", theme: { light: "oklch(0.6 0.18 145)", dark: "oklch(0.55 0.16 145)" } },
  PARTIALLY_PAID: { label: "Partially paid", theme: { light: "oklch(0.75 0.18 85)", dark: "oklch(0.7 0.16 85)" } },
  REJECTED: { label: "Rejected", theme: { light: "oklch(0.55 0.22 25)", dark: "oklch(0.5 0.2 25)" } },
}

const schemeChartColors = [
  "oklch(0.63 0.13 185)",
  "oklch(0.22 0.05 260)",
  "oklch(0.94 0.035 240)",
  "oklch(0.55 0.12 200)",
  "oklch(0.7 0.1 160)",
]

export default function MedicalAidAnalyticsPage() {
  const { claims, loading, error } = useMedicalAidClaims()
  const [period, setPeriod] = useState<"month" | "quarter" | "year">("year")

  const { byStatus, byScheme, byMonth, totals } = useMemo(() => {
    const list: MedicalAidClaim[] = Array.isArray(claims) ? claims : []
    const now = new Date()
    const range =
      period === "year"
        ? { from: startOfYear(now), to: endOfYear(now) }
        : period === "quarter"
          ? {
              from: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1),
              to: endOfMonth(new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 2, 1)),
            }
          : { from: startOfMonth(now), to: endOfMonth(now) }

    const inRange = list.filter((c) => {
      const d = c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt as any)
      return isWithinInterval(d, { start: range.from, end: range.to })
    })

    const byStatusMap = new Map<string, number>()
    statusOrder.forEach((s) => byStatusMap.set(s, 0))
    inRange.forEach((c) => {
      const s = c.status ?? "SUBMITTED"
      byStatusMap.set(s, (byStatusMap.get(s) ?? 0) + 1)
    })
    const byStatus = statusOrder.map((key) => ({ name: key, value: byStatusMap.get(key) ?? 0, label: statusLabel[key] }))

    const schemeMap = new Map<string, number>()
    inRange.forEach((c) => {
      const name = c.schemeName?.trim() || "Unknown"
      schemeMap.set(name, (schemeMap.get(name) ?? 0) + 1)
    })
    const byScheme = Array.from(schemeMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)

    const monthMap = new Map<string, { billed: number; paid: number; count: number }>()
    inRange.forEach((c) => {
      const d = c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt as any)
      const key = format(d, "MMM yyyy")
      const current = monthMap.get(key) ?? { billed: 0, paid: 0, count: 0 }
      current.billed += Number(c.billAmount ?? c.totalAmountClaimed ?? 0)
      current.paid += typeof c.paidAmount === "number" ? c.paidAmount : 0
      current.count += 1
      monthMap.set(key, current)
    })
    const monthLabels: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 }
    const sortedMonths = Array.from(monthMap.entries()).sort((a, b) => {
      const [aMm, aYyyy] = a[0].split(" ")
      const [bMm, bYyyy] = b[0].split(" ")
      return new Date(parseInt(aYyyy, 10), monthLabels[aMm] ?? 0).getTime() - new Date(parseInt(bYyyy, 10), monthLabels[bMm] ?? 0).getTime()
    })
    const byMonthSorted = sortedMonths.map(([label, v]) => ({ label, ...v }))

    const totalBilled = inRange.reduce((sum, c) => sum + Number(c.billAmount ?? c.totalAmountClaimed ?? 0), 0)
    const totalPaid = inRange.reduce((sum, c) => sum + (typeof c.paidAmount === "number" ? c.paidAmount : 0), 0)

    return {
      byStatus,
      byScheme,
      byMonth: byMonthSorted,
      totals: { claims: inRange.length, billed: totalBilled, paid: totalPaid },
    }
  }, [claims, period])

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-accent" />
            Analytics
          </h1>
          <p className="text-muted-foreground">Claims volume, status and amounts by period.</p>
        </div>
        <Select value={period} onValueChange={(v: "month" | "quarter" | "year") => setPeriod(v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">This month</SelectItem>
            <SelectItem value="quarter">This quarter</SelectItem>
            <SelectItem value="year">This year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error.message}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className={cn("shadow-[var(--shadow-card)] border-border")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Claims in period</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "…" : totals.claims}</div>
          </CardContent>
        </Card>
        <Card className={cn("shadow-[var(--shadow-card)] border-border")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total billed</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R {loading ? "…" : totals.billed.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className={cn("shadow-[var(--shadow-card)] border-border")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total paid</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R {loading ? "…" : totals.paid.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className={cn("shadow-[var(--shadow-card)] border-border")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" />
              Claims by status
            </CardTitle>
            <CardDescription>Distribution for selected period.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">Loading…</div>
            ) : byStatus.every((s) => s.value === 0) ? (
              <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">No data for this period.</div>
            ) : (
              <ChartContainer config={statusChartConfig} className="h-64 w-full">
                <RechartsPieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={byStatus.filter((s) => s.value > 0)}
                    dataKey="value"
                    nameKey="label"
                    outerRadius="80%"
                    innerRadius="50%"
                    paddingAngle={2}
                  >
                    {byStatus.filter((s) => s.value > 0).map((entry, i) => (
                      <Cell key={entry.name} fill={`var(--color-${entry.name})`} />
                    ))}
                  </Pie>
                </RechartsPieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className={cn("shadow-[var(--shadow-card)] border-border")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">Claims by scheme</CardTitle>
            <CardDescription>Top schemes by claim count (selected period).</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">Loading…</div>
            ) : byScheme.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">No data for this period.</div>
            ) : (
              <ChartContainer config={{}} className="h-64 w-full">
                <RechartsBarChart data={byScheme} layout="vertical" margin={{ left: 12, right: 12 }} width={undefined} height={undefined}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" width={90} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" name="Claims" radius={[0, 4, 4, 0]} fill={schemeChartColors[0]} />
                </RechartsBarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className={cn("shadow-[var(--shadow-card)] border-border")}>
        <CardHeader>
          <CardTitle>Billed vs paid over time</CardTitle>
          <CardDescription>Monthly totals for the selected period.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">Loading…</div>
          ) : byMonth.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">No data for this period.</div>
          ) : (
            <ChartContainer
              config={{
                billed: { label: "Billed", theme: { light: "oklch(0.63 0.13 185)", dark: "oklch(0.6 0.14 185)" } },
                paid: { label: "Paid", theme: { light: "oklch(0.6 0.18 145)", dark: "oklch(0.55 0.16 145)" } },
              }}
              className="h-72 w-full"
            >
              <RechartsBarChart data={byMonth} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `R ${(v / 1000).toFixed(0)}k`} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => `R ${Number(value).toLocaleString()}`} />} />
                <Bar dataKey="billed" fill="var(--color-billed)" radius={[4, 4, 0, 0]} name="Billed" />
                <Bar dataKey="paid" fill="var(--color-paid)" radius={[4, 4, 0, 0]} name="Paid" />
              </RechartsBarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
