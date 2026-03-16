import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const variantStyles = {
  default: "bg-muted/30 [&_[data-stat-icon]]:bg-primary/10 [&_[data-stat-icon]]:text-primary",
  blue: "bg-[#E0F2FE]/40 [&_[data-stat-icon]]:bg-accent/15 [&_[data-stat-icon]]:text-accent",
  green: "bg-success/10 [&_[data-stat-icon]]:bg-success/20 [&_[data-stat-icon]]:text-success",
  amber: "bg-warning/10 [&_[data-stat-icon]]:bg-warning/20 [&_[data-stat-icon]]:text-warning-foreground",
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
    <Card className={cn("rounded-[12px] shadow-[var(--shadow-card)]", variantStyles[variant], className)}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {trend && (
              <p
                className={cn(
                  "text-xs font-medium",
                  trend.isPositive ? "text-success" : "text-destructive"
                )}
              >
                {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}% from last month
              </p>
            )}
          </div>
          <div
            data-stat-icon
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
