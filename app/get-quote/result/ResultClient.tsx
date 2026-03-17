"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"

import {
  ABOUT_REZTEK,
  CONTACT_DETAILS,
  DATA_SECURITY_NOTICE,
  INCLUDED_FEATURES,
  OUTCOME_BENEFITS,
  QUOTE_PRICING,
  type DoctorLeadStored,
} from "@/lib/get-quote"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CalendarDays, Download, MapPin } from "lucide-react"

type LeadResponse = { lead: DoctorLeadStored }
type UploadResponse = {
  uploaded: Array<{
    id: string
    filename: string
    contentType: string
    size: number
    storagePath: string
    signedUrl?: string
  }>
}

export default function GetQuoteResultClient() {
  const search = useSearchParams()
  const leadId = search.get("leadId") || ""

  const [lead, setLead] = useState<DoctorLeadStored | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")

  const demoVideoUrl = process.env.NEXT_PUBLIC_GET_QUOTE_DEMO_VIDEO_URL || ""

  const [demoOpen, setDemoOpen] = useState(false)
  const [demoSubmitting, setDemoSubmitting] = useState(false)
  const [demoSuccess, setDemoSuccess] = useState<string>("")
  const [demoError, setDemoError] = useState<string>("")

  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [address, setAddress] = useState("")

  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string>("")
  const [uploadedFiles, setUploadedFiles] = useState<UploadResponse["uploaded"]>([])

  const extraPerProfessional = 300

  const billing = useMemo(() => {
    if (!lead) {
      return {
        doctorsCount: 0,
        patientsCount: 0,
        doctorsSurcharge: 0,
        highPatientSurcharge: 0,
        monthlyTotal: QUOTE_PRICING.monthlyCostZar,
      }
    }
    const doctorsCount = Number.isFinite(Number(lead.doctors)) ? Number(lead.doctors) : 0
    const patientsCount = Number.isFinite(Number(lead.patientsPerDay)) ? Number(lead.patientsPerDay) : 0
    const doctorsSurcharge = Math.max(0, doctorsCount) * extraPerProfessional
    const highPatientSurcharge = patientsCount > 500 ? 350 : 0
    const monthlyTotal = QUOTE_PRICING.monthlyCostZar + doctorsSurcharge + highPatientSurcharge
    return { doctorsCount, patientsCount, doctorsSurcharge, highPatientSurcharge, monthlyTotal }
  }, [lead, extraPerProfessional])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!leadId) {
        setError("Missing leadId.")
        setLoading(false)
        return
      }
      setLoading(true)
      setError("")
      const res = await fetch(`/api/get-quote/lead?leadId=${encodeURIComponent(leadId)}`)
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null
        if (!cancelled) {
          setError(payload?.error || "Could not load your quote.")
          setLoading(false)
        }
        return
      }
      const data = (await res.json()) as LeadResponse
      if (!cancelled) {
        setLead(data.lead)
        setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [leadId])

  const pdfHref = useMemo(() => {
    if (!leadId) return "#"
    return `/api/get-quote/pdf?leadId=${encodeURIComponent(leadId)}`
  }, [leadId])

  async function uploadFiles(list: FileList | null) {
    if (!leadId) return
    if (!list || list.length === 0) return
    setUploading(true)
    setUploadError("")
    const fd = new FormData()
    fd.append("leadId", leadId)
    Array.from(list).forEach((f) => fd.append("files", f))

    const res = await fetch("/api/get-quote/upload", { method: "POST", body: fd })
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: string } | null
      setUploadError(payload?.error || "Could not upload files. Please try again.")
      setUploading(false)
      return
    }
    const data = (await res.json()) as UploadResponse
    setUploadedFiles((prev) => [...data.uploaded, ...prev])
    setUploading(false)
  }

  async function submitDemoRequest() {
    if (!lead) return
    setDemoSubmitting(true)
    setDemoError("")
    setDemoSuccess("")
    const res = await fetch("/api/get-quote/demo-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        name: lead.name,
        email: lead.email,
        practiceName: lead.practiceName,
        date,
        time,
        address,
      }),
    })
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: string } | null
      setDemoError(payload?.error || "Could not submit your demo request. Please try again.")
      setDemoSubmitting(false)
      return
    }
    setDemoSuccess("Thank you. You will be contacted shortly to confirm your demo.")
    if (typeof window !== "undefined") {
      window.alert("Your demo request has been submitted successfully.")
    }
    setDemoSubmitting(false)
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="border-b border-border bg-gradient-to-b from-muted/40 to-background">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/reztek-logo.png"
                alt="Reztek"
                width={180}
                height={64}
                className="h-10 w-auto object-contain"
                priority
              />
            </Link>
            <div className="flex items-center gap-2">
              <Link href="/get-quote">
                <Button variant="outline">New quote</Button>
              </Link>
              <a href={pdfHref}>
                <Button>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </a>
            </div>
          </div>

          <div className="mt-6">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              Your Quote
            </h1>
            <p className="mt-2 text-muted-foreground">
              A fixed package designed for modern, secure, high-throughput medical practices.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-muted-foreground animate-pulse">Loading…</div>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : !lead ? (
          <Alert variant="destructive">
            <AlertDescription>Quote not found.</AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-8 lg:grid-cols-12 items-start">
            <div className="lg:col-span-7 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Card>
                <CardHeader>
                  <CardTitle>Thank you, {lead.name}.</CardTitle>
                  <CardDescription>
                    Below is your quote and a summary of your submitted practice details.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Practice Name</p>
                      <p className="font-medium">{lead.practiceName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Specialization</p>
                      <p className="font-medium">{lead.specialization}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Practice Type</p>
                      <div className="mt-1">
                        <Badge variant="secondary">{lead.practiceType}</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="font-medium">{lead.location || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Country</p>
                      <p className="font-medium">{lead.practiceCountry || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Province / Region</p>
                      <p className="font-medium">{lead.practiceProvince || "—"}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-4 sm:grid-cols-4">
                    <div className="rounded-xl border border-border bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground">Doctors</p>
                      <p className="mt-1 text-lg font-semibold">{lead.doctors ?? 0}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground">Staff</p>
                      <p className="mt-1 text-lg font-semibold">{lead.staff ?? 0}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground">Patients/day</p>
                      <p className="mt-1 text-lg font-semibold">{lead.patientsPerDay ?? 0}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground">Years operating</p>
                      <p className="mt-1 text-lg font-semibold">{lead.yearsInOperation ?? 0}</p>
                    </div>
                  </div>

                  {lead.additionalNotes ? (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs text-muted-foreground">Additional notes</p>
                        <p className="mt-1 text-sm leading-relaxed">{lead.additionalNotes}</p>
                      </div>
                    </>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Benefits & included features</CardTitle>
                  <CardDescription>Everything below is included in your quote.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {INCLUDED_FEATURES.map((b) => (
                      <div
                        key={b}
                        className="rounded-xl border border-border bg-card p-4 shadow-sm"
                      >
                        <p className="text-sm font-medium">{b}</p>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="grid gap-3">
                    {OUTCOME_BENEFITS.map((b) => (
                      <div key={b} className="flex items-start gap-3">
                        <div className="mt-1 h-2 w-2 rounded-full bg-accent" />
                        <p className="text-sm text-foreground/90">{b}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Visual demonstration</CardTitle>
                  <CardDescription>Watch a short walkthrough of the platform.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {demoVideoUrl ? (
                    <div className="overflow-hidden rounded-2xl border border-border bg-black">
                      <video
                        controls
                        preload="metadata"
                        className="h-auto w-full"
                        src={demoVideoUrl}
                      />
                    </div>
                  ) : (
                    <Alert>
                      <AlertDescription>
                        Demo video is not configured yet. Set{" "}
                        <span className="font-mono">NEXT_PUBLIC_GET_QUOTE_DEMO_VIDEO_URL</span>{" "}
                        to a public video URL.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Upload documents</CardTitle>
                  <CardDescription>
                    Add any supporting documents and files. These are stored securely in Firebase.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {uploadError ? (
                    <Alert variant="destructive">
                      <AlertDescription>{uploadError}</AlertDescription>
                    </Alert>
                  ) : null}

                  <div className="grid gap-2">
                    <Label htmlFor="leadUpload">Select files</Label>
                    <Input
                      id="leadUpload"
                      type="file"
                      multiple
                      disabled={!leadId || uploading}
                      onChange={(e) => void uploadFiles(e.target.files)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Uploads are linked to this quote request ID: <span className="font-mono">{leadId || "—"}</span>
                    </p>
                  </div>

                  {uploadedFiles.length > 0 ? (
                    <div className="rounded-2xl border border-border bg-muted/20 p-4">
                      <p className="text-sm font-semibold">Uploaded</p>
                      <ul className="mt-2 space-y-2 text-sm">
                        {uploadedFiles.map((f) => (
                          <li key={f.id} className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-medium">{f.filename}</p>
                              <p className="text-xs text-muted-foreground truncate">{f.storagePath}</p>
                            </div>
                            {f.signedUrl ? (
                              <a className="text-xs underline" href={f.signedUrl} target="_blank" rel="noreferrer">
                                Open
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground">Saved</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Data Security</CardTitle>
                  <CardDescription>Confidentiality and compliance first.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground/90">{DATA_SECURITY_NOTICE}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>About Us</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground/90">{ABOUT_REZTEK}</p>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-5 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-75">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle>Quote</CardTitle>
                  <CardDescription>Fixed pricing (VAT excl. unless stated otherwise).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="rounded-2xl border border-border bg-muted/30 p-5">
                    <p className="text-xs text-muted-foreground">MONTHLY COST</p>
                    <p className="mt-1 text-3xl font-semibold tracking-tight">
                      R{billing.monthlyTotal.toLocaleString("en-ZA")}{" "}
                      <span className="text-base font-medium text-muted-foreground">/ month</span>
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border bg-muted/30 p-5 space-y-2">
                    <p className="text-xs text-muted-foreground">BREAKDOWN</p>
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span>Base package</span>
                      <span>R{QUOTE_PRICING.monthlyCostZar.toLocaleString("en-ZA")}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span>{`Healthcare professionals (${billing.doctorsCount} × R${extraPerProfessional})`}</span>
                      <span>R{billing.doctorsSurcharge.toLocaleString("en-ZA")}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span>High patient volume (&gt; 500)</span>
                      <span>R{billing.highPatientSurcharge.toLocaleString("en-ZA")}</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-muted/30 p-5">
                    <p className="text-xs text-muted-foreground">INITIATION FEE</p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      Initial System Setup & Customization Fee
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight">
                      R{QUOTE_PRICING.setupFeeZar.toLocaleString("en-ZA")}{" "}
                      <span className="text-base font-medium text-muted-foreground">(once-off)</span>
                    </p>
                  </div>

                  {lead.aiSummary ? (
                    <div className="rounded-2xl border border-border bg-card p-5">
                      <p className="text-xs text-muted-foreground">AI Practice Summary</p>
                      <p className="mt-2 text-sm leading-relaxed text-foreground/90">{lead.aiSummary}</p>
                    </div>
                  ) : null}

                  <Separator />

                  <div className="space-y-3">
                    <Button className="w-full" onClick={() => setDemoOpen((v) => !v)}>
                      <CalendarDays className="h-4 w-4 mr-2" />
                      Request In-Person Demo
                    </Button>
                    <a href={pdfHref} className="block">
                      <Button variant="outline" className="w-full">
                        <Download className="h-4 w-4 mr-2" />
                        Export PDF summary & quote
                      </Button>
                    </a>
                  </div>

                  {demoOpen ? (
                    <div className="mt-5 rounded-2xl border border-border bg-muted/20 p-5 space-y-4">
                      {demoSuccess ? (
                        <Alert>
                          <AlertDescription>{demoSuccess}</AlertDescription>
                        </Alert>
                      ) : null}
                      {demoError ? (
                        <Alert variant="destructive">
                          <AlertDescription>{demoError}</AlertDescription>
                        </Alert>
                      ) : null}

                      <div className="grid gap-4">
                        <div className="space-y-2">
                          <Label>Preferred Date</Label>
                          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Preferred Time</Label>
                          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Practice Address</Label>
                          <Textarea
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            rows={3}
                            placeholder="Street address, suburb, city"
                          />
                        </div>
                        <Button
                          onClick={() => void submitDemoRequest()}
                          disabled={demoSubmitting}
                        >
                          {demoSubmitting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Submitting…
                            </>
                          ) : (
                            <>
                              <MapPin className="h-4 w-4 mr-2" />
                              Submit demo request
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contact Us</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Email:</span>{" "}
                    <a className="font-medium hover:underline" href={`mailto:${CONTACT_DETAILS.email}`}>
                      {CONTACT_DETAILS.email}
                    </a>
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Phone:</span>{" "}
                    <a className="font-medium
 hover:underline" href={`tel:${CONTACT_DETAILS.phone}`}>
                      {CONTACT_DETAILS.phone}
                    </a>
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Alternate Phone:</span>{" "}
                    <a className="font-medium hover:underline" href={`tel:${CONTACT_DETAILS.altPhone}`}>
                      {CONTACT_DETAILS.altPhone}
                    </a>
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

