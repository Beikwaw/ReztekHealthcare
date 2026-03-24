import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const variantStyles = {
  default:
    "border-border/50 bg-gradient-to-br from-muted/40 to-card [&_[data-stat-icon]]:bg-primary/12 [&_[data-stat-icon]]:text-primary",
  blue: "border-sky-500/15 bg-gradient-to-br from-sky-500/10 to-card [&_[data-stat-icon]]:bg-sky-500/15 [&_[data-stat-icon]]:text-sky-700 dark:[&_[data-stat-icon]]:text-sky-400",
  green:
    "border-emerald-500/15 bg-gradient-to-br from-emerald-500/10 to-card [&_[data-stat-icon]]:bg-emerald-500/15 [&_[data-stat-icon]]:text-emerald-700 dark:[&_[data-stat-icon]]:text-emerald-400",
  amber:
    "border-amber-500/15 bg-gradient-to-br from-amber-500/10 to-card [&_[data-stat-icon]]:bg-amber-500/15 [&_[data-stat-icon]]:text-amber-800 dark:[&_[data-stat-icon]]:text-amber-400",
} as const

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  variant?: keyof typeof variantStyles
  className?: string
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant = "default",
  className,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden rounded-2xl border shadow-[0_2px_20px_-6px_rgba(15,23,42,0.1)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-12px_rgba(15,23,42,0.14)]",
        variantStyles[variant],
        className
      )}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/20 opacity-0 blur-2xl transition-opacity group-hover:opacity-100 dark:bg-white/5"
        aria-hidden
      />
      <CardContent className="relative pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground sm:text-3xl">{value}</p>
            {description && <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>}
            {trend && (
              <p
                className={cn(
                  "text-xs font-medium",
                  trend.isPositive ? "text-success" : "text-destructive"
                )}
              >
                {trend.isPositive ? "+" : "-"}
                {Math.abs(trend.value)}% from last month
              </p>
            )}
          </div>
          <div
            data-stat-icon
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-inner ring-1 ring-black/5 dark:ring-white/10"
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
