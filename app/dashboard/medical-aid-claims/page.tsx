"use client"

import { useState, useEffect, type ChangeEvent } from "react"
import { useAuth } from "@/lib/auth-context"
import { useMedicalAidClaims } from "@/lib/firestore-hooks"
import type { MedicalAidClaim } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { FileText, Search, Download, Printer, Mail, FileCode2 } from "lucide-react"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export default function MedicalAidClaimsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { claims, loading, error, refetch } = useMedicalAidClaims()
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")
  const [emailSending, setEmailSending] = useState<string | null>(null)

  useEffect(() => {
    if (user && user.role !== "doctor" && user.role !== "admin" && user.role !== "clerk") {
      router.replace("/dashboard")
    }
  }, [user, router])

  const claimsList: MedicalAidClaim[] = Array.isArray(claims) ? claims : []
  const filteredClaims = claimsList
    .filter((claim: MedicalAidClaim) => {
      const q = String(searchQuery ?? "").trim()
      const nameMatch =
        !q ||
        (claim.patientName ?? "")
          .toLowerCase()
          .includes(q.toLowerCase()) ||
        `${claim.firstName ?? ""} ${claim.lastName ?? ""}`
          .toLowerCase()
          .includes(q.toLowerCase())
      if (!nameMatch) return false
      if (dateFrom) {
        const d = claim.consultationDate instanceof Date ? claim.consultationDate : new Date(claim.consultationDate)
        if (d < new Date(dateFrom)) return false
      }
      if (dateTo) {
        const d = claim.consultationDate instanceof Date ? claim.consultationDate : new Date(claim.consultationDate)
        const toEnd = new Date(dateTo)
        toEnd.setHours(23, 59, 59, 999)
        if (d > toEnd) return false
      }
      // Doctor/clerk/admin portal: show draft/reviewable claims only
      const status = claim.status ?? "DRAFT"
      return status === "DRAFT" || status === "SUBMITTED"
    })
    .slice()
    .sort((a, b) => {
      const aDate = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt as any)
      const bDate = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt as any)
      return bDate.getTime() - aDate.getTime()
    })

  const fetchClaimUrl = async (claimId: string, kind: "pdf" | "xml") => {
    try {
      const res = await fetch("/api/medical-aid-claim-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId, type: kind }),
      })
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        toast.error(data.error || "Could not generate download link for claim.")
        return null
      }
      return data.url
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not generate download link for claim.")
      return null
    }
  }

  const handleDownload = async (claimId: string): Promise<void> => {
    const url = await fetchClaimUrl(claimId, "pdf")
    if (!url) return
    if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer")
  }

  const handlePrint = async (claimId: string): Promise<void> => {
    const url = await fetchClaimUrl(claimId, "pdf")
    if (!url) return
    if (typeof window !== "undefined") {
      const w = window.open(url, "_blank", "noopener,noreferrer")
      if (w) w.onload = () => w.print()
      else toast.error("Allow pop-ups to print.")
    }
  }

  const handleDownloadXml = async (claimId: string): Promise<void> => {
    const url = await fetchClaimUrl(claimId, "xml")
    if (!url) return
    if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer")
  }

  const handleEmailToClerk = async (claimId: string): Promise<void> => {
    setEmailSending(claimId)
    try {
      const res = await fetch("/api/send-medical-aid-claim-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(data.error ?? "Failed to send email")
        return
      }
      toast.success("Claim sent to clerk by email.")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to send email")
    } finally {
      setEmailSending(null)
    }
  }

  if (user && user.role !== "doctor" && user.role !== "admin" && user.role !== "clerk") {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" />
          Medical Aid Claims
        </h1>
        <p className="text-muted-foreground mt-1">
          View and manage medical aid claims. Download, print, or email to clerk. Only claims for medical aid patients are listed.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Claims</CardTitle>
              <CardDescription>{filteredClaims.length} claim(s)</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by patient name..."
                  value={searchQuery}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery((e.target as HTMLInputElement).value)}
                  className="pl-9 w-full sm:w-48"
                />
              </div>
              <Input
                type="date"
                placeholder="From"
                value={dateFrom}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setDateFrom((e.target as HTMLInputElement).value)}
                className="w-full sm:w-36"
              />
              <Input
                type="date"
                placeholder="To"
                value={dateTo}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setDateTo((e.target as HTMLInputElement).value)}
                className="w-full sm:w-36"
              />
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading claims…</div>
          ) : error ? (
            <div className="py-8 text-center text-destructive">{error.message}</div>
          ) : filteredClaims.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground rounded-lg border border-dashed">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No medical aid claims</p>
              <p className="text-sm mt-1">Claims are created when you complete a consultation for a medical aid patient.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead className="hidden lg:table-cell">Practice / Doctor</TableHead>
                    <TableHead>Consultation date</TableHead>
                    <TableHead>Scheme</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>ICD-10</TableHead>
                    <TableHead className="hidden xl:table-cell">File</TableHead>
                    <TableHead className="hidden lg:table-cell">Shortfall invoice</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClaims.map((claim: MedicalAidClaim) => {
                    const consultDate =
                      claim.consultationDate instanceof Date
                        ? claim.consultationDate
                        : new Date(claim.consultationDate)
                    const createdDate =
                      claim.createdAt instanceof Date ? claim.createdAt : new Date(claim.createdAt)
                    const status = claim.status ?? "DRAFT"
                    return (
                      <TableRow key={claim.id}>
                        <TableCell>
                          <Badge variant={status === "DRAFT" ? "outline" : "default"}>
                            {status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {claim.patientName || `${claim.firstName ?? ""} ${claim.lastName ?? ""}`.trim() || "—"}
                            </span>
                            {claim.idNumber && (
                              <span className="text-xs text-muted-foreground">ID: {claim.idNumber}</span>
                            )}
                            {claim.membershipNumber && (
                            <span className="text-xs text-muted-foreground">
                              Membership: {claim.membershipNumber}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell align-top">
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>Practice: {claim.practiceNumber ?? "1557149"}</div>
                            <div>HPCSA: {claim.doctorHpcsaNumber ?? "DR WC MKHONZA, PR NO: 1557149"}</div>
                          </div>
                        </TableCell>
                        <TableCell>{format(consultDate, "dd MMM yyyy")}</TableCell>
                        <TableCell>{claim.schemeName ?? "—"}</TableCell>
                        <TableCell>R {((claim.totalAmountClaimed as number) ?? 0).toLocaleString()}</TableCell>
                        <TableCell>{claim.icd10Code ?? "—"}</TableCell>
                        <TableCell className="hidden xl:table-cell align-top text-xs text-muted-foreground max-w-[140px] truncate" title={claim.fileLabel ?? (typeof claim.storagePathPdf === "string" ? claim.storagePathPdf.split("/").pop() : undefined)}>
                          {claim.fileLabel ?? (typeof claim.storagePathPdf === "string" ? claim.storagePathPdf.split("/").pop() : null) ?? "—"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell align-top text-xs text-muted-foreground">
                          {claim.shortfallInvoiceId ? (
                            <button
                              type="button"
                              className="underline text-primary"
                              onClick={() => router.push(`/dashboard/billing/${String(claim.shortfallInvoiceId).toUpperCase()}`)}
                            >
                              {String(claim.shortfallInvoiceId).toUpperCase()}
                            </button>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>{format(createdDate, "dd MMM yyyy HH:mm")}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/dashboard/medical-aid-claims/${claim.id}/edit`)}
                            >
                              Edit claim
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(claim.id)}
                              title="Download PDF"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePrint(claim.id)}
                              title="Print"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadXml(claim.id)}
                              title="Download XML"
                            >
                              <FileCode2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEmailToClerk(claim.id)}
                              disabled={emailSending === claim.id}
                              title="Email to clerk"
                            >
                              {emailSending === claim.id ? (
                                <span className="h-4 w-4 animate-spin">⏳</span>
                              ) : (
                                <Mail className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
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
