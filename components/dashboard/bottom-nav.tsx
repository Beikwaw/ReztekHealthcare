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
      className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch justify-around gap-0.5 border-t border-border/60 bg-card/90 px-1 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_32px_-16px_rgba(15,23,42,0.12)] backdrop-blur-xl md:hidden"
      aria-label="Primary navigation"
    >
      {items.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[11px] font-semibold transition-colors",
              isActive
                ? "bg-primary/12 text-primary"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                isActive ? "bg-primary/15 text-primary" : "text-current"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
            </span>
            <span className="max-w-full truncate leading-tight">{item.label}</span>
          </Link>
        )
      })}
      <Link
        href={moreHref}
        className={cn(
          "flex min-w-0 shrink-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[11px] font-semibold transition-colors",
          pathname === moreHref ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        )}
      >
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full",
            pathname === moreHref ? "bg-primary/15 text-primary" : ""
          )}
        >
          <Menu className="h-5 w-5 shrink-0" />
        </span>
        <span className="leading-tight">More</span>
      </Link>
    </nav>
  )
}
