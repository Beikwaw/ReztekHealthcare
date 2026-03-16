"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, Receipt, ClipboardList, Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import type { UserRole } from "@/lib/types"

function getBottomNavItems(role?: UserRole): { href: string; label: string; icon: React.ElementType }[] {
  switch (role) {
    case "clerk":
      return [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/dashboard/waiting", label: "Waiting", icon: Users },
        { href: "/dashboard/patients", label: "Patients", icon: ClipboardList },
        { href: "/dashboard/billing", label: "Billing", icon: Receipt },
      ]
    case "doctor":
      return [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/dashboard/waiting", label: "Waiting", icon: Users },
        { href: "/dashboard/patients", label: "Patients", icon: ClipboardList },
        { href: "/dashboard/medical-aid-claims", label: "Claims", icon: Receipt },
      ]
    case "pharmacy":
      return [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/dashboard/pharmacy/orders", label: "Orders", icon: Receipt },
        { href: "/dashboard/pharmacy/history", label: "History", icon: ClipboardList },
      ]
    case "admin":
      return [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/dashboard/patients", label: "Patients", icon: ClipboardList },
        { href: "/dashboard/billing", label: "Billing", icon: Receipt },
        { href: "/dashboard/medical-aid-claims", label: "Claims", icon: Receipt },
      ]
    default:
      return [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/dashboard/patients", label: "Patients", icon: ClipboardList },
      ]
  }
}

export function DashboardBottomNav({ role }: { role?: UserRole }) {
  const pathname = usePathname()
  const items = getBottomNavItems(role)
  const moreHref = "/dashboard"

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border bg-card px-2 py-2 md:hidden"
      aria-label="Primary navigation"
    >
      {items.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors min-w-0 flex-1",
              isActive ? "text-accent" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span className="truncate max-w-full">{item.label}</span>
          </Link>
        )
      })}
      <Link
        href={moreHref}
        className={cn(
          "flex flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors min-w-0 flex-1 shrink-0",
          pathname === moreHref ? "text-accent" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Menu className="h-5 w-5 shrink-0" />
        <span>More</span>
      </Link>
    </nav>
  )
}
