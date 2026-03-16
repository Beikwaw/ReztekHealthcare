"use client"

import { useData } from "@/lib/data-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { format } from "date-fns"
import type { AppointmentStatus } from "@/lib/types"
import { Eye } from "lucide-react"
import Link from "next/link"

const statusColors: Record<AppointmentStatus, string> = {
  scheduled: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  confirmed: "bg-green-100 text-green-800 hover:bg-green-100",
  "in-progress": "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  completed: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  cancelled: "bg-red-100 text-red-800 hover:bg-red-100",
  "no-show": "bg-orange-100 text-orange-800 hover:bg-orange-100",
}

interface AppointmentsTableProps {
  limit?: number
  showViewAll?: boolean
}

export function AppointmentsTable({ limit, showViewAll = true }: AppointmentsTableProps) {
  const { appointments, patients } = useData()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcomingAppointments = appointments
    .filter((apt) => {
      const aptDate = new Date(apt.date)
      aptDate.setHours(0, 0, 0, 0)
      return aptDate >= today && apt.status !== "cancelled"
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, limit)

  const getPatientName = (patientId: string) => {
    const patient = patients.find((p) => p.id === patientId)
    return patient?.name || "Unknown Patient"
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {upcomingAppointments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No upcoming appointments
                </TableCell>
              </TableRow>
            ) : (
              upcomingAppointments.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell className="font-medium">
                    {getPatientName(appointment.patientId)}
                  </TableCell>
                  <TableCell>
                    {format(new Date(appointment.date), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>{appointment.startTime}</TableCell>
                  <TableCell className="capitalize">
                    {appointment.type.replace("-", " ")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusColors[appointment.status]}>
                      {appointment.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/appointments/${appointment.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {showViewAll && (
        <div className="flex justify-center">
          <Button variant="outline" asChild>
            <Link href="/dashboard/appointments">View All Appointments</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
