"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { usePatients } from "@/lib/firestore-hooks"
import { useAuth } from "@/lib/auth-context"
import { addPatientAuditLog } from "@/lib/firebase"
import { StatusDialog } from "@/components/ui/status-dialog"
import { LoadingButton } from "@/components/feedback/loading-button"
import { OverlaySpinner } from "@/components/feedback/overlay-spinner"
import { notifyError, notifySuccess, withLoadingToast } from "@/lib/toast-utils"
import { UserPlus, Plus, Trash2 } from "lucide-react"
import { MEDICAL_AID_SCHEMES } from "@/lib/medical-aid-schemes"

const HOME_LANGUAGE_OPTIONS = ["Zulu", "English", "Afrikaans"]
const RELATIONSHIP_OPTIONS = [
  "Parent",
  "Spouse",
  "Sibling",
  "Child",
  "Relative",
  "Friend",
  "Guardian",
  "Other",
]

export function PatientRegistrationForm() {
  const router = useRouter()
  const { addPatient, patients } = usePatients()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [statusDialogTitle, setStatusDialogTitle] = useState("")
  const [statusDialogDescription, setStatusDialogDescription] = useState("")
  const errorRef = useRef<HTMLDivElement>(null)

  const [formData, setFormData] = useState({
    accountNumber: "",
    title: "",
    firstName: "",
    lastName: "",
    idNumber: "",
    passportNumber: "",
    dateOfBirth: "",
    occupation: "",
    homeLanguage: "",
    maritalStatus: "",
    gender: "other" as "male" | "female" | "other",
    cellPhone: "",
    email: "",
    address: "",
    paymentMethod: "cash" as "cash" | "medical-aid",
    accountResponsible: {
      surname: "",
      firstNames: "",
      title: "",
      idNumber: "",
      homeAddress: "",
      postalAddress: "",
      employer: "",
      workAddress: "",
      cell: "",
      email: "",
    },
    medicalAidInfo: {
      name: "",
      memberName: "",
      memberNumber: "",
      idNumber: "",
      cell: "",
      dependentCode: "",
      mainMemberName: "",
      mainMemberIdNumber: "",
    },
    nearestFamilyFriend: {
      name: "",
      surname: "",
      relationship: "",
      address: "",
      cell: "",
    },
    familyDetails: [
      { name: "", surname: "", contactNumber: "" },
    ],
    guardian: {
      name: "",
      phone: "",
      relationship: "",
    },
  })

  const parseDobFromId = (idNumber: string) => {
    const cleaned = idNumber.replace(/\D/g, "")
    if (cleaned.length < 6) return ""
    const yy = Number(cleaned.slice(0, 2))
    const mm = Number(cleaned.slice(2, 4))
    const dd = Number(cleaned.slice(4, 6))
    if (!yy || mm < 1 || mm > 12 || dd < 1 || dd > 31) return ""
    const currentYY = new Date().getFullYear() % 100
    const century = yy <= currentYY ? 2000 : 1900
    const year = century + yy
    return `${year}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`
  }

  const getMissingFields = () => {
    const missing: string[] = []
    const isEmpty = (value?: string) => !value || !value.trim()
    const requireField = (value: string, label: string) => {
      if (isEmpty(value)) missing.push(label)
    }

    requireField(formData.accountNumber, "Account Number")
    requireField(formData.title, "Title")
    requireField(formData.firstName, "First Names")
    requireField(formData.lastName, "Surname")
    if (!formData.idNumber?.trim() && !formData.passportNumber?.trim()) {
      missing.push("I.D. Number or Passport number is required")
    }
    requireField(formData.dateOfBirth, "Date of Birth")
    requireField(formData.occupation, "Occupation")
    requireField(formData.homeLanguage, "Home Language")
    requireField(formData.maritalStatus, "Marital Status")
    requireField(formData.cellPhone, "Cell")
    requireField(formData.address, "Address")

    const dobDate = formData.dateOfBirth ? new Date(formData.dateOfBirth) : null
    const age = dobDate && !isNaN(dobDate.getTime()) ? Math.floor((Date.now() - dobDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null
    if (age !== null && age < 16) {
      requireField(formData.guardian.name, "Guardian: Name")
      requireField(formData.guardian.phone, "Guardian: Phone")
      requireField(formData.guardian.relationship, "Guardian: Relationship")
    }

    requireField(formData.accountResponsible.surname, "Account Responsible: Surname")
    requireField(formData.accountResponsible.firstNames, "Account Responsible: First Names")
    requireField(formData.accountResponsible.idNumber, "Account Responsible: I.D. Number")
    requireField(formData.accountResponsible.homeAddress, "Account Responsible: Home Address")
    requireField(formData.accountResponsible.postalAddress, "Account Responsible: Postal Address")
    requireField(formData.accountResponsible.employer, "Account Responsible: Employer")
    requireField(formData.accountResponsible.workAddress, "Account Responsible: Work Address")
    requireField(formData.accountResponsible.cell, "Account Responsible: Cell")
    requireField(formData.accountResponsible.email, "Account Responsible: E-mail")

    if (formData.paymentMethod === "medical-aid") {
      requireField(formData.medicalAidInfo.name, "Medical Aid: Name")
      requireField(formData.medicalAidInfo.memberName, "Medical Aid: Member Name")
      requireField(formData.medicalAidInfo.memberNumber, "Medical Aid: Member Number")
      requireField(formData.medicalAidInfo.idNumber, "Medical Aid: I.D. Number")
      requireField(formData.medicalAidInfo.cell, "Medical Aid: Cell")
    }

    requireField(formData.nearestFamilyFriend.name, "Nearest Family/Friend: Name")
    requireField(formData.nearestFamilyFriend.surname, "Nearest Family/Friend: Surname")
    requireField(formData.nearestFamilyFriend.relationship, "Nearest Family/Friend: Relationship")
    requireField(formData.nearestFamilyFriend.address, "Nearest Family/Friend: Address")
    requireField(formData.nearestFamilyFriend.cell, "Nearest Family/Friend: Cell")

    if (formData.familyDetails.length === 0) {
      missing.push("Family Details")
    } else {
      formData.familyDetails.forEach((member, index) => {
        requireField(member.name || "", `Family Details Row ${index + 1}: Name`)
        requireField(member.surname || "", `Family Details Row ${index + 1}: Surname`)
        requireField(member.contactNumber || "", `Family Details Row ${index + 1}: Contact Number`)
      })
    }

    return missing
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => {
      if (name === "idNumber") {
        const derivedDob = parseDobFromId(value)
        return {
          ...prev,
          idNumber: value,
          dateOfBirth: derivedDob || prev.dateOfBirth,
        }
      }
      return {
        ...prev,
        [name]: value,
      }
    })
  }

  const handleNestedChange = (
    section: "accountResponsible" | "medicalAidInfo" | "nearestFamilyFriend",
    field: string,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }))
  }

  const handleFamilyChange = (index: number, field: string, value: string) => {
    setFormData((prev) => {
      const updated = [...prev.familyDetails]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, familyDetails: updated }
    })
  }

  const addFamilyRow = () => {
    setFormData((prev) => ({
      ...prev,
      familyDetails: [...prev.familyDetails, { name: "", surname: "", contactNumber: "" }],
    }))
  }

  const removeFamilyRow = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      familyDetails: prev.familyDetails.filter((_, i) => i !== index),
    }))
  }

  const handleAccountSameAsPatient = (checked: boolean) => {
    if (!checked) {
      setFormData((prev) => ({
        ...prev,
        accountResponsible: {
          surname: "",
          firstNames: "",
          title: "",
          idNumber: "",
          homeAddress: "",
          postalAddress: "",
          employer: "",
          workAddress: "",
          cell: "",
          email: "",
        },
      }))
      return
    }

    setFormData((prev) => ({
      ...prev,
      accountResponsible: {
        ...prev.accountResponsible,
        surname: prev.lastName,
        firstNames: prev.firstName,
        title: prev.title,
        idNumber: prev.idNumber,
        homeAddress: prev.address,
        postalAddress: prev.address,
        cell: prev.cellPhone,
        email: prev.email,
      },
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const missingFields = getMissingFields()
      if (missingFields.length > 0) {
        const message = `Please complete all required fields. Missing: ${missingFields[0]}`
        setError(message)
        setStatusDialogTitle("Missing required field")
        setStatusDialogDescription(message)
        setStatusDialogOpen(true)
        return
      }

      // Basic ID number format check (SA ID: 13 digits) when provided
      const cleanedId = formData.idNumber.replace(/\D/g, "")
      if (cleanedId && cleanedId.length !== 13) {
        const message = "ID number must be 13 digits or leave it blank and use Passport instead."
        setError(message)
        setStatusDialogTitle("Invalid ID number format")
        setStatusDialogDescription(message)
        setStatusDialogOpen(true)
        return
      }

      // Duplicate patient protection: email + ID + full name all match
      const fullName = `${formData.firstName} ${formData.lastName}`.trim().toLowerCase()
      const normalisedEmail = (formData.email || "").trim().toLowerCase()
      const normalisedId = cleanedId || formData.passportNumber.trim().toLowerCase()

      const duplicate = patients.some((p) => {
        const pName = (p.name || "").trim().toLowerCase()
        const pEmail = (p.email || "").trim().toLowerCase()
        const pId = (p.idNumber || p.passportNumber || "").trim().toLowerCase()
        return pName === fullName && pEmail === normalisedEmail && pId === normalisedId && !!pName && !!pEmail && !!pId
      })

      if (duplicate) {
        const message =
          "A patient with the same name, ID/passport number and email already exists in the system."
        setError(message)
        setStatusDialogTitle("Registration Error")
        setStatusDialogDescription(message)
        setStatusDialogOpen(true)
        return
      }

      const createdPatient = await withLoadingToast("Saving record...", async () =>
        addPatient({
          ...formData,
          gender: (formData.gender || "other") as "male" | "female" | "other",
          status: "waiting",
        })
      )

      if (user) {
        await addPatientAuditLog({
          patientId: createdPatient.id,
          patientName: createdPatient.name,
          action: "status-change",
          fromStatus: "new",
          toStatus: "waiting",
          performedByUserId: user.id,
          performedByName: user.name,
          performedByRole: user.role,
        })
      }

      notifySuccess("recordCreated")
      router.push(`/dashboard?postRegistration=${createdPatient.id}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to register patient"
      setError(message)
      notifyError("firebaseWriteFailed", message)
      setStatusDialogTitle("Registration Error")
      setStatusDialogDescription(message)
      setStatusDialogOpen(true)
      setTimeout(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [error])

  return (
    <Card className="relative max-w-5xl mx-auto border-border/50 overflow-visible">
      <OverlaySpinner show={loading} label="Submitting patient..." />
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Register New Patient
        </CardTitle>
<CardDescription>
        Complete the medical file. If you enter an SA ID number, date of birth is derived automatically; otherwise enter it manually. Passport is accepted when no SA ID is available.
      </CardDescription>
      </CardHeader>
      <CardContent className="overflow-visible">
        <StatusDialog
          open={statusDialogOpen}
          onOpenChange={setStatusDialogOpen}
          variant="error"
          title={statusDialogTitle}
          description={statusDialogDescription}
        />
        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div ref={errorRef} className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Account Number */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number / Rekening Nommer</Label>
              <Input id="accountNumber" name="accountNumber" value={formData.accountNumber} onChange={handleChange} />
            </div>
          </div>

          {/* Section 1: Patient Details */}
          <div className="space-y-4">
            <h3 className="font-medium text-foreground">1. Patient Details / Pasiënt Besonderhede / Imininingwane</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lastName">Surname / Van / Isibongo *</Label>
                <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstName">First Names / Voorname / Amagama *</Label>
                <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title / Titel / Isihloko</Label>
                <Select onValueChange={(v) => setFormData((p) => ({ ...p, title: v }))}>
                  <SelectTrigger id="title">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mr">Mr</SelectItem>
                    <SelectItem value="Mrs">Mrs</SelectItem>
                    <SelectItem value="Ms">Ms</SelectItem>
                    <SelectItem value="Miss">Miss</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="idNumber">I.D. Number / I.D. Nommer (or Passport below)</Label>
                <Input id="idNumber" name="idNumber" value={formData.idNumber} onChange={handleChange} placeholder="SA ID if available" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="passportNumber">Passport Number (if no SA ID)</Label>
                <Input id="passportNumber" name="passportNumber" value={formData.passportNumber} onChange={handleChange} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth / Geboortedatum *</Label>
                <Input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  readOnly={!!(formData.idNumber && formData.idNumber.replace(/\D/g, "").length >= 6)}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="occupation">Occupation / Beroep</Label>
                <Input id="occupation" name="occupation" value={formData.occupation} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="homeLanguage">Home Language / Huistaal / Ulimi</Label>
                <Select onValueChange={(v) => setFormData((p) => ({ ...p, homeLanguage: v }))}>
                  <SelectTrigger id="homeLanguage">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {HOME_LANGUAGE_OPTIONS.map((lang) => (
                      <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maritalStatus">Marital Status / Huwelikstatus</Label>
                <Select onValueChange={(v) => setFormData((p) => ({ ...p, maritalStatus: v }))}>
                  <SelectTrigger id="maritalStatus">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="married">Married</SelectItem>
                    <SelectItem value="divorced">Divorced</SelectItem>
                    <SelectItem value="widowed">Widowed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender / Geslag</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(v) => setFormData((p) => ({ ...p, gender: v as "male" | "female" | "other" }))}
                >
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cellPhone">Cell / Sel *</Label>
                <Input id="cellPhone" name="cellPhone" value={formData.cellPhone} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail / E-pos</Label>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Address / Adres</Label>
                <Input id="address" name="address" value={formData.address} onChange={handleChange} />
              </div>
            </div>

            {/* Guardian (required if patient under 16) */}
            {(() => {
              const dobDate = formData.dateOfBirth ? new Date(formData.dateOfBirth) : null
              const age = dobDate && !isNaN(dobDate.getTime()) ? Math.floor((Date.now() - dobDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null
              const under16 = age !== null && age < 16
              return under16 ? (
                <div className="space-y-4 mt-6 pt-4 border-t">
                  <h3 className="font-medium text-foreground">Guardian / Parent details (required for patients under 16)</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="guardianName">Guardian Name *</Label>
                      <Input
                        id="guardianName"
                        value={formData.guardian.name}
                        onChange={(e) => setFormData((p) => ({ ...p, guardian: { ...p.guardian, name: e.target.value } }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guardianPhone">Guardian Phone *</Label>
                      <Input
                        id="guardianPhone"
                        value={formData.guardian.phone}
                        onChange={(e) => setFormData((p) => ({ ...p, guardian: { ...p.guardian, phone: e.target.value } }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guardianRelationship">Relationship *</Label>
                      <Select
                        value={formData.guardian.relationship}
                        onValueChange={(v) => setFormData((p) => ({ ...p, guardian: { ...p.guardian, relationship: v } }))}
                      >
                        <SelectTrigger id="guardianRelationship">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {RELATIONSHIP_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ) : null
            })()}

          </div>

          {/* Section 2: Person Responsible */}
          <div className="space-y-4">
            <h3 className="font-medium text-foreground">2. Person Responsible for Account / Verantwoordelik</h3>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox onCheckedChange={(value) => handleAccountSameAsPatient(value === true)} />
              Same as patient details above
            </label>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input placeholder="Surname" value={formData.accountResponsible.surname} onChange={(e) => handleNestedChange("accountResponsible", "surname", e.target.value)} />
              <Input placeholder="First Names" value={formData.accountResponsible.firstNames} onChange={(e) => handleNestedChange("accountResponsible", "firstNames", e.target.value)} />
              <Input placeholder="I.D. Number" value={formData.accountResponsible.idNumber} onChange={(e) => handleNestedChange("accountResponsible", "idNumber", e.target.value)} />
              <Input placeholder="Home Address" value={formData.accountResponsible.homeAddress} onChange={(e) => handleNestedChange("accountResponsible", "homeAddress", e.target.value)} />
              <Input placeholder="Postal Address" value={formData.accountResponsible.postalAddress} onChange={(e) => handleNestedChange("accountResponsible", "postalAddress", e.target.value)} />
              <Input placeholder="Employer" value={formData.accountResponsible.employer} onChange={(e) => handleNestedChange("accountResponsible", "employer", e.target.value)} />
              <Input placeholder="Work Address" value={formData.accountResponsible.workAddress} onChange={(e) => handleNestedChange("accountResponsible", "workAddress", e.target.value)} />
              <Input placeholder="Cell" value={formData.accountResponsible.cell} onChange={(e) => handleNestedChange("accountResponsible", "cell", e.target.value)} />
              <Input placeholder="E-mail" value={formData.accountResponsible.email} onChange={(e) => handleNestedChange("accountResponsible", "email", e.target.value)} />
            </div>
          </div>

          {/* Section 3: Medical Aid */}
          <div className="space-y-4">
            <h3 className="font-medium text-foreground">3. Medical Aid / Mediese Fonds</h3>
            <div className="flex items-center gap-6 text-sm">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={formData.paymentMethod === "cash"}
                  onCheckedChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      paymentMethod: value === true ? "cash" : "medical-aid",
                      medicalAidInfo: value === true
                        ? { name: "Cash", memberName: "", memberNumber: "", idNumber: "", cell: "", dependentCode: "", mainMemberName: "", mainMemberIdNumber: "" }
                        : prev.medicalAidInfo,
                    }))
                  }
                />
                Cash
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={formData.paymentMethod === "medical-aid"}
                  onCheckedChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      paymentMethod: value === true ? "medical-aid" : "cash",
                      medicalAidInfo: value === true
                        ? prev.medicalAidInfo
                        : { name: "Cash", memberName: "", memberNumber: "", idNumber: "", cell: "", dependentCode: "", mainMemberName: "", mainMemberIdNumber: "" },
                    }))
                  }
                />
                Medical Aid
              </label>
            </div>
            {formData.paymentMethod === "cash" ? (
              <p className="text-sm text-muted-foreground">Payment Method: Cash</p>
            ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Medical Aid Name</Label>
                <Select
                  value={formData.medicalAidInfo.name}
                  onValueChange={(value) => handleNestedChange("medicalAidInfo", "name", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select medical aid" />
                  </SelectTrigger>
                  <SelectContent>
                    {MEDICAL_AID_SCHEMES.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input placeholder="Dependent Code" value={formData.medicalAidInfo.dependentCode} onChange={(e) => handleNestedChange("medicalAidInfo", "dependentCode", e.target.value)} />
              <Input placeholder="Main Member Name" value={formData.medicalAidInfo.mainMemberName} onChange={(e) => handleNestedChange("medicalAidInfo", "mainMemberName", e.target.value)} />
              <Input placeholder="Main Member ID Number" value={formData.medicalAidInfo.mainMemberIdNumber} onChange={(e) => handleNestedChange("medicalAidInfo", "mainMemberIdNumber", e.target.value)} />
              <Input placeholder="Member's Name" value={formData.medicalAidInfo.memberName} onChange={(e) => handleNestedChange("medicalAidInfo", "memberName", e.target.value)} />
              <Input placeholder="Member Number" value={formData.medicalAidInfo.memberNumber} onChange={(e) => handleNestedChange("medicalAidInfo", "memberNumber", e.target.value)} />
              <Input placeholder="I.D. No." value={formData.medicalAidInfo.idNumber} onChange={(e) => handleNestedChange("medicalAidInfo", "idNumber", e.target.value)} />
              <Input placeholder="Cell" value={formData.medicalAidInfo.cell} onChange={(e) => handleNestedChange("medicalAidInfo", "cell", e.target.value)} />
            </div>
            )}
          </div>

          {/* Section 4: Nearest Family/Friend */}
          <div className="space-y-4">
            <h3 className="font-medium text-foreground">4. Nearest Family/Friend / Naaste Familie</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input placeholder="Name" value={formData.nearestFamilyFriend.name} onChange={(e) => handleNestedChange("nearestFamilyFriend", "name", e.target.value)} />
              <Input placeholder="Surname" value={formData.nearestFamilyFriend.surname} onChange={(e) => handleNestedChange("nearestFamilyFriend", "surname", e.target.value)} />
              <div className="space-y-2">
                <Label>Relationship</Label>
                <Select
                  value={formData.nearestFamilyFriend.relationship}
                  onValueChange={(value) => handleNestedChange("nearestFamilyFriend", "relationship", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIP_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input placeholder="Address" value={formData.nearestFamilyFriend.address} onChange={(e) => handleNestedChange("nearestFamilyFriend", "address", e.target.value)} />
              <Input placeholder="Cell" value={formData.nearestFamilyFriend.cell} onChange={(e) => handleNestedChange("nearestFamilyFriend", "cell", e.target.value)} />
            </div>
          </div>

          {/* Section 6: Family Details */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-foreground">6. Family Details / Familie Besonderhede</h3>
              <Button type="button" variant="outline" size="sm" onClick={addFamilyRow}>
                <Plus className="w-4 h-4 mr-1" />
                Add Row
              </Button>
            </div>
            <div className="space-y-3">
              {formData.familyDetails.map((row, index) => (
                <div key={index} className="grid sm:grid-cols-4 gap-2 items-end">
                  <Input placeholder="Names" value={row.name} onChange={(e) => handleFamilyChange(index, "name", e.target.value)} />
                  <Input placeholder="Surname" value={row.surname} onChange={(e) => handleFamilyChange(index, "surname", e.target.value)} />
                  <Input placeholder="Contact Number" value={row.contactNumber} onChange={(e) => handleFamilyChange(index, "contactNumber", e.target.value)} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeFamilyRow(index)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <LoadingButton type="submit" isLoading={loading} loadingText="Registering..." className="flex-1">
              <UserPlus className="w-4 h-4 mr-2" />
              Register Patient & Add to Waiting List
            </LoadingButton>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
