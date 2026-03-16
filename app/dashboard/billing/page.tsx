"use client"

import { useState } from "react"
import Link from "next/link"
import { useInvoices } from "@/lib/firestore-hooks"
import { usePatients } from "@/lib/firestore-hooks"
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
import { format } from "date-fns"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import Loading from "./loading"
import {
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  CreditCard,
  Receipt,
  TrendingUp,
  AlertTriangle,
  DollarSign,
} from "lucide-react"
import type { InvoiceStatus } from "@/lib/types"

const statusColors: Record<InvoiceStatus, string> = {
  draft: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  sent: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  paid: "bg-green-100 text-green-800 hover:bg-green-100",
  overdue: "bg-red-100 text-red-800 hover:bg-red-100",
  cancelled: "bg-orange-100 text-orange-800 hover:bg-orange-100",
  completed: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
}

export default function BillingPage() {
  const { invoices, updateInvoice } = useInvoices()
  const { patients } = usePatients()

  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(searchParams?.get("search") || "")
  const [statusFilter, setStatusFilter] = useState<string>(searchParams?.get("status") ?? "completed")
  const [paymentFilter, setPaymentFilter] = useState<string>("all")

  const getPatientName = (patientId: string) => {
    const patient = patients.find((p) => p.id === patientId)
    return patient?.name || "Unknown Patient"
  }

  const getPatientIdentifier = (patientId: string) => {
    const patient = patients.find((p) => p.id === patientId)
    return patient?.patientNumber || patient?.idNumber || patientId
  }

  const getPatientPaymentType = (patientId: string): "cash" | "medical-aid" | "other" => {
    const patient = patients.find((p) => p.id === patientId)
    const method = patient?.paymentMethod
    if (method === "cash") return "cash"
    if (method === "medical-aid") return "medical-aid"
    return "other"
  }

  const getPatientPaymentLabel = (patientId: string) => {
    const type = getPatientPaymentType(patientId)
    if (type === "cash") return "Cash"
    if (type === "medical-aid") return "Medical Aid"
    return "Other"
  }

  const getInvoiceStatusLabel = (inv: { status: InvoiceStatus; patientId: string }) => {
    const paymentType = getPatientPaymentType(inv.patientId)
    if (paymentType === "medical-aid") {
      if (inv.status === "sent") return "Claim sent"
      if (inv.status === "completed") return "Claim completed"
    }
    return inv.status
  }

  const normalizedSearch = searchQuery.trim().toLowerCase()
  const filteredInvoices = invoices
    .filter((inv) => {
      const patientName = getPatientName(inv.patientId).toLowerCase()
      const patientId = getPatientIdentifier(inv.patientId).toLowerCase()
      const paymentType = getPatientPaymentType(inv.patientId)
      const matchesSearch =
        patientName.includes(normalizedSearch) ||
        patientId.includes(normalizedSearch) ||
        (inv.id && String(inv.id).toLowerCase().includes(normalizedSearch))
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
          ? inv.status !== "completed" && inv.status !== "paid"
          : statusFilter === "completed"
          ? inv.status === "completed" || inv.status === "paid"
          : inv.status === statusFilter
      const matchesPayment =
        paymentFilter === "all"
          ? true
          : paymentFilter === "cash"
          ? paymentType === "cash"
          : paymentFilter === "medical-aid"
          ? paymentType === "medical-aid"
          : true
      return matchesSearch && matchesStatus && matchesPayment
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const handleMarkAsPaid = (invoiceId: string) => {
    updateInvoice(invoiceId, {
      status: "paid",
      paidDate: new Date(),
      paymentMethod: "card",
    })
  }


  // Statistics
  const totalCashRevenue = invoices
    .filter(
      (inv) =>
        getPatientPaymentType(inv.patientId) === "cash" &&
        inv.status === "paid",
    )
    .reduce((sum, inv) => sum + inv.total, 0)

  const totalMedicalAidRevenue = invoices
    .filter(
      (inv) =>
        getPatientPaymentType(inv.patientId) === "medical-aid" &&
        (inv.status === "completed" || inv.status === "paid"),
    )
    .reduce((sum, inv) => sum + inv.total, 0)

  const pendingAmount = invoices
    .filter((inv) => inv.status === "sent")
    .reduce((sum, inv) => sum + inv.total, 0)

  const overdueAmount = invoices
    .filter((inv) => inv.status === "overdue")
    .reduce((sum, inv) => sum + inv.total, 0)

  const thisMonthRevenue = invoices
    .filter(
      (inv) =>
        (inv.status === "paid" || inv.status === "completed") &&
        inv.paidDate &&
        new Date(inv.paidDate).getMonth() === new Date().getMonth()
    )
    .reduce((sum, inv) => sum + inv.total, 0)

  return (
    <Suspense fallback={<Loading />}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Billing</h1>
            <p className="text-muted-foreground">Manage invoices and payments</p>
          </div>
          <Button asChild>
            <Link href="/dashboard/billing/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-full bg-green-100">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">R {totalCashRevenue.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Cash Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-full bg-blue-100">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">R {totalMedicalAidRevenue.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Medical Aid Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-full bg-yellow-100">
                  <Receipt className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">R {pendingAmount.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-full bg-red-100">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">R {overdueAmount.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>{statusFilter === "completed" ? "Completed Invoices" : "All Invoices"}</CardTitle>
                <CardDescription>{filteredInvoices.length} invoices</CardDescription>
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
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Payment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payments</SelectItem>
                    <SelectItem value="cash">Cash patients</SelectItem>
                    <SelectItem value="medical-aid">Medical Aid patients</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead className="hidden md:table-cell">Patient ID</TableHead>
                    <TableHead className="hidden lg:table-cell">Payment</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead className="hidden md:table-cell">Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No invoices found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">
                          {invoice.id.toUpperCase()}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/dashboard/patients/${invoice.patientId}`}
                            className="hover:underline"
                          >
                            {getPatientName(invoice.patientId)}
                          </Link>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {getPatientIdentifier(invoice.patientId)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge variant="outline">{getPatientPaymentLabel(invoice.patientId)}</Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {format(new Date(invoice.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {format(new Date(invoice.dueDate), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="font-medium">
                          R {invoice.total.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={statusColors[invoice.status]}>
                            {getInvoiceStatusLabel(invoice)}
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
                                <Link href={`/dashboard/billing/${invoice.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View &amp; Download PDF
                                </Link>
                              </DropdownMenuItem>
                              {(invoice.status === "sent" || invoice.status === "overdue") && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleMarkAsPaid(invoice.id)}>
                                    <CreditCard className="mr-2 h-4 w-4 text-green-600" />
                                    Mark as Paid
                                  </DropdownMenuItem>
                                </>
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
          </CardContent>
        </Card>
      </div>
    </Suspense>
  )
}
