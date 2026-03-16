### Firestore schemas (Reztek Healthcare Practice)

This document describes the key fields and types that the app expects for core Firestore collections. The normalization CLI (`npm run firestore:normalize`) helps align existing documents to these shapes, but you can also use this as a reference when creating / editing documents in the Firebase console.

All timestamps are stored in Firestore as `Timestamp` values and converted to `Date` objects in the app using helper functions in `lib/firebase.ts`.

---

### Collection: `appointments`

- **Required fields**
  - **patientId**: `string`
  - **patientName**: `string` (display name in dashboards and detail pages)
  - **doctorId**: `string` (optional but recommended)
  - **doctorName**: `string` (used across UI; defaults to “Reztek Healthcare Practitioner” when missing)
  - **date**: `Timestamp` – calendar date of the appointment
  - **createdAt**: `Timestamp` – when the appointment was created
  - **updatedAt**: `Timestamp` – last update time
  - **status**: `string` – one of `"scheduled" | "in-progress" | "completed" | "cancelled"` (UI generally expects a non‑empty string)

- **Common optional fields**
  - **reason**: `string` – reason for visit / notes
  - **startTime** / **endTime**: `string` – time-of-day (e.g. `"09:00"`)
  - **consultationId**: `string` – link to `consultations` entry

- **Example shape for a single document (e.g. `appointments/4oCqh4IQX3P05pXRsH9w`)**

```json
{
  "patientId": "patient-123",
  "patientName": "Sample Patient",
  "doctorId": "doctor-001",
  "doctorName": "Reztek Healthcare Practitioner",
  "date": "Timestamp(...)",
  "startTime": "09:00",
  "status": "scheduled",
  "createdAt": "Timestamp(...)",
  "updatedAt": "Timestamp(...)"
}
```

To verify this specific appointment in the console:

1. Open the `appointments` collection.
2. Select document `4oCqh4IQX3P05pXRsH9w`.
3. Ensure `date`, `createdAt`, and `updatedAt` are Firestore Timestamps, and that `patientId`, `patientName`, and `status` are present and non‑empty.

You can also run:

- `npm run firestore:normalize -- --collection appointments --dry-run`

to see if the CLI suggests any updates for this document before applying them with `--fix`.

---

### Collection: `patients`

- **Required fields**
  - **name**: `string`
  - **createdAt**: `Timestamp`

- **Common optional fields**
  - **dateOfBirth**: `Timestamp`
  - **dateRegistered**: `Timestamp`
  - **lastVisitDate**: `Timestamp`
  - **visitHistory**: `Timestamp[]`
  - **email**: `string`
  - **phone**: `string`
  - **address**: `string`
  - **patientNumber**: `string`
  - **paymentMethod**: `string` – e.g. `"cash"` or `"medical-aid"`
  - **medicalAidInfo** / **insuranceInfo**: structured objects used in dashboards and emails

---

### Collection: `users`

- **Required fields**
  - **email**: `string`
  - **name**: `string`
  - **role**: `string` – e.g. `"admin" | "doctor" | "clerk" | "pharmacy"` (normalizer defaults to `"clerk"` when missing)

- **Common optional fields**
  - **phone**: `string`
  - **createdAt**: `Timestamp`
  - **lastMfaVerifiedAt**: `Timestamp`

---

### Collection: `invoices`

- **Required fields**
  - **patientId**: `string`
  - **createdAt**: `Timestamp`
  - **dueDate**: `Timestamp`
  - **subtotal**: `number`
  - **total**: `number`

- **Common optional fields**
  - **paidDate**: `Timestamp | null`
  - **discount**: `number`
  - **items**: `Array<{ description: string; quantity: number; unitPrice: number; total: number }>`

The invoice PDF generation in `lib/invoice-pdf.ts` and `lib/invoice-pdf-server.ts` expects `items`, `subtotal`, `discount`, and `total` to be consistent.

---

### Collection: `consultations`

- **Required fields**
  - **patientId**: `string`
  - **patientName**: `string`
  - **createdAt**: `Timestamp`
  - **updatedAt**: `Timestamp`

- **Common optional fields**
  - **doctorName**: `string`
  - **status**: `string` – e.g. `"pending" | "in-progress" | "completed"`
  - **confirmedAt**: `Timestamp`
  - **pdfSentAt**: `Timestamp`
  - **appointmentId**: `string`
  - **scriptText** / **prescription**: data used by the prescription PDF/email flows

---

### Collection: `medicalAidClaims`

- **Required fields**
  - **patientId**: `string`
  - **schemeName**: `string`
  - **membershipNumber**: `string`
  - **consultationDate**: `Timestamp`
  - **dateOfService**: `Timestamp`
  - **createdAt**: `Timestamp`

- **Common optional fields**
  - **patientName** / **firstName** / **lastName**
  - **idNumber**
  - **patientDateOfBirth**: `Timestamp`
  - **practiceNumber**: `string` (normalized to `"0000000"` by the CLI if missing)
  - **icd10Code**: `string`
  - **clinicalSummaryShort**: `string`
  - **servicesRendered**: `string`
  - **billAmount** / **totalAmountClaimed**: `number`
  - **diagnosisLines** / **materials** / **medications**: structured objects used by the medical‑aid PDFs and XML builder

---

### Collection: `pharmacyOrders`

- **Required fields**
  - **patientId**: `string`
  - **consultationId**: `string`
  - **createdAt**: `Timestamp`
  - **status**: `string` – e.g. `"pending" | "dispensed"`

- **Common optional fields**
  - **dispensedAt**: `Timestamp`
  - **pharmacyUserId** / **pharmacyUserName**

---

### Collection: `notifications`

- **Required fields**
  - **userId**: `string`
  - **createdAt**: `Timestamp`

- **Common optional fields**
  - **read**: `boolean` (defaults to `false` when missing)
  - **type**: `string`
  - **title** / **message**: `string`

---

### Collection: `deletionRequests`

- **Required fields**
  - **patientId**: `string`
  - **requestedByUserId**: `string`
  - **requestedByName**: `string`
  - **status**: `string` – `"pending" | "completed | "rejected"` (normalizer defaults to `"pending"`)
  - **createdAt**: `Timestamp`

- **Common optional fields**
  - **patientName**: `string`
  - **completedAt**: `Timestamp`

