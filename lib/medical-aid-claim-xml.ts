/**
 * XML builder for Medical Aid claim export.
 * Produces a structured XML file per user specification.
 */

import type { MedicalAidClaim } from "./types"

const PRACTICE_NAME = "Reztek Healthcare Practice"
const DOCTOR_NAME = "Treating Practitioner"
const PRACTICE_NUMBER = "0000000"
const HPCSA_NUMBER = "0000000"
const DEFAULT_PROCEDURE_CODE = "ECR"
const CONSULTATION_TYPE = "GP Outpatient Consultation"

function escapeXml(str: string): string {
  if (!str || typeof str !== "string") return ""
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function toDate(value: unknown): string {
  if (!value) return ""
  if (value instanceof Date) return value.toISOString().split("T")[0] ?? ""
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const d = (value as { toDate: () => Date }).toDate()
    return d instanceof Date ? d.toISOString().split("T")[0] ?? "" : ""
  }
  if (typeof value === "string") return value.split("T")[0] ?? ""
  return ""
}

export function buildMedicalAidClaimXml(claim: MedicalAidClaim): string {
  const patientFullName =
    claim.patientName || `${claim.firstName ?? ""} ${claim.lastName ?? ""}`.trim() || "—"
  const idNumber = claim.idNumber ?? ""
  const patientDob = toDate(claim.patientDateOfBirth)
  const dependentCode = (claim as { dependentCode?: string }).dependentCode ?? ""

  const schemeName = claim.schemeName ?? ""
  const membershipNumber = claim.membershipNumber ?? ""
  const plan = (claim as { plan?: string }).plan ?? ""

  const consultationDate = toDate(claim.consultationDate ?? claim.dateOfService)
  const diagnosis =
    claim.diagnosisLines && claim.diagnosisLines.length > 0
      ? claim.diagnosisLines.map((d) => d.line).join("; ")
      : claim.clinicalSummaryShort ?? ""
  const icd10Code = claim.icd10Code ?? ""

  const billItems = claim.billItems && claim.billItems.length > 0
    ? claim.billItems
    : [{ description: "Consultation", amount: claim.billAmount ?? claim.totalAmountClaimed ?? 0 }]
  const totalAmount = billItems.reduce((sum, i) => sum + (i.amount ?? 0), 0)

  const doctorName = claim.createdByName ?? DOCTOR_NAME
  const practiceNumber = claim.practiceNumber ?? PRACTICE_NUMBER
  const hpcsaNumber = HPCSA_NUMBER
  const procedureCodes = claim.procedureCode ?? (claim.proceduresText?.trim() || DEFAULT_PROCEDURE_CODE)

  const itemsXml = billItems
    .map(
      (item) =>
        `    <Item><Description>${escapeXml(item.description)}</Description><Amount>${Number(item.amount ?? 0).toFixed(2)}</Amount></Item>`
    )
    .join("\n")

  return `<?xml version="1.0" encoding="UTF-8"?>
<MedicalAidClaim>
  <PracticeDoctor>
    <DoctorName>${escapeXml(doctorName)}</DoctorName>
    <PracticeName>${escapeXml(PRACTICE_NAME)}</PracticeName>
    <PracticeNumber>${escapeXml(practiceNumber)}</PracticeNumber>
    <HpcsaNumber>${escapeXml(hpcsaNumber)}</HpcsaNumber>
  </PracticeDoctor>
  <Patient>
    <FullName>${escapeXml(patientFullName)}</FullName>
    <IdNumber>${escapeXml(idNumber)}</IdNumber>
    <DateOfBirth>${escapeXml(patientDob)}</DateOfBirth>
    <DependentCode>${escapeXml(dependentCode)}</DependentCode>
  </Patient>
  <MedicalAid>
    <SchemeName>${escapeXml(schemeName)}</SchemeName>
    <MembershipNumber>${escapeXml(membershipNumber)}</MembershipNumber>
    <Plan>${escapeXml(plan)}</Plan>
  </MedicalAid>
  <Consultation>
    <ConsultationDate>${escapeXml(consultationDate)}</ConsultationDate>
    <ConsultationType>${escapeXml(CONSULTATION_TYPE)}</ConsultationType>
    <Diagnosis>${escapeXml(diagnosis)}</Diagnosis>
    <Icd10Code>${escapeXml(icd10Code)}</Icd10Code>
  </Consultation>
  <Billing>
    <ProcedureCodes>${escapeXml(procedureCodes)}</ProcedureCodes>
    <Items>
${itemsXml}
    </Items>
    <TotalClaimAmount>${totalAmount.toFixed(2)}</TotalClaimAmount>
  </Billing>
</MedicalAidClaim>
`
}
