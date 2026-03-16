"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { useData } from "@/lib/data-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, FileText } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

export default function MedicalRecordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { medicalRecords, getPatient, doctors } = useData()

  const record = medicalRecords.find((r) => r.id === id)

  if (!record) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold mb-2">Record Not Found</h2>
        <p className="text-muted-foreground mb-4">The medical record you're looking for doesn't exist.</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    )
  }

  const patient = getPatient(record.patientId)
  const doctor = doctors.find((d) => d.id === record.doctorId)

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Medical Record</h1>
          <p className="text-muted-foreground">
            {format(new Date(record.date), "MMMM d, yyyy")}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Patient & Visit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Patient</p>
              <p className="font-medium">{patient?.name || "Unknown Patient"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Doctor</p>
              <p className="font-medium">{doctor?.name || "Unknown Doctor"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Visit Date</p>
              <p className="font-medium">{format(new Date(record.date), "MMM d, yyyy")}</p>
            </div>
          </div>
          {(record as { pdfStorageUrl?: string }).pdfStorageUrl && (
            <div className="pt-3 border-t mt-3">
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={(record as { pdfStorageUrl?: string }).pdfStorageUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View consultation summary PDF
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clinical Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="text-muted-foreground">Chief Complaint</p>
            <p className="font-medium">{record.chiefComplaint}</p>
          </div>
          <Separator />
          <div>
            <p className="text-muted-foreground">Symptoms</p>
            {record.symptoms.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-2">
                {record.symptoms.map((symptom, index) => (
                  <Badge key={index} variant="secondary">
                    {symptom}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No symptoms recorded</p>
            )}
          </div>
          <Separator />
          <div>
            <p className="text-muted-foreground">Examination</p>
            <p className="whitespace-pre-wrap">{record.examination}</p>
          </div>
          <Separator />
          <div>
            <p className="text-muted-foreground">Diagnosis</p>
            <p className="font-medium">{record.diagnosis}</p>
          </div>
          <Separator />
          <div>
            <p className="text-muted-foreground">Treatment</p>
            <p className="whitespace-pre-wrap">{record.treatment}</p>
          </div>
          {record.notes && (
            <>
              <Separator />
              <div>
                <p className="text-muted-foreground">Notes</p>
                <p className="whitespace-pre-wrap">{record.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
