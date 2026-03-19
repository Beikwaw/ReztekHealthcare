"use client"

import Image from "next/image"
import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import {
  doctorLeadSchema,
  PRACTICE_COUNTRIES,
  SOUTH_AFRICA_PROVINCES,
  PRACTICE_TYPES,
  QUOTE_PRICING,
  type DoctorLeadInput,
} from "@/lib/get-quote"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

type SubmitResponse = { leadId: string }

export default function GetQuotePage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string>("")
  const demoVideoUrl = process.env.NEXT_PUBLIC_GET_QUOTE_DEMO_VIDEO_URL || ""

  const defaults = useMemo<DoctorLeadInput>(
    () => ({
      name: "",
      email: "",
      phone: "",
      practiceName: "",
      location: "",
      practiceCountry: "South Africa",
      practiceProvince: "",
      practiceType: "GP",
      specialization: "",
      doctors: 0,
      staff: 0,
      patientsPerDay: 0,
      averageConsultationMinutes: 20,
      yearsInOperation: 0,
      hasSystem: "No",
      currentSystem: "",
      additionalNotes: "",
    }),
    [],
  )

  const form = useForm<DoctorLeadInput>({
    resolver: zodResolver(doctorLeadSchema),
    defaultValues: defaults,
    mode: "onBlur",
  })

  const hasSystem = form.watch("hasSystem")
  const practiceCountry = form.watch("practiceCountry")
  const patientsCount = form.watch("patientsPerDay") ?? 0
  async function onSubmit(values: DoctorLeadInput) {
    setServerError("")
    const res = await fetch("/api/get-quote/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })

    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: string } | null
      const message = payload?.error || "We could not submit your request. Please try again."
      setServerError(message)
      if (typeof window !== "undefined") {
        window.alert(`Quote request failed: ${message}`)
      }
      return
    }

    const data = (await res.json()) as SubmitResponse
    if (typeof window !== "undefined") {
      window.alert("Your quote has been generated successfully.")
    }
    router.push(`/get-quote/result?leadId=${encodeURIComponent(data.leadId)}`)
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#1e3a5f] to-[#0f172a]" />
        <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.10),transparent_55%),radial-gradient(circle_at_70%_40%,rgba(56,189,248,0.10),transparent_55%),radial-gradient(circle_at_50%_80%,rgba(45,212,191,0.10),transparent_60%)]" />

        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
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
            <Link href="/login" className="text-sm text-white/80 hover:text-white transition-colors">
              Staff login
            </Link>
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-12 items-start">
            <div className="lg:col-span-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <p className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
                RezTek • Healthcare SaaS
              </p>
              <h1 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight text-white">
                Lets get digital! Get a quote
              </h1>
              <p className="mt-4 text-white/80 leading-relaxed">
                Get an instant quote and discover how our system can transform and streamline your medical practice.
              </p>
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-white/85">
                <p className="text-sm">
                  Submit your details to receive your quote immediately, plus an email summary and next steps.
                </p>
                <ul className="mt-4 grid gap-2 text-sm">
                  <li>• Fixed transparent pricing</li>
                  <li>• Professional onboarding & demo scheduling</li>
                  <li>• Secure handling of all submitted information</li>
                </ul>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-white/90">
                <h3 className="text-sm font-semibold">Visual demonstration</h3>
                <p className="mt-1 text-xs text-white/70">Watch a short walkthrough before generating your quote.</p>
                {demoVideoUrl ? (
                  <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black">
                    <video controls preload="metadata" className="h-auto w-full" src={demoVideoUrl} />
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-white/70">
                    Demo video URL is not configured. Set <span className="font-mono">NEXT_PUBLIC_GET_QUOTE_DEMO_VIDEO_URL</span>.
                  </p>
                )}
              </div>
            </div>

            <div className="lg:col-span-7 animate-in fade-in slide-in-from-bottom-3 duration-300 delay-75">
              <Card className="bg-background/95">
                <CardHeader>
                  <CardTitle>Doctor details</CardTitle>
                  <CardDescription>Complete the form below to generate your quote.</CardDescription>
                </CardHeader>
                <CardContent>
                  {serverError ? (
                    <Alert variant="destructive" className="mb-4">
                      <AlertDescription>{serverError}</AlertDescription>
                    </Alert>
                  ) : null}

                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    {/* Personal Details */}
                    <section className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold tracking-wide text-foreground">Personal Details</h2>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="name">Full Name *</Label>
                          <Input id="name" {...form.register("name")} />
                          {form.formState.errors.name?.message ? (
                            <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                          ) : null}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address *</Label>
                          <Input id="email" type="email" {...form.register("email")} />
                          {form.formState.errors.email?.message ? (
                            <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                          ) : null}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number *</Label>
                          <Input id="phone" {...form.register("phone")} />
                          {form.formState.errors.phone?.message ? (
                            <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
                          ) : null}
                        </div>
                      </div>
                    </section>

                    <Separator />

                    {/* Practice Details */}
                    <section className="space-y-4">
                      <h2 className="text-sm font-semibold tracking-wide text-foreground">Practice Details</h2>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="practiceName">Practice Name *</Label>
                          <Input id="practiceName" {...form.register("practiceName")} />
                          {form.formState.errors.practiceName?.message ? (
                            <p className="text-sm text-destructive">{form.formState.errors.practiceName.message}</p>
                          ) : null}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="location">Practice Location (City)</Label>
                          <Input id="location" {...form.register("location")} />
                        </div>

                        <div className="space-y-2">
                          <Label>Practice Country</Label>
                          <Select
                            value={practiceCountry}
                            onValueChange={(v) => {
                              form.setValue("practiceCountry", v, { shouldValidate: true })
                              if (v !== "South Africa") {
                                form.setValue("practiceProvince", "", { shouldValidate: true })
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                            <SelectContent>
                              {PRACTICE_COUNTRIES.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="practiceProvince">
                            {practiceCountry === "South Africa" ? "Province" : "Province / State / Region"}
                          </Label>
                          {practiceCountry === "South Africa" ? (
                            <Select
                              value={form.watch("practiceProvince") ?? ""}
                              onValueChange={(v) =>
                                form.setValue("practiceProvince", v, { shouldValidate: true })
                              }
                            >
                              <SelectTrigger id="practiceProvince">
                                <SelectValue placeholder="Select province" />
                              </SelectTrigger>
                              <SelectContent>
                                {SOUTH_AFRICA_PROVINCES.map((p) => (
                                  <SelectItem key={p} value={p}>
                                    {p}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input id="practiceProvince" {...form.register("practiceProvince")} />
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>Practice Type</Label>
                          <Select
                            value={form.watch("practiceType")}
                            onValueChange={(v) => form.setValue("practiceType", v as DoctorLeadInput["practiceType"], { shouldValidate: true })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              {PRACTICE_TYPES.map((t) => (
                                <SelectItem key={t} value={t}>
                                  {t}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="specialization">What does your practice specialize in? *</Label>
                          <Input
                            id="specialization"
                            placeholder="e.g., General Practice, Dental, Physiotherapy, Optometry..."
                            {...form.register("specialization")}
                          />
                          {form.formState.errors.specialization?.message ? (
                            <p className="text-sm text-destructive">{form.formState.errors.specialization.message}</p>
                          ) : null}
                        </div>
                      </div>
                    </section>

                    <Separator />

                    {/* Practice Size & Operations */}
                    <section className="space-y-4">
                      <h2 className="text-sm font-semibold tracking-wide text-foreground">Practice Size & Operations</h2>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="doctors">Number of Healthcare professionals consulting</Label>
                          <Input id="doctors" type="number" min={0} inputMode="numeric" {...form.register("doctors")} />
                          <p className="text-xs text-muted-foreground">
                            Each healthcare professional will have their own separate profile/login.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="staff">Number of Staff</Label>
                          <Input id="staff" type="number" min={0} inputMode="numeric" {...form.register("staff")} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="patientsPerDay">Number of patients</Label>
                          <Select
                            value={String(form.watch("patientsPerDay") ?? 0)}
                            onValueChange={(v) =>
                              form.setValue("patientsPerDay", Number(v), { shouldValidate: true })
                            }
                          >
                            <SelectTrigger id="patientsPerDay">
                              <SelectValue placeholder="Select patients" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 11 }, (_, i) => i * 100).map((n) => (
                                <SelectItem key={n} value={String(n)}>
                                  {n}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {patientsCount > 500 ? (
                            <p className="text-xs text-muted-foreground">High patient volume adds an additional R350 per month.</p>
                          ) : null}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="yearsInOperation">Years in Operation</Label>
                          <Input id="yearsInOperation" type="number" min={0} inputMode="numeric" {...form.register("yearsInOperation")} />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="averageConsultationMinutes">Average consultation time (minutes)</Label>
                          <Input
                            id="averageConsultationMinutes"
                            type="number"
                            min={1}
                            inputMode="numeric"
                            {...form.register("averageConsultationMinutes")}
                          />
                        </div>
                      </div>
                    </section>

                    <Separator />

                    {/* Current System */}
                    <section className="space-y-4">
                      <h2 className="text-sm font-semibold tracking-wide text-foreground">Current System</h2>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Do you currently use a digital system?</Label>
                          <Select
                            value={hasSystem}
                            onValueChange={(v) => form.setValue("hasSystem", v as DoctorLeadInput["hasSystem"], { shouldValidate: true })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Yes">Yes</SelectItem>
                              <SelectItem value="No">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="currentSystem">If yes, specify system</Label>
                          <Input
                            id="currentSystem"
                            disabled={hasSystem !== "Yes"}
                            placeholder={hasSystem === "Yes" ? "e.g., Practice management software" : ""}
                            {...form.register("currentSystem")}
                          />
                        </div>
                      </div>
                    </section>

                    <Separator />

                    {/* Additional Notes */}
                    <section className="space-y-3">
                      <h2 className="text-sm font-semibold tracking-wide text-foreground">Custom Input (Optional)</h2>
                      <div className="space-y-2">
                        <Label htmlFor="additionalNotes">Tell us how your clinic operates or any additional features you would like</Label>
                        <Textarea id="additionalNotes" rows={5} {...form.register("additionalNotes")} />
                      </div>
                    </section>

                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pt-2">
                      <p className="text-xs text-muted-foreground">
                        By submitting, you agree to be contacted regarding onboarding and a demo.
                      </p>
                      <Button type="submit" className="min-w-[220px]" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Submitting…
                          </>
                        ) : (
                          "Get my quote"
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

