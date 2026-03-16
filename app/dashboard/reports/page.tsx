"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { usePatients, useAppointments, useInvoices } from "@/lib/firestore-hooks"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, TrendingUp, Users, Calendar, DollarSign, FileText, Download, Loader2 } from "lucide-react"

export default function ReportsPage() {
  const { user } = useAuth()
  const { patients, loading: patientsLoading } = usePatients()
  const { appointments, loading: appointmentsLoading } = useAppointments()
  const { invoices, loading: invoicesLoading } = useInvoices()
  const [period, setPeriod] = useState("month")
  const loading = patientsLoading || appointmentsLoading || invoicesLoading

  // Only admin and doctor can access reports
  if (user?.role !== "admin" && user?.role !== "doctor") {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You do not have permission to view reports.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const totalPatients = patients.length
  const activePatients = patients.filter((p) => p.status === "active" || p.status === "waiting").length
  const totalAppointments = appointments.length
  const completedAppointments = appointments.filter((a) => a.status === "completed").length
  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total ?? 0), 0)
  const paidRevenue = invoices.filter((inv) => inv.status === "paid").reduce((sum, inv) => sum + (inv.total ?? 0), 0)
  const pendingRevenue = invoices.filter((inv) => inv.status === "pending").reduce((sum, inv) => sum + (inv.total ?? 0), 0)

  const appointmentsByType = appointments.reduce((acc, apt) => {
    const type = apt.type ?? "consultation"
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const invoicesByStatus = invoices.reduce((acc, inv) => {
    acc[inv.status] = (acc[inv.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">Practice performance overview and insights</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "…" : totalPatients}</div>
            <p className="text-xs text-muted-foreground">
              {activePatients} active patients
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "…" : totalAppointments}</div>
            <p className="text-xs text-muted-foreground">
              {completedAppointments} completed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R{loading ? "…" : totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              R{paidRevenue.toLocaleString()} collected
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R{loading ? "…" : pendingRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {invoicesByStatus["pending"] || 0} pending invoices
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="appointments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="patients">Patients</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Appointments by Type</CardTitle>
                <CardDescription>Breakdown of appointment categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(appointmentsByType).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-primary" />
                        <span className="text-sm font-medium capitalize">{type.replace("-", " ")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{count}</span>
                        <div className="h-2 w-24 rounded-full bg-muted">
                          <div 
                            className="h-full rounded-full bg-primary" 
                            style={{ width: `${totalAppointments ? (count / totalAppointments) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Appointment Status</CardTitle>
                <CardDescription>Current appointment distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {["scheduled", "completed", "cancelled", "no-show"].map((status) => {
                    const count = appointments.filter(a => a.status === status).length
                    return (
                      <div key={status} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`h-3 w-3 rounded-full ${
                            status === "completed" ? "bg-green-500" :
                            status === "scheduled" ? "bg-blue-500" :
                            status === "cancelled" ? "bg-red-500" : "bg-yellow-500"
                          }`} />
                          <span className="text-sm font-medium capitalize">{status.replace("-", " ")}</span>
                        </div>
                        <span className="text-sm font-semibold">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Invoice Status</CardTitle>
                <CardDescription>Payment collection overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {["paid", "pending", "overdue", "cancelled"].map((status) => {
                    const count = invoices.filter(i => i.status === status).length
                    const amount = invoices.filter((i) => i.status === status).reduce((sum, i) => sum + (i.total ?? 0), 0)
                    return (
                      <div key={status} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`h-3 w-3 rounded-full ${
                            status === "paid" ? "bg-green-500" :
                            status === "pending" ? "bg-yellow-500" :
                            status === "overdue" ? "bg-red-500" : "bg-gray-500"
                          }`} />
                          <span className="text-sm font-medium capitalize">{status}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">R{amount.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{count} invoices</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Summary</CardTitle>
                <CardDescription>Financial performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Collection Rate</span>
                      <span className="text-sm font-semibold">
                        {totalRevenue > 0 ? Math.round((paidRevenue / totalRevenue) * 100) : 0}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div 
                        className="h-full rounded-full bg-green-500" 
                        style={{ width: `${totalRevenue > 0 ? (paidRevenue / totalRevenue) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Average Invoice</p>
                      <p className="text-xl font-semibold">
                        R{invoices.length > 0 ? Math.round(totalRevenue / invoices.length).toLocaleString() : 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Invoices</p>
                      <p className="text-xl font-semibold">{invoices.length}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="patients" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Patient Demographics</CardTitle>
                <CardDescription>Patient base overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Patients</span>
                    <span className="text-sm font-semibold">{totalPatients}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Active Patients</span>
                    <span className="text-sm font-semibold">{activePatients}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Inactive Patients</span>
                    <span className="text-sm font-semibold">{patients.filter(p => p.status === "inactive").length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Male Patients</span>
                    <span className="text-sm font-semibold">{patients.filter(p => p.gender === "male").length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Female Patients</span>
                    <span className="text-sm font-semibold">{patients.filter(p => p.gender === "female").length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Patient Activity</CardTitle>
                <CardDescription>Engagement metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Active Rate</span>
                      <span className="text-sm font-semibold">
                        {totalPatients > 0 ? Math.round((activePatients / totalPatients) * 100) : 0}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div 
                        className="h-full rounded-full bg-primary" 
                        style={{ width: `${totalPatients > 0 ? (activePatients / totalPatients) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg. Visits/Patient</p>
                      <p className="text-xl font-semibold">
                        {totalPatients > 0 ? (completedAppointments / totalPatients).toFixed(1) : 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">New This Month</p>
                      <p className="text-xl font-semibold">
                        {patients.filter(p => {
                          const created = new Date(p.createdAt)
                          const now = new Date()
                          return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
                        }).length}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
