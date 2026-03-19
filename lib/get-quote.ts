import { z } from "zod"

export const QUOTE_PRICING = {
  monthlyCostZar: 2750,
  setupFeeZar: 3500,
} as const

export const PRACTICE_TYPES = ["GP", "Specialist", "Clinic", "Other"] as const

export const PRACTICE_COUNTRIES: string[] = [
  "South Africa",
  "Namibia",
  "Botswana",
  "Zimbabwe",
  "Mozambique",
  "Lesotho",
  "Eswatini",
  "Zambia",
  "Malawi",
  "Angola",
  "Nigeria",
  "Kenya",
  "Ghana",
  "Ethiopia",
  "Tanzania",
  "Uganda",
  "Rwanda",
  "United Kingdom",
  "Ireland",
  "Germany",
  "Netherlands",
  "France",
  "Spain",
  "Portugal",
  "United States",
] as const

export const SOUTH_AFRICA_PROVINCES: string[] = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
  "Western Cape",
] as const

export const doctorLeadSchema = z.object({
  name: z.string().trim().min(1, "Full Name is required"),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z.string().trim().min(7, "Enter a valid phone number"),

  practiceName: z.string().trim().min(1, "Practice Name is required"),
  location: z.string().trim().optional().default(""),
  practiceCountry: z.string().trim().min(1).default("South Africa"),
  practiceProvince: z.string().trim().optional().default(""),
  practiceType: z.enum(PRACTICE_TYPES).default("GP"),
  specialization: z.string().trim().min(1, "Specialization is required"),

  doctors: z.coerce.number().int().min(0).optional().default(0),
  staff: z.coerce.number().int().min(0).optional().default(0),
  patientsPerDay: z.coerce.number().int().min(0).optional().default(0),
  averageConsultationMinutes: z.coerce.number().int().min(1).optional().default(20),
  yearsInOperation: z.coerce.number().int().min(0).optional().default(0),

  hasSystem: z.enum(["Yes", "No"]).default("No"),
  currentSystem: z.string().trim().optional().default(""),

  additionalNotes: z.string().trim().optional().default(""),
})

export type DoctorLeadInput = z.infer<typeof doctorLeadSchema>

export const doctorLeadStoredSchema = doctorLeadSchema.extend({
  createdAt: z.any().optional(),
  aiSummary: z.string().optional(),
})

export type DoctorLeadStored = z.infer<typeof doctorLeadStoredSchema> & { id: string }

export const demoRequestSchema = z.object({
  leadId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  practiceName: z.string().trim().min(1),
  date: z.string().trim().min(1, "Preferred Date is required"),
  time: z.string().trim().min(1, "Preferred Time is required"),
  address: z.string().trim().min(1, "Practice Address is required"),
})

export type DemoRequestInput = z.infer<typeof demoRequestSchema>

export const INCLUDED_FEATURES: string[] = [
  "Secure Cloud Hosting",
  "System Deployment & Maintenance",
  "System Administration Support",
  "Advanced Security & Data Protection",
  "AI (clinical artificail intellegence)",
  "Patient Management System",
  "Access to patient records",
  "Appointment Scheduling System",
  "Complete Medical Aid Claim and billing Integration",
  "Reporting & Analytics Dashboard",
]

export const OUTCOME_BENEFITS: string[] = [
  "Reduces consultation time from 20+ minutes to 10+ minutes",
  "Speeds up medical aid claims and billing",
  "Allows doctors to see more patients per day",
  "Reduces administrative workload",
  "Centralized and secure patient records",
  "AI-assisted clinical support",
]

export const INCLUDED_FEATURE_DESCRIPTIONS: Record<string, string> = {
  "Secure Cloud Hosting": "Keeps your practice data available, encrypted, and accessible securely from any approved location.",
  "System Deployment & Maintenance": "Reztek handles setup, updates, and ongoing maintenance so your team stays focused on patients.",
  "System Administration Support": "Get support for user setup, permissions, and day-to-day administration tasks.",
  "Advanced Security & Data Protection": "Protects sensitive healthcare records with security controls aligned to healthcare data standards.",
  "AI (clinical artificail intellegence)": "Provides intelligent assistance to reduce repetitive admin and support faster clinical workflows.",
  "Patient Management System": "Centralizes patient profiles, visits, billing context, and related operational information.",
  "Access to patient records": "Enables fast retrieval of patient history and documentation when and where you need it.",
  "Appointment Scheduling System": "Helps your team schedule, track, and manage appointments with less manual coordination.",
  "Complete Medical Aid Claim and billing Integration": "Supports streamlined claims and billing workflows to reduce delays and revenue leakage.",
  "Reporting & Analytics Dashboard": "Gives visibility into practice performance, workload, and operational trends for better decisions.",
}

export const OUTCOME_BENEFIT_DESCRIPTIONS: Record<string, string> = {
  "Reduces consultation time from 20+ minutes to 10+ minutes": "By automating admin and surfacing key data quickly, clinicians spend less time on non-clinical steps.",
  "Speeds up medical aid claims and billing": "Standardized data capture and integrated billing flows reduce rework and submission delays.",
  "Allows doctors to see more patients per day": "Shorter consultation cycles and less admin overhead increase practical daily patient capacity.",
  "Reduces administrative workload": "Removes manual duplication across records, scheduling, and billing operations.",
  "Centralized and secure patient records": "All relevant patient information is organized in one secure system for faster access.",
  "AI-assisted clinical support": "Actionable prompts and summaries support consistent documentation and operational efficiency.",
}

export const DATA_SECURITY_NOTICE =
  "All patient and practice data is highly protected, securely stored, and handled with strict confidentiality in compliance with healthcare data standards."

export const ABOUT_REZTEK =
  "We are an established software development company specializing in healthcare solutions. Our systems are designed to improve efficiency, accuracy, and scalability within modern medical practices."

export const CONTACT_DETAILS = {
  email: "reztekportal@gmail.com",
  phone: "0671282486",
  altPhone: "0833696774",
} as const

