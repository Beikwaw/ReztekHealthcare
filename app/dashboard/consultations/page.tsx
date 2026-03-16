"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth-context"
import { useConsultations, usePatients } from "@/lib/firestore-hooks"
import Link from "next/link"
import {
  Stethoscope,
  Search,
  FileText,
  Clock,
  Activity,
  Calendar,
  User,
} from "lucide-react"
import { format } from "date-fns"

export default function ConsultationsPage() {
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { consultations, loading } = useConsultations()
  const { patients } = usePatients()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusTab, setStatusTab] = useState(searchParams?.get("status") || "completed")
  const patientFilter = searchParams?.get("patient")

  const isCompletedStatus = (status: string) =>
    status === "confirmed" || status === "pending-review" || status === "sent-to-pharmacy"

  // Filter consultations
  const filteredConsultations = consultations.filter((consultation) => {
    // Filter by patient if query param provided
    if (patientFilter && consultation.patientId !== patientFilter) {
      return false
    }
    if (statusTab === "in-progress" && consultation.status !== "in-progress") {
      return false
    }
    if (statusTab === "completed" && !isCompletedStatus(consultation.status)) {
      return false
    }
    
    const patient = patients.find((p) => p.id === consultation.patientId)
    const searchLower = searchQuery.toLowerCase()
    return (
      consultation.patientName.toLowerCase().includes(searchLower) ||
      consultation.doctorName.toLowerCase().includes(searchLower) ||
      (patient?.name || "").toLowerCase().includes(searchLower)
    )
  })

  // Sort: in-progress first, then by date
  const sortedConsultations = [...filteredConsultations].sort((a, b) => {
    if (a.status === "in-progress" && b.status !== "in-progress") return -1
    if (a.status !== "in-progress" && b.status === "in-progress") return 1
    const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)
    const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)
    return dateB.getTime() - dateA.getTime()
  })

  // Get patient name helper
  const getPatientName = (patientId: string) => {
    const patient = patients.find((p) => p.id === patientId)
    return patient?.name || "Unknown Patient"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-primary" />
            Consultations
          </h1>
          <p className="text-muted-foreground">
            {consultations.length} total consultation{consultations.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/consultations/new">
            <Stethoscope className="w-4 h-4 mr-2" />
            New consultation
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Tabs value={statusTab} onValueChange={setStatusTab} className="w-full sm:w-auto">
              <TabsList>
                <TabsTrigger value="in-progress">In Progress</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by patient name or doctor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Consultations List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Activity className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : sortedConsultations.length > 0 ? (
        <div className="space-y-4">
          {sortedConsultations.map((consultation) => (
            <Card key={consultation.id} className="border-border/50 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Stethoscope className="w-6 h-6 text-primary" />
                    </div>
                    
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">
                          {getPatientName(consultation.patientId)}
                        </h3>
                        <Badge
                          variant={
                            consultation.status === "confirmed"
                              ? "default"
                              : consultation.status === "in-progress"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {consultation.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {consultation.doctorName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {consultation.createdAt instanceof Date
                            ? format(consultation.createdAt, "MMM d, yyyy")
                            : format(new Date(consultation.createdAt), "MMM d, yyyy")}
                        </span>
                        {consultation.finalDiagnosis && (
                          <span className="text-foreground">
                            Diagnosis: {consultation.finalDiagnosis}
                          </span>
                        )}
                      </div>
                      {consultation.aiSummary && (
                        <p className="text-sm text-foreground/80 line-clamp-2">
                          {consultation.aiSummary}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {consultation.status === "in-progress" ? (
                      <Button size="sm" variant="default" asChild>
                        <Link href={`/dashboard/consultations/${consultation.id}`}>
                          <Stethoscope className="w-4 h-4 mr-1" />
                          Continue Consultation
                        </Link>
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/dashboard/consultations/${consultation.id}`}>
                          <FileText className="w-4 h-4 mr-1" />
                          View Details
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-border/50">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Stethoscope className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No Consultations</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? "No consultations match your search criteria."
                : "No consultations have been created yet."}
            </p>
            <Button asChild>
              <Link href="/dashboard/waiting">
                <Clock className="w-4 h-4 mr-2" />
                View Waiting Patients
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

