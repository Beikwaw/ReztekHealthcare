"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useData } from "@/lib/data-context"
import { usePatients, useAppointments, useInvoices, useConsultations, useMedicalAidClaims } from "@/lib/firestore-hooks"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { format, differenceInYears, isValid } from "date-fns"
import {
  ArrowLeft,
  Edit,
  CalendarPlus,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  User,
  Heart,
  Pill,
  FileText,
  ExternalLink,
  Download,
} from "lucide-react"
import type { AppointmentStatus } from "@/lib/types"
import { formatFrequencyForDisplay } from "@/lib/utils"

function MedicalAidClaimPdfButtons({ claimId }: { claimId: string }) {
  const [loading, setLoading] = useState(false)
  const fetchUrl = async (type: "pdf" | "xml") => {
    setLoading(true)
    try {
      const res = await fetch("/api/medical-aid-claim-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId, type }),
      })
      const data = (await res.json().catch(() => ({}))) as { url?: string }
      if (res.ok && data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer")
      }
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={() => fetchUrl("pdf")}
      >
        <ExternalLink className="h-4 w-4 mr-1.5" />
        View PDF
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={loading}
        onClick={() => fetchUrl("pdf")}
        title="Download PDF"
      >
        <Download className="h-4 w-4" />
      </Button>
    </div>
  )
}

const statusColors: Record<AppointmentStatus, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  confirmed: "bg-green-100 text-green-800",
  "in-progress": "bg-yellow-100 text-yellow-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
  "no-show": "bg-orange-100 text-orange-800",
}

export default function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuth()
  const { medicalRecords, invoices: contextInvoices, doctors } = useData()
  const { patients, loading } = usePatients()
  const { appointments } = useAppointments()
  const { invoices: firestoreInvoices } = useInvoices()
  const { consultations } = useConsultations()
  const { claims: medicalAidClaims } = useMedicalAidClaims(id)

  const patient = patients.find((p) => p.id === id)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold mb-2">Patient Not Found</h2>
        <p className="text-muted-foreground mb-4">The patient you're looking for doesn't exist.</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    )
  }

  const patientAppointments = appointments
    .filter((apt) => apt.patientId === patient.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const patientRecords = medicalRecords
    .filter((rec) => rec.patientId === patient.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const patientConsultations = consultations
    .filter((c) => c.patientId === patient.id)
    .filter((c) => (c as { pdfStorageUrl?: string }).pdfStorageUrl)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const allInvoices = firestoreInvoices.length > 0 ? firestoreInvoices : contextInvoices
  const patientInvoices = allInvoices
    .filter((inv) => inv.patientId === patient.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const toSafeDate = (value: Date | string | undefined) => {
    if (!value) return null
    const date = value instanceof Date ? value : new Date(value)
    return isValid(date) ? date : null
  }

  const dob = toSafeDate(patient.dateOfBirth)
  const createdAt = toSafeDate(patient.createdAt)
  const age = dob ? differenceInYears(new Date(), dob) : null
  const showMedical = user?.role !== "clerk"
  const lastCompletedAppointment = patientAppointments.find((a) => a.status === "completed")
  const lastVisitDate = patient.lastVisitDate
    ? toSafeDate(patient.lastVisitDate)
    : lastCompletedAppointment ? toSafeDate(lastCompletedAppointment.date) : null
  const lastVisitLabel = lastVisitDate ? format(lastVisitDate, "MMM d, yyyy") : "No visits yet"

  const getDoctorName = (doctorId: string) => {
    const doctor = doctors.find((d) => d.id === doctorId)
    return doctor?.name || "Unknown Doctor"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{patient.name}</h1>
            <p className="text-muted-foreground">
              {age !== null ? `${age} years old` : "Age not available"}, {patient.gender}{" "}
              {createdAt ? `| Patient since ${format(createdAt, "MMM yyyy")}` : ""}
              {" "}| Last visit: {lastVisitLabel}
            </p>
            <p className="text-xs text-muted-foreground">
              Patient ID: {patient.patientNumber || patient.id}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {patient.phone && (
            <Button variant="outline" asChild>
              <a href={`tel:${patient.phone}`}>
                <Phone className="mr-2 h-4 w-4" />
                Call
              </a>
            </Button>
          )}
          {patient.email && (
            <Button variant="outline" asChild>
              <a href={`mailto:${patient.email}`}>
                <Mail className="mr-2 h-4 w-4" />
                Email
              </a>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href={`/dashboard/patients/${patient.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/dashboard/appointments/new?patient=${patient.id}`}>
              <CalendarPlus className="mr-2 h-4 w-4" />
              Book Appointment
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{patient.phone || "—"}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{patient.email || "—"}</span>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span className="text-sm">{patient.address || "—"}</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {patient.phone && (
                  <Button variant="outline" size="sm" className="flex-1 min-w-[100px]" asChild>
                    <a href={`tel:${patient.phone.replace(/\s/g, "")}`}>
                      <Phone className="h-4 w-4 mr-1.5" />
                      Call
                    </a>
                  </Button>
                )}
                {patient.email && (
                  <Button variant="outline" size="sm" className="flex-1 min-w-[100px]" asChild>
                    <a href={`mailto:${patient.email}`}>
                      <Mail className="h-4 w-4 mr-1.5" />
                      Email
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Emergency Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-medium">{patient.emergencyContact.name}</p>
              <p className="text-sm text-muted-foreground">
                {patient.emergencyContact.relationship}
              </p>
              <p className="text-sm">{patient.emergencyContact.phone}</p>
            </CardContent>
          </Card>

          {/* Insurance */}
          {patient.insuranceInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Insurance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium">{patient.insuranceInfo.provider}</p>
                <p className="text-sm text-muted-foreground">
                  Policy: {patient.insuranceInfo.policyNumber}
                </p>
              {patient.insuranceInfo.groupNumber && (
                  <p className="text-sm text-muted-foreground">
                    Group: {patient.insuranceInfo.groupNumber}
                  </p>
                )}
              <p className="text-sm text-muted-foreground">
                Expires:{" "}
                {toSafeDate(patient.insuranceInfo.expiryDate)
                  ? format(toSafeDate(patient.insuranceInfo.expiryDate)!, "MMM d, yyyy")
                  : "N/A"}
              </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="medical" className="w-full">
            <TabsList className={`grid w-full ${showMedical ? "grid-cols-4" : "grid-cols-3"}`}>
              <TabsTrigger value="medical">{showMedical ? "Medical" : "Details"}</TabsTrigger>
              <TabsTrigger value="appointments">Appointments</TabsTrigger>
              {showMedical && <TabsTrigger value="records">Records</TabsTrigger>}
              <TabsTrigger value="billing">Billing</TabsTrigger>
            </TabsList>

            {/* Medical History Tab */}
            <TabsContent value="medical" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Date of Birth</p>
                  <p className="font-medium">
                    {dob ? format(dob, "MMMM d, yyyy") : "N/A"}
                  </p>
                  </div>
                  {showMedical && (
                    <div>
                      <p className="text-sm text-muted-foreground">Blood Type</p>
                      <p className="font-medium">{patient.medicalHistory.bloodType || "Not recorded"}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Account Number</p>
                    <p className="font-medium">{patient.accountNumber || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ID Number</p>
                    <p className="font-medium">{patient.idNumber || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Occupation</p>
                    <p className="font-medium">{patient.occupation || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Marital Status</p>
                    <p className="font-medium">{patient.maritalStatus || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Home Language</p>
                    <p className="font-medium">{patient.homeLanguage || "N/A"}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Person Responsible for Account</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Surname</p>
                    <p className="font-medium">{patient.accountResponsible?.surname || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">First Names</p>
                    <p className="font-medium">{patient.accountResponsible?.firstNames || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ID Number</p>
                    <p className="font-medium">{patient.accountResponsible?.idNumber || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Home Address</p>
                    <p className="font-medium">{patient.accountResponsible?.homeAddress || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Postal Address</p>
                    <p className="font-medium">{patient.accountResponsible?.postalAddress || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Employer</p>
                    <p className="font-medium">{patient.accountResponsible?.employer || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Work Address</p>
                    <p className="font-medium">{patient.accountResponsible?.workAddress || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Contact</p>
                    <p className="font-medium">
                      {patient.accountResponsible?.telHome || ""} {patient.accountResponsible?.telWork || ""} {patient.accountResponsible?.cell || ""} {patient.accountResponsible?.email || ""}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Medical Aid</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{patient.medicalAidInfo?.name || "Cash"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Dependent Code</p>
                    <p className="font-medium">{patient.medicalAidInfo?.dependentCode || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Main Member Name</p>
                    <p className="font-medium">{patient.medicalAidInfo?.mainMemberName || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Main Member ID Number</p>
                    <p className="font-medium">{patient.medicalAidInfo?.mainMemberIdNumber || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Member Name</p>
                    <p className="font-medium">{patient.medicalAidInfo?.memberName || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Member Number</p>
                    <p className="font-medium">{patient.medicalAidInfo?.memberNumber || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ID Number</p>
                    <p className="font-medium">{patient.medicalAidInfo?.idNumber || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cell</p>
                    <p className="font-medium">{patient.medicalAidInfo?.cell || "N/A"}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Nearest Family/Friend</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{patient.nearestFamilyFriend?.name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Surname</p>
                    <p className="font-medium">{patient.nearestFamilyFriend?.surname || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Relationship</p>
                    <p className="font-medium">{patient.nearestFamilyFriend?.relationship || "N/A"}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{patient.nearestFamilyFriend?.address || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cell</p>
                    <p className="font-medium">{patient.nearestFamilyFriend?.cell || "N/A"}</p>
                  </div>
                </CardContent>
              </Card>

              {patient.familyDetails && patient.familyDetails.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Family Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Surname</TableHead>
                          <TableHead>Contact Number</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {patient.familyDetails.map((member, index) => (
                          <TableRow key={index}>
                            <TableCell>{member.name || "N/A"}</TableCell>
                            <TableCell>{member.surname || "N/A"}</TableCell>
                            <TableCell>{member.contactNumber || "N/A"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {showMedical && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        Allergies
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {patient.medicalHistory.allergies.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {patient.medicalHistory.allergies.map((allergy, index) => (
                            <Badge key={index} variant="destructive">
                              {allergy}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">No known allergies</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Heart className="h-4 w-4" />
                        Chronic Conditions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {patient.medicalHistory.chronicConditions.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {patient.medicalHistory.chronicConditions.map((condition, index) => (
                            <Badge key={index} variant="secondary">
                              {condition}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">No chronic conditions recorded</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Pill className="h-4 w-4" />
                        Current Medications
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {patient.medicalHistory.currentMedications.length > 0 ? (
                        <ul className="space-y-1">
                          {patient.medicalHistory.currentMedications.map((med, index) => (
                            <li key={index} className="text-sm">
                              {med}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground text-sm">No current medications</p>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}

              {patient.medicalHistory.familyHistory.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Family History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {patient.medicalHistory.familyHistory.map((item, index) => (
                        <li key={index} className="text-sm">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Appointments Tab */}
            <TabsContent value="appointments">
              <Card>
                <CardHeader>
                  <CardTitle>Appointment History</CardTitle>
                  <CardDescription>{patientAppointments.length} total appointments</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {patientAppointments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No appointments yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        patientAppointments.map((apt) => (
                          <TableRow key={apt.id}>
                            <TableCell>
                              {toSafeDate(apt.date) ? format(toSafeDate(apt.date)!, "MMM d, yyyy") : "N/A"}
                            </TableCell>
                            <TableCell>{apt.startTime}</TableCell>
                            <TableCell className="capitalize">{apt.type.replace("-", " ")}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={statusColors[apt.status]}>
                                {apt.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Medical Records Tab – hidden from clerk */}
            {showMedical && (
            <TabsContent value="records">
              {/* Consultation PDFs – all PDFs with timestamp, doctor can view */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Consultation PDFs
                  </CardTitle>
                  <CardDescription>
                    All consultation summary PDFs for this patient. Open to view or download.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const pdfsFromConsultations = patientConsultations.map((c) => ({
                      id: c.id,
                      label: "Consultation summary",
                      date: c.createdAt,
                      url: (c as { pdfStorageUrl?: string }).pdfStorageUrl!,
                    }))
                    const pdfsFromRecords = patientRecords
                      .filter((r) => r.pdfStorageUrl)
                      .map((r) => ({
                        id: r.id,
                        label: "Consultation summary",
                        date: r.date,
                        url: r.pdfStorageUrl!,
                      }))
                    const allPdfs = [...pdfsFromConsultations, ...pdfsFromRecords]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    const seen = new Set<string>()
                    const uniquePdfs = allPdfs.filter((p) => {
                      const key = `${p.url}-${new Date(p.date).getTime()}`
                      if (seen.has(key)) return false
                      seen.add(key)
                      return true
                    })
                    if (uniquePdfs.length === 0) {
                      return (
                        <p className="text-sm text-muted-foreground py-4">
                          No consultation PDFs yet. PDFs appear here after a consultation is completed.
                        </p>
                      )
                    }
                    return (
                      <ul className="space-y-3">
                        {uniquePdfs.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-center justify-between gap-4 rounded-lg border p-3"
                          >
                            <div>
                              <p className="font-medium text-sm">{item.label}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(item.date), "EEE, MMM d, yyyy 'at' HH:mm")}
                              </p>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                              <a href={item.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-1.5" />
                                View PDF
                              </a>
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )
                  })()}
                </CardContent>
              </Card>
              {/* Prescription PDFs – all prescription/script PDFs with timestamp */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Prescription PDFs
                  </CardTitle>
                  <CardDescription>
                    All prescription/script PDFs for this patient. Open to view or download.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const scriptPdfsFromConsultations = consultations
                      .filter((c) => c.patientId === patient.id)
                      .filter((c) => (c as { scriptPdfUrl?: string }).scriptPdfUrl)
                      .map((c) => ({
                        id: c.id,
                        label: "Prescription script",
                        date: c.createdAt,
                        url: (c as { scriptPdfUrl?: string }).scriptPdfUrl!,
                      }))
                    const scriptPdfsFromRecords = patientRecords
                      .filter((r) => (r as { scriptPdfUrl?: string }).scriptPdfUrl)
                      .map((r) => ({
                        id: r.id,
                        label: "Prescription script",
                        date: r.date,
                        url: (r as { scriptPdfUrl?: string }).scriptPdfUrl!,
                      }))

                    const allScripts = [...scriptPdfsFromConsultations, ...scriptPdfsFromRecords].sort(
                      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                    )

                    const seen = new Set<string>()
                    const uniqueScripts = allScripts.filter((p) => {
                      const key = `${p.url}-${new Date(p.date).getTime()}`
                      if (seen.has(key)) return false
                      seen.add(key)
                      return true
                    })

                    if (uniqueScripts.length === 0) {
                      return (
                        <p className="text-sm text-muted-foreground py-4">
                          No prescription PDFs yet. PDFs appear here after a consultation script is saved and
                          completed.
                        </p>
                      )
                    }
                    return (
                      <ul className="space-y-3">
                        {uniqueScripts.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-center justify-between gap-4 rounded-lg border p-3"
                          >
                            <div>
                              <p className="font-medium text-sm">{item.label}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(item.date), "EEE, MMM d, yyyy 'at' HH:mm")}
                              </p>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                              <a href={item.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-1.5" />
                                View PDF
                              </a>
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )
                    })()}
                </CardContent>
              </Card>
              {/* Medical Aid Claim PDFs – for medical aid patients */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Medical Aid Claim PDFs
                  </CardTitle>
                  <CardDescription>
                    Medical aid claim PDFs for this patient. Open to view or download.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {medicalAidClaims.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">
                      No medical aid claim PDFs yet. Claims appear here when a consultation is completed for a medical aid patient.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {medicalAidClaims.map((claim) => {
                        const claimDate = claim.consultationDate instanceof Date ? claim.consultationDate : new Date(claim.consultationDate)
                        const createdDate = claim.createdAt instanceof Date ? claim.createdAt : new Date(claim.createdAt)
                        return (
                          <li
                            key={claim.id}
                            className="flex items-center justify-between gap-4 rounded-lg border p-3"
                          >
                            <div>
                              <p className="font-medium text-sm">Medical aid claim</p>
                              <p className="text-xs text-muted-foreground">
                                {format(claimDate, "EEE, MMM d, yyyy")} · Created {format(createdDate, "MMM d, HH:mm")}
                              </p>
                              {claim.fileLabel && (
                                <p className="text-xs text-muted-foreground truncate max-w-[200px]" title={claim.fileLabel}>
                                  {claim.fileLabel}
                                </p>
                              )}
                            </div>
                            <MedicalAidClaimPdfButtons claimId={claim.id} />
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
              {/* Visit history – continuous list of visit dates */}
              <Card>
                <CardHeader>
                  <CardTitle>Visit History</CardTitle>
                  <CardDescription>
                    All consultation/visit dates. Last visit: {lastVisitLabel}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const visitDates = (patient.visitHistory || [])
                      .map((d) => toSafeDate(d))
                      .filter((d): d is Date => d !== null)
                      .sort((a, b) => b.getTime() - a.getTime())
                    const completedAptDates = patientAppointments
                      .filter((a) => a.status === "completed")
                      .map((a) => toSafeDate(a.date))
                      .filter((d): d is Date => d !== null)
                    const merged = [...new Map(
                      [...visitDates, ...completedAptDates].map((d) => [d.getTime(), d])
                    ).values()].sort((a, b) => b.getTime() - a.getTime())
                    if (merged.length === 0) {
                      return <p className="text-sm text-muted-foreground">No visits recorded yet.</p>
                    }
                    return (
                      <ul className="space-y-2">
                        {merged.map((date, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <span className="font-medium">{format(date, "EEE, MMM d, yyyy")}</span>
                          </li>
                        ))}
                      </ul>
                    )
                  })()}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Medical Records</CardTitle>
                  <CardDescription>{patientRecords.length} consultation records</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {patientRecords.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">No medical records yet</p>
                  ) : (
                    patientRecords.map((record) => (
                      <div key={record.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <p className="font-medium">
                              {toSafeDate(record.date) ? format(toSafeDate(record.date)!, "MMMM d, yyyy") : "N/A"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {getDoctorName(record.doctorId)}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {record.pdfStorageUrl && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={record.pdfStorageUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  View PDF
                                </a>
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/dashboard/records/${record.id}`}>
                                <FileText className="mr-2 h-4 w-4" />
                                View Full Record
                              </Link>
                            </Button>
                          </div>
                        </div>
                        <Separator />
                        <div>
                          <p className="text-sm font-medium">Diagnosis</p>
                          <p className="text-sm text-muted-foreground">{record.diagnosis}</p>
                        </div>
                        {record.prescription.length > 0 && (
                          <div>
                            <p className="text-sm font-medium">Prescription</p>
                            <ul className="text-sm text-muted-foreground">
                              {record.prescription.map((rx, index) => {
                                const parts: string[] = []
                                if (rx.dosage) parts.push(rx.dosage)
                                if (rx.frequency) parts.push(formatFrequencyForDisplay(rx.frequency))
                                if (rx.duration) parts.push(rx.duration)
                                const meta = parts.join(" · ")
                                return (
                                  <li key={index}>
                                    <span className="font-medium">{rx.medication}</span>
                                    {meta && <> — {meta}</>}
                                    {rx.instructions && <> – {rx.instructions}</>}
                                  </li>
                                )
                              })}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            )}

            {/* Billing Tab – all invoices for this patient */}
            <TabsContent value="billing">
              <Card>
                <CardHeader>
                  <CardTitle>Patient Billing</CardTitle>
                  <CardDescription>
                    All billing invoices for this patient ({patientInvoices.length} invoice{patientInvoices.length !== 1 ? "s" : ""})
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {patientInvoices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No invoices yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        patientInvoices.map((inv) => (
                          <TableRow key={inv.id}>
                            <TableCell className="font-medium">
                              <Link href={`/dashboard/billing/${inv.id}`} className="text-primary hover:underline">
                                {inv.id.toUpperCase()}
                              </Link>
                            </TableCell>
                            <TableCell>
                              {toSafeDate(inv.createdAt) ? format(toSafeDate(inv.createdAt)!, "MMM d, yyyy") : "N/A"}
                            </TableCell>
                            <TableCell>R {inv.total.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={
                                  inv.status === "paid" || inv.status === "completed"
                                    ? "bg-green-100 text-green-800"
                                    : inv.status === "overdue"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-yellow-100 text-yellow-800"
                                }
                              >
                                {inv.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
