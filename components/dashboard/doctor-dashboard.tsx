"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import { usePatients, useConsultations } from "@/lib/firestore-hooks"
import Link from "next/link"
import {
  Users,
  Stethoscope,
  Clock,
  CalendarDays,
  ArrowRight,
  Activity,
  FileText,
  Brain,
} from "lucide-react"

export function DoctorDashboard() {
  const { user } = useAuth()
  const { patients, loading: patientsLoading } = usePatients()
  const { consultations, loading: consultationsLoading } = useConsultations()
  
  // Get waiting patients
  const waitingPatients = patients.filter(p => p.status === "waiting")
  
  // Get in-consultation patients
  const inConsultation = patients.filter(p => p.status === "in-consultation")
  
  // Get today's consultations
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStart = today
  const todayConsultations = consultations.filter((c) => {
    if (!c.createdAt) return false
    const createdAt = c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt)
    return createdAt >= todayStart
  })

  const stats = [
    {
      title: "Waiting Patients",
      value: waitingPatients.length,
      icon: Clock,
      color: "bg-amber-500",
      description: "Patients in queue",
    },
    {
      title: "In Consultation",
      value: inConsultation.length,
      icon: Stethoscope,
      color: "bg-blue-500",
      description: "Currently seeing",
    },
    {
      title: "Today's Consultations",
      value: todayConsultations.length,
      icon: FileText,
      color: "bg-emerald-500",
      description: "Completed today",
    },
    {
      title: "Total Patients",
      value: patients.length,
      icon: Users,
      color: "bg-primary",
      description: "In the system",
    },
  ]

  const loading = patientsLoading || consultationsLoading

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, Dr. {user?.name?.split(" ").pop()}
          </h1>
          <p className="text-muted-foreground">
            Here's your patient overview for today.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/waiting">
            <Users className="w-4 h-4 mr-2" />
            View Waiting List ({waitingPatients.length})
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-border/50">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions & Waiting Patients */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link 
              href="/dashboard/waiting"
              className="flex items-center justify-between p-4 rounded-xl bg-amber-500/5 hover:bg-amber-500/10 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Next Patient</p>
                  <p className="text-sm text-muted-foreground">See next patient in queue</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-amber-500 transition-colors" />
            </Link>
            
            <Link 
              href="/dashboard/consultations"
              className="flex items-center justify-between p-4 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">View Consultations</p>
                  <p className="text-sm text-muted-foreground">Review past consultations</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>

            <Link 
              href="/dashboard/patients"
              className="flex items-center justify-between p-4 rounded-xl bg-blue-500/5 hover:bg-blue-500/10 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-foreground">All Patients</p>
                  <p className="text-sm text-muted-foreground">View patient records</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-blue-500 transition-colors" />
            </Link>
          </CardContent>
        </Card>

        {/* Waiting Patients Preview */}
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Waiting Patients</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/waiting">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Activity className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : waitingPatients.length > 0 ? (
              <div className="space-y-3">
                {waitingPatients.slice(0, 4).map((patient, index) => (
                  <div
                    key={patient.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <span className="text-amber-700 font-medium text-sm">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">
                          {patient.name || "Unknown Patient"}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {patient.patientNumber ? `ID: ${patient.patientNumber}` : "General consultation"}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/dashboard/consultations/new?patient=${patient.id}`}>
                        Start Consultation
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">No patients waiting</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Features Banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                <Brain className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">AI-Powered Consultations</h3>
                <p className="text-sm text-muted-foreground">
                  Get AI-generated summaries and treatment suggestions during consultations
                </p>
              </div>
            </div>
            <Badge className="bg-primary/20 text-primary hover:bg-primary/30 w-fit">
              Available
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
