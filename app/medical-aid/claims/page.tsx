"use client"

import { useMemo, useState, useEffect, type ChangeEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { toast } from "sonner"
import { FileText, Search } from "lucide-react"

import { useMedicalAidClaims } from "@/lib/firestore-hooks"
import type { MedicalAidClaim } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type ClaimTab = "in-progress" | "completed"

const statusLabel: Record<Exclude<MedicalAidClaim["status"], undefined>, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  PAID: "Paid",
  PARTIALLY_PAID: "Partially paid",
  REJECTED: "Rejected",
}

const statusBadgeVariant = (status: MedicalAidClaim["status"]): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "PAID":
      return "default"
    case "PARTIALLY_PAID":
      return "secondary"
    case "REJECTED":
      return "destructive"
    default:
      return "outline"
  }
}

export default function MedicalAidClaimsPortalPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { claims, loading, error, refetch } = useMedicalAidClaims()

  const [searchQuery, setSearchQuery] = useState("")
  const [tab, setTab] = useState<ClaimTab>("in-progress")

  useEffect(() => {
    const t = searchParams.get("tab")
    if (t === "in-progress" || t === "completed") setTab(t)
  }, [searchParams])

  const filtered = useMemo(() => {
    const claimsList: MedicalAidClaim[] = Array.isArray(claims) ? claims : []
    const q = searchQuery.trim().toLowerCase()
    const base = claimsList.filter((claim) => {
      const effectiveStatus = claim.status ?? "SUBMITTED"
      if (effectiveStatus === "DRAFT") return false

      const isCompleted = !!claim.outcomeRecordedAt
      const matchesTab =
        tab === "in-progress" ? !isCompleted : isCompleted
      if (!matchesTab) return false
      if (!q) return true
      const name = (claim.patientName || `${claim.firstName ?? ""} ${claim.lastName ?? ""}`).trim().toLowerCase()
      const scheme = String(claim.schemeName ?? "").toLowerCase()
      const id = String(claim.id ?? "").toLowerCase()
      return name.includes(q) || scheme.includes(q) || id.includes(q)
    })
    return [...base].sort((a, b) => {
      const aDate = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt as any)
      const bDate = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt as any)
      return bDate.getTime() - aDate.getTime()
    })
  }, [claims, searchQuery, tab])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" />
          Medical Aid Claims
        </h1>
        <p className="text-muted-foreground">
          Search claims and record outcomes (paid, partially paid, rejected). Outcomes automatically create invoices and email patients.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Claims</CardTitle>
              <CardDescription>{filtered.length} claim(s)</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by patient, scheme or claim id..."
                  value={searchQuery}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-72"
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch().catch(() => toast.error("Failed to refresh claims"))}>
                Refresh
              </Button>
            </div>
          </div>
          <Tabs value={tab} onValueChange={(v) => setTab(v as ClaimTab)} className="mt-4">
            <TabsList>
              <TabsTrigger value="in-progress">In Progress</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading claims…</div>
          ) : error ? (
            <div className="py-8 text-center text-destructive">{error.message}</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground rounded-lg border border-dashed">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No claims found</p>
              <p className="text-sm mt-1">Try adjusting the search or switch tabs.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Scheme</TableHead>
                    <TableHead>Consultation</TableHead>
                    <TableHead className="text-right">Billed</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Shortfall</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((claim) => {
                    const status = claim.status ?? "SUBMITTED"
                    const consultDate =
                      claim.consultationDate instanceof Date
                        ? claim.consultationDate
                        : new Date(claim.consultationDate)
                    const billed = Number(claim.billAmount ?? claim.totalAmountClaimed ?? 0)
                    const paid = typeof claim.paidAmount === "number" ? claim.paidAmount : null
                    const shortfall = typeof claim.shortfallAmount === "number" ? claim.shortfallAmount : null

                    return (
                      <TableRow key={claim.id} className="cursor-pointer" onClick={() => router.push(`/medical-aid/claims/${claim.id}`)}>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(status)}>{statusLabel[status]}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {claim.patientName || `${claim.firstName ?? ""} ${claim.lastName ?? ""}`.trim() || "—"}
                            </span>
                            <span className="text-xs text-muted-foreground">Claim: {claim.id}</span>
                          </div>
                        </TableCell>
                        <TableCell>{claim.schemeName ?? "—"}</TableCell>
                        <TableCell>{format(consultDate, "dd MMM yyyy")}</TableCell>
                        <TableCell className="text-right">R {billed.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{paid == null ? "—" : `R ${paid.toLocaleString()}`}</TableCell>
                        <TableCell className="text-right">{shortfall == null ? "—" : `R ${shortfall.toLocaleString()}`}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/medical-aid/claims/${claim.id}`)
                            }}
                          >
                            Open
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

