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
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

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
    <div className="flex h-full w-full flex-col border-r border-sidebar-border/80 bg-sidebar text-sidebar-foreground shadow-[4px_0_24px_-12px_rgba(15,23,42,0.12)]">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border bg-sidebar/95 px-3 backdrop-blur-sm lg:px-4">
        <div className="flex shrink-0 items-center justify-center">
          <Image
            src="/reztek-logo.png"
            alt="Reztek Healthcare Practice"
            width={120}
            height={40}
            className="h-8 w-auto object-contain"
            priority
          />
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
      <div className="hidden border-b border-sidebar-border bg-muted/10 px-4 py-3 lg:block">
        <div className="flex items-center gap-2 rounded-lg border border-sidebar-border/50 bg-sidebar-accent/20 px-2.5 py-1.5">
          <div
            className={`h-2 w-2 shrink-0 rounded-full ring-2 ring-white/20 ${roleColors[user?.role as keyof typeof roleColors] || "bg-gray-500"}`}
          />
          <span className="truncate text-xs font-medium text-sidebar-foreground/85">
            Logged in as {roleLabels[user?.role as keyof typeof roleLabels] || user?.role}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 min-h-0 py-3">
        <nav className="space-y-0.5 px-2 lg:px-3" aria-label="Main">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.title}
                className={cn(
                  "relative flex items-center justify-between rounded-xl px-2 py-2.5 text-sm font-medium transition-all lg:px-3",
                  "hover:bg-sidebar-accent/45 hover:text-sidebar-foreground",
                  isActive
                    ? "bg-sidebar-primary/18 pl-2.5 text-sidebar-primary shadow-sm ring-1 ring-sidebar-primary/25 lg:pl-3.5"
                    : "text-sidebar-foreground/72"
                )}
              >
                {isActive ? (
                  <span
                    className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-accent"
                    aria-hidden
                  />
                ) : null}
                <div className="flex min-w-0 items-center gap-3 pl-0.5">
                  <item.icon className={cn("h-4 w-4 shrink-0", isActive && "text-sidebar-primary")} />
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
      </ScrollArea>

      {/* User block */}
      <div className="shrink-0 border-t border-sidebar-border bg-sidebar/95 p-4 backdrop-blur-sm">
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
