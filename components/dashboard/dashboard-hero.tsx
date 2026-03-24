"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Row style for dashboard quick-action links (Register, Search, etc.) */
export const dashboardQuickActionClass =
  "group flex items-center justify-between rounded-xl border border-border/50 bg-gradient-to-br from-background/95 to-muted/25 p-4 shadow-sm transition-all hover:border-primary/20 hover:shadow-md hover:shadow-black/[0.06] active:scale-[0.99]"

/** Row style for patient / prescription list previews */
export const dashboardListRowClass =
  "flex items-center justify-between rounded-xl border border-border/40 bg-muted/35 p-3 transition-colors hover:border-border/70 hover:bg-muted/55"

type DashboardHeroProps = {
  title: ReactNode
  subtitle?: ReactNode
  children?: ReactNode
  className?: string
}

/**
 * Top-of-page welcome strip: gradient surface, soft glow, optional primary actions.
 */
export function DashboardHero({ title, subtitle, children, className }: DashboardHeroProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-muted/25 p-6 shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset,0_8px_32px_-12px_rgba(15,23,42,0.12)] sm:p-8",
        className
      )}
    >
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-accent/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-20 -left-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
          {subtitle ? (
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">{subtitle}</p>
          ) : null}
        </div>
        {children ? <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div> : null}
      </div>
    </div>
  )
}

/** Section title row for dashboard cards (Quick actions, Recent, etc.) */
export function DashboardSectionTitle({
  title,
  subtitle,
  className,
}: {
  title: ReactNode
  subtitle?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("space-y-0.5", className)}>
      <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
    </div>
  )
}
