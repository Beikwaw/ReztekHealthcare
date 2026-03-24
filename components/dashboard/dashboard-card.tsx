import type { ReactNode } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type DashboardPanelProps = {
  /** Main heading */
  title: ReactNode
  /** Optional right-aligned slot (e.g. “View all” link) */
  action?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
}

/**
 * Consistent elevated panel for dashboard sections (quick actions, lists, etc.).
 */
export function DashboardPanel({
  title,
  action,
  children,
  className,
  contentClassName,
}: DashboardPanelProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden rounded-2xl border-border/60 bg-card/80 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.12)] backdrop-blur-sm transition-shadow hover:shadow-[0_8px_32px_-12px_rgba(15,23,42,0.14)]",
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 border-b border-border/40 bg-muted/20 px-5 py-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </CardHeader>
      <CardContent className={cn("p-5", contentClassName)}>{children}</CardContent>
    </Card>
  )
}
