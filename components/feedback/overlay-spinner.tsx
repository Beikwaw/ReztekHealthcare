import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type OverlaySpinnerProps = {
  show: boolean
  label?: string
  className?: string
}

export function OverlaySpinner({ show, label = "Processing...", className }: OverlaySpinnerProps) {
  if (!show) return null

  return (
    <div
      className={cn(
        "absolute inset-0 z-50 flex items-center justify-center rounded-lg bg-background/60 backdrop-blur-[1px]",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}
