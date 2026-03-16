"use client"

import { useMemo, useState } from "react"
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from "date-fns"
import type { DateRange } from "react-day-picker"
import { useAuth } from "@/lib/auth-context"
import { usePatients, useAppointments, useConsultations } from "@/lib/firestore-hooks"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { CalendarIcon, BarChart3, Users, Activity, Stethoscope } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Appointment, Consultation, Patient } from "@/lib/types"
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Line,
  LineChart as RechartsLineChart,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts"

type PeriodPreset = "today" | "week" | "month" | "year" | "custom"
type PaymentFilter = "all" | "cash" | "medical-aid"
type ConsultTypeFilter = "all" | "new" | "follow-up" | "continuation"

function getPresetRange(preset: PeriodPreset): DateRange {
  const now = new Date()
  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) }
    case "week": {
      const from = startOfWeek(now, { weekStartsOn: 1 })
      const to = endOfWeek(now, { weekStartsOn: 1 })
      return { from, to }
    }
    case "month": {
      const from = startOfMonth(now)
      const to = endOfMonth(now)
      return { from, to }
    }
    case "year": {
      const from = startOfYear(now)
      const to = endOfYear(now)
      return { from, to }
    }
    case "custom":
    default:
      return { from: startOfMonth(now), to: endOfDay(now) }
  }
}

function isWithinRange(date: Date, range: DateRange | undefined): boolean {
  if (!range?.from || !range.to) return true
  return isWithinInterval(date, { start: range.from, end: range.to })
}

function classifyConsultType(consultation: Consultation, appointments: Appointment[]): ConsultTypeFilter {
  if (!consultation.appointmentId) return "continuation"
  const apt = appointments.find((a) => a.id === consultation.appointmentId)
  if (!apt) return "continuation"
  if (apt.type === "follow-up") return "follow-up"
  if (apt.type === "consultation") return "new"
  return "continuation"
}

const mainBarChartConfig: ChartConfig = {
  cash: {
    label: "Cash patients",
    theme: {
      light: "oklch(0.63 0.13 185)",
      dark: "oklch(0.6 0.14 185)",
    },
  },
  medicalAid: {
    label: "Medical aid patients",
    theme: {
      light: "oklch(0.22 0.05 260)",
      dark: "oklch(0.5 0.08 260)",
    },
  },
}

const growthChartConfig: ChartConfig = {
  patients: {
    label: "Patients seen",
    theme: {
      light: "oklch(0.63 0.13 185)",
      dark: "oklch(0.6 0.14 185)",
    },
  },
}

const schemeChartColors = [
  "oklch(0.63 0.13 185)",
  "oklch(0.22 0.05 260)",
  "oklch(0.94 0.035 240)",
  "oklch(0.55 0.12 200)",
  "oklch(0.7 0.1 160)",
]

function getSchemeBucket(name: string | undefined): string {
  if (!name) return "No scheme"
  const normalized = name.toLowerCase()
  if (normalized.includes("government employees") || normalized.includes("gems")) return "GEMS"
  if (normalized.includes("discovery")) return "Discovery"
  if (normalized.includes("bonitas")) return "Bonitas"
  if (normalized.includes("momentum")) return "Momentum"
  return "Other schemes"
}

export function PatientAnalyticsDashboard() {
  const { user } = useAuth()
  const { patients, loading: patientsLoading } = usePatients()
  const { appointments, loading: appointmentsLoading } = useAppointments()
  const { consultations, loading: consultationsLoading } = useConsultations()

  const [preset, setPreset] = useState<PeriodPreset>("month")
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => getPresetRange("month"))
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all")
  const [consultTypeFilter, setConsultTypeFilter] = useState<ConsultTypeFilter>("all")

  const loading = patientsLoading || appointmentsLoading || consultationsLoading
  const hasAccess = user?.role === "doctor" || user?.role === "admin"

  const effectiveRange = useMemo<DateRange | undefined>(() => {
    if (preset === "custom") return dateRange
    return getPresetRange(preset)
  }, [preset, dateRange])

  const firstConsultDateByPatient = useMemo(() => {
    const map = new Map<string, Date>()
    consultations.forEach((c) => {
      const existing = map.get(c.patientId)
      if (!existing || c.createdAt < existing) {
        map.set(c.patientId, c.createdAt)
      }
    })
    return map
  }, [consultations])

  const analytics = useMemo(() => {
    if (!effectiveRange?.from || !effectiveRange.to) {
      return {
        totalPatientsSeen: 0,
        newPatients: 0,
        returningPatients: 0,
        totalAppointments: 0,
        totalConsultations: 0,
        barData: [] as Array<{ label: string; date: Date; cash: number; medicalAid: number }>,
        growthData: [] as Array<{ label: string; date: Date; patients: number }>,
        schemeData: [] as Array<{ name: string; value: number }>,
      }
    }

    const start = effectiveRange.from
    const end = effectiveRange.to

    const patientById = new Map<string, Patient>()
    patients.forEach((p) => patientById.set(p.id, p))

    const grouped = new Map<string, { date: Date; cash: number; medicalAid: number }>()
    const patientsSeenInRange = new Set<string>()

    const filteredConsultations = consultations.filter((c) => {
      const created = c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt)
      if (!isWithinRange(created, effectiveRange)) return false

      const consultKind = classifyConsultType(c, appointments)
      if (consultTypeFilter !== "all" && consultKind !== consultTypeFilter) return false

      const patient = patientById.get(c.patientId)
      const method = patient?.paymentMethod || (patient?.medicalAidInfo?.name ? "medical-aid" : "cash")
      if (paymentFilter === "cash" && method !== "cash") return false
      if (paymentFilter === "medical-aid" && method !== "medical-aid") return false

      const key =
        preset === "year"
          ? format(created, "MMM")
          : format(created, "dd MMM")

      const bucket = grouped.get(key) || { date: created, cash: 0, medicalAid: 0 }
      if (method === "medical-aid") {
        bucket.medicalAid += 1
      } else {
        bucket.cash += 1
      }
      grouped.set(key, bucket)

      patientsSeenInRange.add(c.patientId)
      return true
    })

    const barData = Array.from(grouped.entries())
      .sort((a, b) => a[1].date.getTime() - b[1].date.getTime())
      .map(([label, value]) => ({ label, ...value }))

    const growthData = barData.reduce<Array<{ label: string; date: Date; patients: number }>>((acc, item, index) => {
      const previous = index > 0 ? acc[index - 1].patients : 0
      const totalForDay = item.cash + item.medicalAid
      acc.push({ label: item.label, date: item.date, patients: previous + totalForDay })
      return acc
    }, [])

    const totalConsultations = filteredConsultations.length
    const totalAppointments = appointments.filter((a) =>
      isWithinRange(a.date instanceof Date ? a.date : new Date(a.date), effectiveRange),
    ).length
    const totalPatientsSeen = patientsSeenInRange.size

    let newPatients = 0
    patientsSeenInRange.forEach((patientId) => {
      const first = firstConsultDateByPatient.get(patientId)
      if (first && isWithinInterval(first, { start, end })) {
        newPatients += 1
      }
    })
    const returningPatients = Math.max(0, totalPatientsSeen - newPatients)

    const schemeCounts = new Map<string, number>()
    filteredConsultations.forEach((c) => {
      const patient = patientById.get(c.patientId)
      const method = patient?.paymentMethod || (patient?.medicalAidInfo?.name ? "medical-aid" : "cash")
      if (method !== "medical-aid") return
      const bucketName = getSchemeBucket(patient?.medicalAidInfo?.name)
      schemeCounts.set(bucketName, (schemeCounts.get(bucketName) || 0) + 1)
    })

    const schemeData = Array.from(schemeCounts.entries()).map(([name, value]) => ({ name, value }))

    return {
      totalPatientsSeen,
      newPatients,
      returningPatients,
      totalAppointments,
      totalConsultations,
      barData,
      growthData,
      schemeData,
    }
  }, [
    effectiveRange,
    patients,
    consultations,
    appointments,
    paymentFilter,
    consultTypeFilter,
    firstConsultDateByPatient,
    preset,
  ])

  return (
    <div className="space-y-6">
      {!hasAccess ? (
        <div className="flex items-center justify-center h-96">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Access restricted</CardTitle>
              <CardDescription>
                Only doctors and administrators can view the patient analytics dashboard.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      ) : (
        <>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Patient Analytics Dashboard – Reztek Healthcare Practice
          </h1>
          <p className="text-muted-foreground">
            Non-financial analytics focusing on patient volume, activity and scheme distribution.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-md border bg-background p-1">
            {[
              { id: "today", label: "Today" },
              { id: "week", label: "This week" },
              { id: "month", label: "This month" },
              { id: "year", label: "This year" },
            ].map((item) => (
              <Button
                key={item.id}
                variant={preset === item.id ? "default" : "ghost"}
                size="sm"
                className="px-2 text-xs"
                onClick={() => {
                  const p = item.id as PeriodPreset
                  setPreset(p)
                  if (p !== "custom") {
                    setDateRange(getPresetRange(p))
                  }
                }}
              >
                {item.label}
              </Button>
            ))}
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={preset === "custom" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setPreset("custom")
                  if (!dateRange) {
                    setDateRange(getPresetRange("month"))
                  }
                }}
                className="justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {effectiveRange?.from && effectiveRange?.to ? (
                  <>
                    {format(effectiveRange.from, "dd MMM yyyy")} –{" "}
                    {format(effectiveRange.to, "dd MMM yyyy")}
                  </>
                ) : (
                  <span>Custom range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                numberOfMonths={2}
                selected={dateRange}
                onSelect={setDateRange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total patients seen</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalPatientsSeen}</div>
            <p className="text-xs text-muted-foreground">In the selected period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New patients</CardTitle>
            <Badge variant="secondary" className="text-xs">
              First visit
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.newPatients}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Returning patients</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.returningPatients}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total appointments</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalAppointments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total consultations</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalConsultations}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Filters
          </CardTitle>
          <CardDescription>Refine the analytics view. Only non-financial data is shown.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Payment type</span>
            <Select value={paymentFilter} onValueChange={(v: PaymentFilter) => setPaymentFilter(v)}>
              <SelectTrigger>
                <SelectValue placeholder="All payment types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="medical-aid">Medical aid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Consultation type</span>
            <Select
              value={consultTypeFilter}
              onValueChange={(v: ConsultTypeFilter) => setConsultTypeFilter(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All consultation types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="follow-up">Follow-up</SelectItem>
                <SelectItem value="continuation">Appointment continuation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Status</span>
            <p className="text-xs text-muted-foreground">
              Financial or income data is intentionally excluded from this view.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Patients seen – cash vs medical aid</CardTitle>
            <CardDescription>
              Split by payment method for the selected period. Bars are grouped by day (or month for yearly view).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">
                Loading analytics…
              </div>
            ) : analytics.barData.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">
                No consultations found for this period.
              </div>
            ) : (
              <ChartContainer config={mainBarChartConfig} className="w-full">
                <RechartsBarChart data={analytics.barData} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="cash" stackId="patients" fill="var(--color-cash)" radius={[4, 4, 0, 0]} />
                  <Bar
                    dataKey="medicalAid"
                    stackId="patients"
                    fill="var(--color-medicalAid)"
                    radius={[4, 4, 0, 0]}
                  />
                </RechartsBarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Patient growth trend</CardTitle>
            <CardDescription>Cumulative patient visits over the selected period.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">
                Loading trend…
              </div>
            ) : analytics.growthData.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">
                No data available.
              </div>
            ) : (
              <ChartContainer config={growthChartConfig} className="w-full">
                <RechartsLineChart data={analytics.growthData} margin={{ left: 4, right: 12 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="patients"
                    stroke="var(--color-patients)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </RechartsLineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Medical aid scheme distribution</CardTitle>
          <CardDescription>
            Percentage of medical-aid consultations per scheme for the selected period.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 md:flex-row md:items-center">
          {loading ? (
            <div className="flex h-64 flex-1 items-center justify-center text-muted-foreground text-sm">
              Loading scheme data…
            </div>
          ) : analytics.schemeData.length === 0 ? (
            <div className="flex h-64 flex-1 items-center justify-center text-muted-foreground text-sm">
              No medical-aid consultations found in this period.
            </div>
          ) : (
            <>
              <div className="flex-1">
                <ChartContainer config={{}} className={cn("w-full max-w-xs mx-auto", "aspect-square")}>
                  <RechartsPieChart>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          hideLabel
                          formatter={(value, name) => (
                            <div className="flex w-full items-center justify-between gap-4">
                              <span className="text-muted-foreground">{String(name)}</span>
                              <span className="font-mono font-medium tabular-nums">
                                {Number(value).toLocaleString()}
                              </span>
                            </div>
                          )}
                        />
                      }
                    />
                    <Pie
                      data={analytics.schemeData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius="80%"
                      innerRadius="50%"
                      paddingAngle={3}
                    >
                      {analytics.schemeData.map((_, index) => (
                        <Cell key={index} fill={schemeChartColors[index % schemeChartColors.length]} />
                      ))}
                    </Pie>
                  </RechartsPieChart>
                </ChartContainer>
              </div>
              <div className="flex-1 space-y-2">
                {analytics.schemeData.map((item, index) => {
                  const total = analytics.schemeData.reduce((sum, s) => sum + s.value, 0)
                  const percent = total > 0 ? Math.round((item.value / total) * 100) : 0
                  return (
                    <div key={item.name} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: schemeChartColors[index % schemeChartColors.length] }}
                        />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {item.value} ({percent}%)
                      </span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
      )}
    </div>
  )
}
