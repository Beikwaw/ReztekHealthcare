"use client"

import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Award, GraduationCap, Users, Sparkles } from "lucide-react"

const qualifications = [
  { icon: GraduationCap, text: "MBChB - University of Cape Town" },
  { icon: Award, text: "Registered with HPCSA" },
  { icon: Users, text: "Member of SAMA" },
  { icon: Sparkles, text: "Over 20 years of experience" },
]

const values = [
  {
    title: "Patient-Centered Care",
    description: "Every patient receives personalized attention and care tailored to their unique health needs and circumstances.",
  },
  {
    title: "Modern Technology",
    description: "We use AI-assisted diagnostics and digital record systems to provide accurate and efficient healthcare.",
  },
  {
    title: "Accessible Healthcare",
    description: "Quality medical care should be accessible to all. We accept various medical aids and offer competitive rates.",
  },
]

export function About() {
  return (
    <section id="about" className="py-20 lg:py-32 bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Column */}
          <div className="space-y-8">
            <div>
              <Badge variant="secondary" className="mb-4">About Us</Badge>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground text-balance mb-6">
                Dedicated to Your Health and Wellbeing
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Reztek Healthcare Practice has been serving the community with compassionate,
                high-quality healthcare for many years. Our team combines
                modern medical expertise with a warm, welcoming environment where
                patients feel comfortable and genuinely cared for.
              </p>
            </div>

            {/* Qualifications */}
            <div className="grid sm:grid-cols-2 gap-4">
              {qualifications.map((qual) => (
                <div 
                  key={qual.text} 
                  className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border/50"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <qual.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{qual.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Values */}
          <div className="space-y-6">
            {values.map((value, index) => (
              <div
                key={value.title}
                className="group p-6 bg-card rounded-2xl border border-border hover:shadow-lg hover:border-primary/20 transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <span className="text-primary font-bold text-lg group-hover:text-primary-foreground">{index + 1}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-card-foreground mb-2">{value.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {value.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 pt-4">
              {[
                { value: "5000+", label: "Patients" },
                { value: "20+", label: "Years" },
                { value: "98%", label: "Satisfaction" },
              ].map((stat) => (
                <div key={stat.label} className="text-center p-4 rounded-xl bg-accent/50">
                  <p className="text-2xl font-bold text-primary">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
