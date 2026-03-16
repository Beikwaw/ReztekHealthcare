"use client"

import { useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useAppointments, usePatients } from "@/lib/firestore-hooks"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { format, isToday, isTomorrow, isThisWeek } from "date-fns"
import {
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Activity,
} from "lucide-react"
import type { AppointmentStatus } from "@/lib/types"
import Loading from "./loading"

const statusColors: Record<AppointmentStatus, string> = {
  scheduled: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  confirmed: "bg-green-100 text-green-800 hover:bg-green-100",
  "in-progress": "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  completed: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  cancelled: "bg-red-100 text-red-800 hover:bg-red-100",
  "no-show": "bg-orange-100 text-orange-800 hover:bg-orange-100",
}

export default function AppointmentsPage() {
  const { appointments, updateAppointment, loading: appointmentsLoading } = useAppointments()
  const { patients, loading: patientsLoading } = usePatients()
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(searchParams?.get("search") || "")
  const [statusFilter, setStatusFilter] = useState<string>(searchParams?.get("status") || "all")
  const [dateFilter, setDateFilter] = useState<string>(searchParams?.get("date") || "all")
  const loading = appointmentsLoading || patientsLoading

  const getPatientName = (patientId: string) => {
    const patient = patients.find((p) => p.id === patientId)
    return patient?.name || "Unknown Patient"
  }

  const filterByDate = (date: Date) => {
    const aptDate = new Date(date)
    switch (dateFilter) {
      case "today":
        return isToday(aptDate)
      case "tomorrow":
        return isTomorrow(aptDate)
      case "this-week":
        return isThisWeek(aptDate)
      case "upcoming":
        return aptDate >= new Date()
      case "past":
        return aptDate < new Date()
      default:
        return true
    }
  }

  const filteredAppointments = appointments
    .filter((apt) => {
      const patientName = getPatientName(apt.patientId).toLowerCase()
      const matchesSearch =
        patientName.includes(searchQuery.toLowerCase()) ||
        apt.reason.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === "all" || apt.status === statusFilter
      const matchesDate = filterByDate(apt.date)
      return matchesSearch && matchesStatus && matchesDate
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const handleStatusChange = (appointmentId: string, newStatus: AppointmentStatus) => {
    updateAppointment(appointmentId, { status: newStatus })
  }

  const isDoctor = user?.role === "doctor"

  const getDateLabel = (date: Date) => {
    if (isToday(new Date(date))) return "Today"
    if (isTomorrow(new Date(date))) return "Tomorrow"
    return format(new Date(date), "MMM d, yyyy")
  }

  // Statistics
  const todayCount = appointments.filter((apt) => isToday(new Date(apt.date))).length
  const upcomingCount = appointments.filter(
    (apt) => new Date(apt.date) >= new Date() && apt.status !== "cancelled"
  ).length
  const completedThisMonth = appointments.filter(
    (apt) =>
      apt.status === "completed" &&
      new Date(apt.date).getMonth() === new Date().getMonth()
  ).length

  return (
    <Suspense fallback={<Loading />}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Appointments</h1>
            <p className="text-muted-foreground">Manage and schedule patient appointments</p>
          </div>
          <Button asChild>
            <Link href="/dashboard/appointments/new">
              <Plus className="mr-2 h-4 w-4" />
              New Appointment
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-full bg-blue-100">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{todayCount}</p>
                  <p className="text-sm text-muted-foreground">Today's Appointments</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-full bg-green-100">
                  <Clock className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{upcomingCount}</p>
                  <p className="text-sm text-muted-foreground">Upcoming Appointments</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-full bg-gray-100">
                  <CheckCircle className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{completedThisMonth}</p>
                  <p className="text-sm text-muted-foreground">Completed This Month</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <CardTitle>All Appointments</CardTitle>
                <CardDescription>
                  {filteredAppointments.length} appointments found
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-full sm:w-48"
                  />
                </div>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue placeholder="Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="tomorrow">Tomorrow</SelectItem>
                    <SelectItem value="this-week">This Week</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="past">Past</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="no-show">No Show</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Activity className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="hidden sm:table-cell">Time</TableHead>
                    <TableHead className="hidden md:table-cell">Type</TableHead>
                    <TableHead className="hidden lg:table-cell">Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAppointments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No appointments found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAppointments.map((appointment) => (
                      <TableRow key={appointment.id}>
                        <TableCell>
                          <Link
                            href={`/dashboard/patients/${appointment.patientId}`}
                            className="font-medium hover:underline"
                          >
                            {getPatientName(appointment.patientId)}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <span className={isToday(new Date(appointment.date)) ? "font-semibold text-primary" : ""}>
                            {getDateLabel(appointment.date)}
                          </span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {appointment.startTime} - {appointment.endTime}
                        </TableCell>
                        <TableCell className="hidden md:table-cell capitalize">
                          {appointment.type.replace("-", " ")}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell max-w-48 truncate">
                          {appointment.reason}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={statusColors[appointment.status]}>
                            {appointment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/appointments/${appointment.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/appointments/${appointment.id}/edit`}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {appointment.status === "scheduled" && (
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(appointment.id, "confirmed")}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                  Confirm
                                </DropdownMenuItem>
                              )}
                              {(appointment.status === "scheduled" ||
                                appointment.status === "confirmed") && isDoctor && (
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(appointment.id, "in-progress")}
                                >
                                  <Clock className="mr-2 h-4 w-4 text-yellow-600" />
                                  Start Consultation
                                </DropdownMenuItem>
                              )}
                              {appointment.status === "in-progress" && (
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(appointment.id, "completed")}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Mark Complete
                                </DropdownMenuItem>
                              )}
                              {appointment.status !== "completed" &&
                                appointment.status !== "cancelled" && (
                                  <DropdownMenuItem
                                    onClick={() => handleStatusChange(appointment.id, "cancelled")}
                                    className="text-destructive"
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Cancel
                                  </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Suspense>
  )
}
