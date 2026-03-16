"use client"

import { useMemo, useState, type ChangeEvent } from "react"
import type { DateRange } from "react-day-picker"
import { format, isWithinInterval } from "date-fns"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { useAuth } from "@/lib/auth-context"
import { useMedicalAidClaims, useInvoices, usePatients } from "@/lib/firestore-hooks"
import type { MedicalAidClaim, Invoice, Patient } from "@/lib/types"
import { generateMedicalAidBillingReportPdf, type MedicalAidBillingReportRow, type MedicalAidBillingReportTotals } from "@/lib/medical-aid-billing-report-pdf"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { FileText, Phone, Search, Filter, Download, CalendarIcon, ExternalLink } from "lucide-react"

type BillingStatus = NonNullable<MedicalAidClaim["status"]> | "SUBMITTED"

type BillingRow = {
  claimId: string
  patientId: string
  patientName: string
  idNumber?: string
  schemeName?: string
  billedAmount: number
  paidAmount: number
  shortfallAmount: number
  status: BillingStatus
  outcomeDate: Date | null
  primaryInvoiceId?: string | null
  shortfallInvoiceId?: string | null
  patientPhone?: string
}

type StatusFilter = BillingStatus | "ALL"

const statusLabel: Record<StatusFilter, string> = {
  ALL: "All statuses",
  SUBMITTED: "Submitted",
  PAID: "Paid",
  PARTIALLY_PAID: "Partially paid",
  REJECTED: "Rejected",
}

const statusColorClasses: Record<BillingStatus, string> = {
  PAID: "bg-green-100 text-green-800",
  PARTIALLY_PAID: "bg-orange-100 text-orange-800",
  REJECTED: "bg-red-100 text-red-800",
  SUBMITTED: "bg-gray-100 text-gray-800",
}

function toSafeDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === "object" && value !== null && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    try {
      const d = (value as { toDate: () => Date }).toDate()
      return Number.isNaN(d.getTime()) ? null : d
    } catch {
      return null
    }
  }
  const d = new Date(value as string)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatCurrency(amount: number): string {
  return `R ${amount.toFixed(2)}`
}

export default function MedicalAidClaimBillingPortalPage() {
  const router = useRouter()
  const { user } = useAuth()

  const role = user?.role
  const hasAccess = role === "admin" || role === "clerk" || role === "doctor"
  const isReadOnly = role === "doctor"

  const { claims, loading: claimsLoading, error: claimsError, refetch: refetchClaims } = useMedicalAidClaims()
  const { invoices, loading: invoicesLoading, error: invoicesError, refetch: refetchInvoices } = useInvoices()
  const { patients, loading: patientsLoading } = usePatients()

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL")
  const [schemeFilter, setSchemeFilter] = useState<string>("ALL")
  const [patientFilter, setPatientFilter] = useState<string>("ALL")
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

  const loading = claimsLoading || invoicesLoading || patientsLoading

  const patientById = useMemo(() => {
    const map = new Map<string, Patient>()
    patients.forEach((p) => map.set(p.id, p))
    return map
  }, [patients])

  const billingRows: BillingRow[] = useMemo(() => {
    if (!Array.isArray(claims)) return []

    const rows: BillingRow[] = []

    const invoicesByClaimId = new Map<string, Invoice[]>()
    invoices.forEach((inv) => {
      const meta = inv as Invoice & { medicalAidClaimId?: string | null }
      const claimId = meta.medicalAidClaimId
      if (claimId) {
        const existing = invoicesByClaimId.get(claimId) ?? []
        existing.push(inv)
        invoicesByClaimId.set(claimId, existing)
      }
    })

    claims.forEach((claim) => {
      // Only medical-aid claims are stored here by design, but guard anyway.
      const billedAmount = Number(
        typeof claim.billAmount === "number"
          ? claim.billAmount
          : typeof claim.totalAmountClaimed === "number"
            ? claim.totalAmountClaimed
            : 0,
      )
      const paidAmount = typeof claim.paidAmount === "number" ? claim.paidAmount : 0
      const shortfallAmount = typeof claim.shortfallAmount === "number" ? claim.shortfallAmount : 0
      const status: BillingStatus = claim.status ?? "SUBMITTED"

      const claimInvoices = invoicesByClaimId.get(claim.id) ?? []
      const primaryInvoice = claimInvoices[0]
      const primaryInvoiceId = primaryInvoice ? primaryInvoice.id : null
      const shortfallInvoiceId = claim.shortfallInvoiceId ?? null

      const patient = patientById.get(claim.patientId)
      const patientName =
        claim.patientName ||
        (patient ? patient.name : `${claim.firstName ?? ""} ${claim.lastName ?? ""}`.trim()) ||
        "—"
      const phone =
        patient?.phone ||
        patient?.cellPhone ||
        patient?.homePhone ||
        patient?.workPhone ||
        undefined

      const outcomeDate =
        toSafeDate(claim.outcomeRecordedAt ?? null) || toSafeDate(claim.createdAt ?? null)

      rows.push({
        claimId: claim.id,
        patientId: claim.patientId,
        patientName,
        idNumber: claim.idNumber ?? patient?.idNumber,
        schemeName: claim.schemeName,
        billedAmount,
        paidAmount,
        shortfallAmount,
        status,
        outcomeDate,
        primaryInvoiceId,
        shortfallInvoiceId,
        patientPhone: phone,
      })
    })

    return rows.sort((a, b) => {
      const aDate = a.outcomeDate ?? null
      const bDate = b.outcomeDate ?? null
      if (!aDate && !bDate) return 0
      if (!aDate) return 1
      if (!bDate) return -1
      return bDate.getTime() - aDate.getTime()
    })
  }, [claims, invoices, patientById])

  const distinctSchemes = useMemo(() => {
    const set = new Set<string>()
    billingRows.forEach((row) => {
      if (row.schemeName) set.add(row.schemeName)
    })
    return Array.from(set).sort()
  }, [billingRows])

  const distinctPatients = useMemo(() => {
    const set = new Set<string>()
    billingRows.forEach((row) => {
      if (row.patientName) set.add(row.patientName)
    })
    return Array.from(set).sort()
  }, [billingRows])

  const filteredRows = useMemo(() => {
    let rows = billingRows

    if (statusFilter !== "ALL") {
      rows = rows.filter((row) => row.status === statusFilter)
    }

    if (schemeFilter !== "ALL") {
      const q = schemeFilter.toLowerCase()
      rows = rows.filter((row) => (row.schemeName ?? "").toLowerCase().includes(q))
    }

    if (patientFilter !== "ALL") {
      rows = rows.filter((row) => row.patientName === patientFilter)
    }

    if (dateRange?.from && dateRange.to) {
      rows = rows.filter((row) => {
        if (!row.outcomeDate) return false
        return isWithinInterval(row.outcomeDate, { start: dateRange.from!, end: dateRange.to! })
      })
    }

    const q = searchQuery.trim().toLowerCase()
    if (q) {
      rows = rows.filter((row) => {
        const patientName = row.patientName.toLowerCase()
        const idNumber = (row.idNumber ?? "").toLowerCase()
        const claimId = row.claimId.toLowerCase()
        const invoiceId = (row.primaryInvoiceId ?? "").toLowerCase()
        const shortfallInvoiceId = (row.shortfallInvoiceId ?? "").toLowerCase()
        return (
          patientName.includes(q) ||
          idNumber.includes(q) ||
          claimId.includes(q) ||
          invoiceId.includes(q) ||
          shortfallInvoiceId.includes(q)
        )
      })
    }

    return rows
  }, [billingRows, statusFilter, schemeFilter, patientFilter, dateRange, searchQuery])

  const totals = useMemo<MedicalAidBillingReportTotals>(() => {
    let totalBilled = 0
    let totalPaid = 0
    let totalPartiallyPaid = 0
    let totalRejected = 0
    let totalOutstandingShortfall = 0

    filteredRows.forEach((row) => {
      totalBilled += row.billedAmount
      if (row.status === "PAID" || row.status === "PARTIALLY_PAID") {
        totalPaid += row.paidAmount
      }
      if (row.status === "PARTIALLY_PAID") {
        totalPartiallyPaid += row.paidAmount
      }
      if (row.status === "REJECTED") {
        totalRejected += row.billedAmount
      }
      if (row.status === "PARTIALLY_PAID" || row.status === "REJECTED") {
        totalOutstandingShortfall += row.shortfallAmount
      }
    })

    const round = (v: number) => Number(v.toFixed(2))
    return {
      totalBilled: round(totalBilled),
      totalPaid: round(totalPaid),
      totalPartiallyPaid: round(totalPartiallyPaid),
      totalRejected: round(totalRejected),
      totalOutstandingShortfall: round(totalOutstandingShortfall),
    }
  }, [filteredRows])

  const filtersDescription = useMemo(() => {
    const parts: string[] = []
    if (statusFilter !== "ALL") parts.push(`Status: ${statusLabel[statusFilter]}`)
    if (schemeFilter !== "ALL") parts.push(`Scheme: ${schemeFilter}`)
    if (patientFilter !== "ALL") parts.push(`Patient: ${patientFilter}`)
    if (dateRange?.from && dateRange.to) {
      parts.push(
        `Outcome date: ${format(dateRange.from, "dd MMM yyyy")} – ${format(dateRange.to, "dd MMM yyyy")}`,
      )
    }
    if (searchQuery.trim()) {
      parts.push(`Search: "${searchQuery.trim()}"`)
    }
    return parts.join(" | ")
  }, [statusFilter, schemeFilter, patientFilter, dateRange, searchQuery])

  const handleExportCsv = () => {
    if (filteredRows.length === 0) {
      toast.error("No rows to export.")
      return
    }

    const headers = [
      "Claim ID",
      "Patient Name",
      "Scheme Name",
      "Invoice ID",
      "Billed Amount",
      "Paid Amount",
      "Shortfall Amount",
      "Status",
      "Outcome Date",
    ]

    const lines = filteredRows.map((row) => [
      row.claimId,
      row.patientName,
      row.schemeName ?? "",
      row.primaryInvoiceId ?? "",
      totalsNumber(row.billedAmount),
      totalsNumber(row.paidAmount),
      totalsNumber(row.shortfallAmount),
      row.status,
      row.outcomeDate ? format(row.outcomeDate, "yyyy-MM-dd") : "",
    ])

    const summaryLines = [
      [],
      ["Summary totals"],
      ["Total billed to medical aid", totalsNumber(totals.totalBilled)],
      ["Total paid by medical aid", totalsNumber(totals.totalPaid)],
      ["Total partially paid", totalsNumber(totals.totalPartiallyPaid)],
      ["Total rejected", totalsNumber(totals.totalRejected)],
      ["Total outstanding shortfall", totalsNumber(totals.totalOutstandingShortfall)],
    ]

    const csvContent = [
      headers,
      ...lines,
      ...summaryLines,
    ]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `medical-aid-billing-${format(new Date(), "yyyyMMdd-HHmm")}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleExportPdf = async () => {
    if (filteredRows.length === 0) {
      toast.error("No rows to export.")
      return
    }

    const reportRows: MedicalAidBillingReportRow[] = filteredRows.map((row) => ({
      claimId: row.claimId,
      patientName: row.patientName,
      schemeName: row.schemeName,
      invoiceId: row.primaryInvoiceId ?? row.shortfallInvoiceId ?? null,
      billedAmount: row.billedAmount,
      paidAmount: row.paidAmount,
      shortfallAmount: row.shortfallAmount,
      status: row.status,
      outcomeDate: row.outcomeDate ?? undefined,
    }))

    await generateMedicalAidBillingReportPdf({
      rows: reportRows,
      totals,
      filtersDescription,
    })
  }

  const handleRefresh = () => {
    Promise.all([refetchClaims(), refetchInvoices()]).catch(() => {
      toast.error("Failed to refresh data.")
    })
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access restricted</CardTitle>
            <CardDescription>
              Only administrators, clerks, and doctors can view the Medical Aid Claim Billing Portal.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Medical Aid Claim Billing Portal
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Financial overview of medical-aid claim performance. Data reflects outcomes recorded by the
            medical-aid officer, combined with invoices and patient billing information.
          </p>
          {isReadOnly && (
            <p className="text-xs text-muted-foreground mt-1">
              You are viewing this dashboard in read-only mode.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <Filter className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={filteredRows.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={filteredRows.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total billed to medical aid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalBilled)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total paid by medical aid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalPaid)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total partially paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalPartiallyPaid)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalRejected)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total outstanding shortfall</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalOutstandingShortfall)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
          <CardDescription>Filter and search medical-aid claim billing records.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice, patient name, or ID..."
                value={searchQuery}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              >
                {Object.entries(statusLabel).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={schemeFilter}
                onChange={(e) => setSchemeFilter(e.target.value)}
              >
                <option value="ALL">All schemes</option>
                {distinctSchemes.map((scheme) => (
                  <option key={scheme} value={scheme}>
                    {scheme}
                  </option>
                ))}
              </select>

              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={patientFilter}
                onChange={(e) => setPatientFilter(e.target.value)}
              >
                <option value="ALL">All patients</option>
                {distinctPatients.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal h-10 min-w-[220px]",
                      !dateRange && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from && dateRange.to
                      ? `${format(dateRange.from, "dd MMM yyyy")} – ${format(dateRange.to, "dd MMM yyyy")}`
                      : "Outcome date range"}
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
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Medical-aid claim billing records</CardTitle>
          <CardDescription>
            Showing {filteredRows.length} claim{filteredRows.length === 1 ? "" : "s"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Loading medical-aid billing data…</div>
          ) : claimsError || invoicesError ? (
            <div className="py-8 text-center text-destructive text-sm">
              {(claimsError ?? invoicesError)?.message ?? "Failed to load data."}
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm rounded-lg border border-dashed">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-60" />
              <p className="font-medium">No medical-aid billing records match your filters.</p>
              <p className="text-xs mt-1">Try adjusting the filters or search query.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Claim ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Scheme</TableHead>
                    <TableHead>Invoice ID</TableHead>
                    <TableHead className="text-right">Billed</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Shortfall</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Outcome date</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Shortfall invoice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row) => (
                    <TableRow
                      key={row.claimId}
                      className="cursor-pointer"
                      onClick={() => router.push(`/medical-aid/claims/${row.claimId}`)}
                    >
                      <TableCell>
                        <span className="font-mono text-xs">
                          {row.claimId.length > 10 ? `${row.claimId.slice(0, 10)}…` : row.claimId}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{row.patientName}</span>
                          {row.idNumber && (
                            <span className="text-xs text-muted-foreground">ID: {row.idNumber}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{row.schemeName ?? "—"}</TableCell>
                      <TableCell>
                        {row.primaryInvoiceId ? (
                          <Link
                            href={`/dashboard/billing/${row.primaryInvoiceId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-primary hover:underline"
                          >
                            {row.primaryInvoiceId.toUpperCase()}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(row.billedAmount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.paidAmount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.shortfallAmount)}</TableCell>
                      <TableCell>
                        <Badge className={cn("text-xs", statusColorClasses[row.status])}>
                          {statusLabel[row.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {row.outcomeDate ? format(row.outcomeDate, "dd MMM yyyy") : "—"}
                      </TableCell>
                      <TableCell>
                        {(row.status === "PARTIALLY_PAID" || row.status === "REJECTED") && row.patientPhone ? (
                          <Button
                            variant="outline"
                            size="icon"
                            asChild
                            onClick={(e) => e.stopPropagation()}
                            title={`Call ${row.patientPhone}`}
                          >
                            <a href={`tel:${row.patientPhone}`}>
                              <Phone className="h-4 w-4" />
                            </a>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.shortfallInvoiceId ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link
                              href={`/dashboard/billing/${row.shortfallInvoiceId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs"
                            >
                              <ExternalLink className="h-3 w-3" />
                              {row.shortfallInvoiceId.toUpperCase()}
                            </Link>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function totalsNumber(value: number): string {
  return value.toFixed(2)
}

