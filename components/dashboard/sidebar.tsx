"use client"

import React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { usePatients } from "@/lib/firestore-hooks"
import { useData } from "@/lib/data-context"
import type { UserRole } from "@/lib/types"
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Receipt,
  FileText,
  Settings,
  LogOut,
  UserCircle,
  ClipboardList,
  Pill,
  Bell,
  Heart,
  Stethoscope,
  UserPlus,
  Search,
  BarChart3,
  Activity,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  roles: UserRole[]
  badge?: number
}

// Clerk Navigation - Billing, appointments, waiting list only (no full patient record)
const clerkNavigation: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["clerk"],
  },
  {
    title: "Register Patient",
    href: "/dashboard/patients/new",
    icon: UserPlus,
    roles: ["clerk"],
  },
  {
    title: "Patients",
    href: "/dashboard/patients",
    icon: Search,
    roles: ["clerk"],
  },
  {
    title: "Waiting List",
    href: "/dashboard/waiting",
    icon: Users,
    roles: ["clerk"],
  },
  {
    title: "Appointments",
    href: "/dashboard/appointments",
    icon: CalendarDays,
    roles: ["clerk"],
  },
  {
    title: "Billing",
    href: "/dashboard/billing",
    icon: Receipt,
    roles: ["clerk"],
  },
  {
    title: "Medical Aid Claims",
    href: "/dashboard/medical-aid-claims",
    icon: FileText,
    roles: ["clerk"],
  },
  {
    title: "Medical Aid Billing",
    href: "/dashboard/medical-aid-billing",
    icon: Receipt,
    roles: ["clerk"],
  },
]

// Doctor Navigation - Full access
const doctorNavigation: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["doctor"],
  },
  {
    title: "Waiting Patients",
    href: "/dashboard/waiting",
    icon: Users,
    roles: ["doctor"],
    badge: 3,
  },
  {
    title: "Consultations",
    href: "/dashboard/consultations",
    icon: Stethoscope,
    roles: ["doctor"],
  },
  {
    title: "Patients",
    href: "/dashboard/patients",
    icon: ClipboardList,
    roles: ["doctor"],
  },
  {
    title: "Appointments",
    href: "/dashboard/appointments",
    icon: CalendarDays,
    roles: ["doctor"],
  },
  {
    title: "Patient Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
    roles: ["doctor"],
  },
  {
    title: "Medical Aid Claims",
    href: "/dashboard/medical-aid-claims",
    icon: FileText,
    roles: ["doctor"],
  },
  {
    title: "Medical Aid Billing",
    href: "/dashboard/medical-aid-billing",
    icon: Receipt,
    roles: ["doctor"],
  },
]

// Pharmacy Navigation - Prescriptions only
const pharmacyNavigation: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["pharmacy"],
  },
  {
    title: "Pending Orders",
    href: "/dashboard/pharmacy/orders",
    icon: Pill,
    roles: ["pharmacy"],
    badge: 2,
  },
  {
    title: "Dispense History",
    href: "/dashboard/pharmacy/history",
    icon: ClipboardList,
    roles: ["pharmacy"],
  },
]

// Admin Navigation - Everything (no Appointments)
const adminNavigation: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin"],
  },
  {
    title: "Patients",
    href: "/dashboard/patients",
    icon: Users,
    roles: ["admin"],
  },
  {
    title: "Consultations",
    href: "/dashboard/consultations",
    icon: Stethoscope,
    roles: ["admin"],
  },
  {
    title: "Pharmacy",
    href: "/dashboard/pharmacy/orders",
    icon: Pill,
    roles: ["admin"],
  },
  {
    title: "Billing",
    href: "/dashboard/billing",
    icon: Receipt,
    roles: ["admin"],
  },
  {
    title: "Medical Aid Claims",
    href: "/dashboard/medical-aid-claims",
    icon: FileText,
    roles: ["admin"],
  },
  {
    title: "Patient Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
    roles: ["admin"],
  },
  {
    title: "Medical Aid Billing",
    href: "/dashboard/medical-aid-billing",
    icon: Receipt,
    roles: ["admin"],
  },
  {
    title: "Patient Activity",
    href: "/dashboard/patient-activity",
    icon: Activity,
    roles: ["admin"],
  },
  {
    title: "Deletion Requests",
    href: "/dashboard/deletion-requests",
    icon: Trash2,
    roles: ["admin"],
  },
  {
    title: "Staff",
    href: "/dashboard/staff",
    icon: UserCircle,
    roles: ["admin"],
  },
  {
    title: "Reports",
    href: "/dashboard/reports",
    icon: FileText,
    roles: ["admin"],
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    roles: ["admin"],
  },
]

const roleColors = {
  clerk: "bg-blue-500",
  doctor: "bg-primary",
  pharmacy: "bg-amber-500",
  admin: "bg-slate-700",
  receptionist: "bg-indigo-500",
  patient: "bg-emerald-500",
}

const roleLabels = {
  clerk: "Clerk",
  doctor: "Doctor",
  pharmacy: "Pharmacy",
  admin: "Administrator",
  receptionist: "Receptionist",
  patient: "Patient",
}

export function DashboardSidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { patients } = usePatients()
  const { invoices } = useData()
  const completedCount = patients.filter((p) => p.status === "completed").length
  const completedInvoicesCount = invoices.filter((inv) => inv.status === "completed").length

  // Get navigation items based on role
  const getNavItems = (): NavItem[] => {
    switch (user?.role) {
      case "clerk":
        return clerkNavigation.map((item) =>
          item.title === "Billing"
            ? { ...item, badge: completedInvoicesCount }
            : item
        )
      case "doctor":
        return doctorNavigation
      case "pharmacy":
        return pharmacyNavigation
      case "admin":
        return adminNavigation
      default:
        return []
    }
  }

  const navItems = getNavItems()

  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-3 lg:px-4">
        <div className="flex shrink-0 items-center justify-center w-10 h-10 rounded-xl bg-primary">
          <Heart className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="hidden flex-col min-w-0 lg:flex">
          <span className="font-semibold text-sm truncate">Reztek Healthcare Practice</span>
          <span className="text-xs text-sidebar-foreground/60">Practice Management Portal</span>
        </div>
        {user?.role === "clerk" && completedCount > 0 && (
          <div className="ml-auto hidden items-center lg:flex">
            <div className="relative">
              <Bell className="h-4 w-4 text-sidebar-foreground/80" />
              <span className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-sidebar-primary text-[10px] text-sidebar-primary-foreground px-1">
                {completedCount}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* User Role Badge - hidden when collapsed */}
      <div className="hidden px-4 py-3 border-b border-sidebar-border lg:block">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full shrink-0 ${roleColors[user?.role as keyof typeof roleColors] || "bg-gray-500"}`} />
          <span className="text-xs font-medium text-sidebar-foreground/80 truncate">
            Logged in as {roleLabels[user?.role as keyof typeof roleLabels] || user?.role}
          </span>
        </div>
      </div>

      {/* Navigation - active: left border + teal tint */}
      <div className="flex-1 py-4 min-h-0">
        <nav className="space-y-1 px-2 lg:px-3" aria-label="Main">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.title}
                className={cn(
                  "flex items-center justify-between rounded-lg px-2 py-2.5 text-sm font-medium transition-colors lg:px-3",
                  "border-l-2 border-transparent",
                  isActive
                    ? "border-l-accent bg-sidebar-primary/15 text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="hidden truncate lg:inline">{item.title}</span>
                </div>
                {item.badge != null && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "hidden h-5 min-w-5 shrink-0 px-1.5 text-xs lg:flex",
                      isActive
                        ? "bg-sidebar-primary/30 text-sidebar-primary-foreground"
                        : "bg-sidebar-foreground/20 text-sidebar-foreground"
                    )}
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* User block - border-top, 8pt grid */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className={`flex shrink-0 items-center justify-center w-10 h-10 rounded-xl ${roleColors[user?.role as keyof typeof roleColors] || "bg-gray-500"}`}>
            <span className="text-white font-semibold text-sm">
              {(() => {
                const displayName = user?.name && user.name !== "User" ? user.name : user?.role === "clerk" ? "Clerk" : "Staff"
                return displayName?.charAt(0).toUpperCase() ?? "?"
              })()}
            </span>
          </div>
          <div className="hidden min-w-0 flex-1 lg:block">
            <p className="text-sm font-medium truncate text-sidebar-foreground">
              {user?.name && user.name !== "Thandi Sithole" ? user.name : user?.role === "clerk" ? "Clerk" : "Staff"}
            </p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email || ""}</p>
          </div>
        </div>
        <Separator className="mb-3 bg-sidebar-border" />
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent lg:px-3"
          onClick={logout}
        >
          <LogOut className="mr-2 h-4 w-4 shrink-0" />
          <span className="hidden lg:inline">Sign Out</span>
        </Button>
      </div>
    </div>
  )
}
