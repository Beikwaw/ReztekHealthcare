"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import { useConsultationsRealtime } from "@/lib/firestore-hooks"
import Link from "next/link"
import {
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Activity,
  ShoppingCart,
  FileText,
} from "lucide-react"

export function PharmacyDashboard() {
  const { user } = useAuth()
  const { consultations } = useConsultationsRealtime()

  // Get prescriptions from consultations (confirmed or sent-to-pharmacy)
  const prescriptionConsultations = consultations.filter(
    (c) =>
      (c.status === "confirmed" || c.status === "sent-to-pharmacy") &&
      ((c.prescription && c.prescription.length > 0) || (c as { scriptText?: string }).scriptText?.trim())
  )

  const prescriptions = prescriptionConsultations.flatMap((c) =>
    (c.prescription && c.prescription.length > 0
      ? c.prescription
      : [{ medication: "Script", dosage: "", frequency: "", duration: "", instructions: "" }]
    ).map((p) => ({
      ...p,
      consultationId: c.id,
      patientId: c.patientId,
      patientName: c.patientName || "Unknown Patient",
      date: c.createdAt,
      dispensed: false,
    }))
  )

  const pendingPrescriptions = prescriptions
  const dispensedPrescriptions: typeof prescriptions = []

  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
  const todayPrescriptions = prescriptions.filter(
    (p) => new Date(p.date) >= todayStart && new Date(p.date) < todayEnd
  )

  const stats = [
    {
      title: "Pending Prescriptions",
      value: pendingPrescriptions.length,
      icon: Clock,
      color: "bg-amber-500",
      description: "Awaiting fulfillment",
    },
    {
      title: "Dispensed Today",
      value: todayPrescriptions.filter((p) => p.dispensed).length,
      icon: CheckCircle2,
      color: "bg-emerald-500",
      description: "Completed today",
    },
    {
      title: "Total Dispensed",
      value: dispensedPrescriptions.length,
      icon: Package,
      color: "bg-blue-500",
      description: "All time",
    },
    {
      title: "Total Prescriptions",
      value: prescriptions.length,
      icon: FileText,
      color: "bg-primary",
      description: "In system",
    },
  ]

  // Recent prescriptions
  const recentPrescriptions = [...prescriptions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground">
            Manage prescriptions and pharmacy orders.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/pharmacy/orders">
            <ShoppingCart className="w-4 h-4 mr-2" />
            View Orders
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

      {/* Quick Actions & Recent Prescriptions */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/dashboard/pharmacy/pending"
              className="flex items-center justify-between p-4 rounded-xl bg-amber-500/5 hover:bg-amber-500/10 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Pending Prescriptions</p>
                  <p className="text-sm text-muted-foreground">Review and fulfill orders</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-amber-500 transition-colors" />
            </Link>

            <Link
              href="/dashboard/pharmacy/inventory"
              className="flex items-center justify-between p-4 rounded-xl bg-blue-500/5 hover:bg-blue-500/10 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Inventory Management</p>
                  <p className="text-sm text-muted-foreground">Manage stock levels</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-blue-500 transition-colors" />
            </Link>

            <Link
              href="/dashboard/pharmacy/orders"
              className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-foreground">All Orders</p>
                  <p className="text-sm text-muted-foreground">View order history</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
            </Link>
          </CardContent>
        </Card>

        {/* Recent Prescriptions */}
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Recent Prescriptions</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/pharmacy/orders">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentPrescriptions.length > 0 ? (
              <div className="space-y-3">
                {recentPrescriptions.map((prescription, index) => (
                  <div
                    key={`${prescription.consultationId}-${index}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm text-foreground">
                        {prescription.patientName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {prescription.medication} - {prescription.dosage}
                      </p>
                    </div>
                    <Badge variant="secondary" className="bg-amber-500">
                      Pending
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">No prescriptions yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Prescriptions Alert */}
      {pendingPrescriptions.length > 0 && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {pendingPrescriptions.length} Pending Prescription{pendingPrescriptions.length !== 1 ? "s" : ""}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Review and fulfill pending pharmacy orders
                  </p>
                </div>
              </div>
              <Button asChild>
                <Link href="/dashboard/pharmacy/pending">
                  Review Now
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

