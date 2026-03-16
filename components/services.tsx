"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Stethoscope,
  Heart,
  Baby,
  Syringe,
  Activity,
  FileText,
  Brain,
  Pill,
} from "lucide-react"

const services = [
  {
    icon: Stethoscope,
    title: "General Consultations",
    description: "Comprehensive medical consultations for all ages with thorough examinations and personalized care plans.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Heart,
    title: "Chronic Disease Management",
    description: "Ongoing care for diabetes, hypertension, and other chronic conditions with regular monitoring.",
    color: "bg-rose-100 text-rose-600",
  },
  {
    icon: Baby,
    title: "Family Health",
    description: "Complete healthcare services for the whole family, from pediatrics to geriatric care.",
    color: "bg-blue-100 text-blue-600",
  },
  {
    icon: Syringe,
    title: "Vaccinations",
    description: "Full range of immunizations including flu shots, travel vaccines, and childhood vaccinations.",
    color: "bg-amber-100 text-amber-600",
  },
  {
    icon: Activity,
    title: "Health Screenings",
    description: "Preventive health checks, blood tests, and early detection screenings for peace of mind.",
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    icon: FileText,
    title: "Medical Certificates",
    description: "Sick notes, fitness certificates, and other medical documentation when you need it.",
    color: "bg-indigo-100 text-indigo-600",
  },
  {
    icon: Brain,
    title: "Mental Health Support",
    description: "Compassionate support for stress, anxiety, and depression with appropriate referrals when needed.",
    color: "bg-purple-100 text-purple-600",
  },
  {
    icon: Pill,
    title: "Prescription Services",
    description: "In-house pharmacy with convenient prescription filling and medication management.",
    color: "bg-cyan-100 text-cyan-600",
  },
]

export function Services() {
  return (
    <section id="services" className="py-20 lg:py-32 bg-muted/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="secondary" className="mb-4">Our Services</Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6 text-balance">
            Comprehensive Healthcare Services
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            From routine check-ups to chronic disease management, we provide a full spectrum 
            of medical services tailored to your individual needs.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service) => (
            <Card 
              key={service.title} 
              className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 bg-card"
            >
              <CardContent className="p-6 space-y-4">
                <div className={`w-12 h-12 rounded-xl ${service.color} flex items-center justify-center transition-transform group-hover:scale-110`}>
                  <service.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-card-foreground mb-2">{service.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{service.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-4">
            Not sure which service you need? Contact us for guidance.
          </p>
          <a 
            href="tel:+27123456789" 
            className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
          >
            Call us at +27 12 345 6789
          </a>
        </div>
      </div>
    </section>
  )
}
