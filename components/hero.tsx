"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowRight, 
  Clock, 
  MapPin, 
  Shield, 
  Heart,
  Stethoscope,
  Users,
  CheckCircle2
} from "lucide-react"

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/10" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/10 to-transparent" />
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]" 
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23000000' fillOpacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}
        />
      </div>

      {/* Floating Elements */}
      <div className="absolute top-32 left-10 w-20 h-20 rounded-2xl bg-primary/10 blur-xl animate-pulse" />
      <div className="absolute bottom-32 right-20 w-32 h-32 rounded-full bg-accent/20 blur-2xl animate-pulse delay-1000" />
      <div className="absolute top-1/2 right-1/4 w-16 h-16 rounded-full bg-primary/5 blur-lg" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Column - Text Content */}
          <div className="space-y-8">
            <Badge variant="secondary" className="px-4 py-2 text-sm font-medium">
              <Shield className="w-4 h-4 mr-2" />
              Trusted Healthcare Since 2005
            </Badge>

            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] tracking-tight">
                Your Health,{" "}
                <span className="text-primary relative">
                  Our Priority
                  <svg 
                    className="absolute -bottom-2 left-0 w-full" 
                    viewBox="0 0 200 12" 
                    fill="none"
                  >
                    <path 
                      d="M2 8.5C47.5 3.5 95.5 2.5 198 9.5" 
                      stroke="currentColor" 
                      strokeWidth="3" 
                      strokeLinecap="round"
                      className="text-primary/30"
                    />
                  </svg>
                </span>
              </h1>

              <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
                Reztek Healthcare Practice provides comprehensive primary care services
                with a patient-centered approach. Experience quality medical care powered
                by modern technology in a welcoming environment.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="#contact">
                <Button size="lg" className="text-base h-12 px-6 w-full sm:w-auto">
                  Book an Appointment
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="#services">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="text-base h-12 px-6 bg-transparent w-full sm:w-auto"
                >
                  View Our Services
                </Button>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center gap-6 pt-4">
              {[
                { icon: Users, label: "5000+ Patients" },
                { icon: CheckCircle2, label: "20+ Years Experience" },
                { icon: Stethoscope, label: "Medical Aid Accepted" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <item.icon className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Feature Cards */}
          <div className="relative lg:pl-8">
            {/* Main Card */}
            <div className="relative bg-card rounded-3xl border border-border shadow-2xl shadow-primary/5 p-8 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
                  <Heart className="w-7 h-7 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-card-foreground">Complete Healthcare</h3>
                  <p className="text-sm text-muted-foreground">All services under one roof</p>
                </div>
              </div>

              {/* Info Items */}
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-card-foreground">Opening Hours</p>
                    <p className="text-sm text-muted-foreground">Mon - Fri: 8:00 AM - 5:00 PM</p>
                    <p className="text-sm text-muted-foreground">Saturday: 8:00 AM - 1:00 PM</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-card-foreground">Location</p>
                    <p className="text-sm text-muted-foreground">123 Healthcare Street</p>
                    <p className="text-sm text-muted-foreground">Johannesburg, South Africa</p>
                  </div>
                </div>
              </div>

              {/* Quick Contact */}
              <div className="pt-2">
                <Link href="/login" className="block">
                  <Button variant="outline" className="w-full bg-transparent">
                    Staff Portal Access
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Floating Badge */}
            <div className="absolute -top-4 -right-4 bg-accent text-accent-foreground px-4 py-2 rounded-full text-sm font-medium shadow-lg">
              Now with AI-Assisted Diagnosis
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
