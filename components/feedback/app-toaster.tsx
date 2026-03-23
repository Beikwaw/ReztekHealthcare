"use client"

import { Toaster } from "sonner"
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  XCircle,
} from "lucide-react"

/**
 * Healthcare-styled Sonner toasts: glass surface, left accent bar, custom icons.
 * Drop-in replacement for <Toaster /> in root layout.
 */
export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      expand
      closeButton
      richColors={false}
      theme="system"
      gap={14}
      offset={{ top: 16, right: 16 }}
      toastOptions={{
        duration: 4800,
        classNames: {
          toast:
            "group !rounded-2xl !border !border-border/80 !bg-card/95 !p-4 !pr-10 !pl-4 !shadow-[0_12px_40px_-12px_rgba(15,23,42,0.35)] !backdrop-blur-md dark:!border-border/60 dark:!bg-card/90 dark:!shadow-[0_12px_48px_-12px_rgba(0,0,0,0.55)]",
          title:
            "!text-sm !font-semibold !text-foreground !leading-tight !tracking-tight",
          description:
            "!text-sm !text-muted-foreground !mt-0.5 !leading-snug",
          content: "!gap-3",
          icon: "!self-start !mt-0.5 !size-5 !shrink-0",
          closeButton:
            "!left-auto !right-2 !top-2 !border !border-border/60 !bg-muted/40 !text-muted-foreground hover:!bg-muted hover:!text-foreground !rounded-lg !size-7",
          actionButton:
            "!rounded-lg !bg-primary !px-3 !py-1.5 !text-xs !font-medium !text-primary-foreground hover:!opacity-90",
          cancelButton:
            "!rounded-lg !border !border-border !bg-transparent !px-3 !py-1.5 !text-xs !font-medium !text-muted-foreground hover:!bg-muted",
          success:
            "!border-l-[3px] !border-l-[var(--success)] !bg-[color-mix(in_oklab,var(--success)_10%,var(--card))] dark:!bg-[color-mix(in_oklab,var(--success)_18%,var(--card))]",
          error:
            "!border-l-[3px] !border-l-destructive !bg-[color-mix(in_oklab,var(--destructive)_8%,var(--card))] dark:!bg-[color-mix(in_oklab,var(--destructive)_15%,var(--card))]",
          warning:
            "!border-l-[3px] !border-l-[var(--warning)] !bg-[color-mix(in_oklab,var(--warning)_12%,var(--card))] dark:!bg-[color-mix(in_oklab,var(--warning)_14%,var(--card))]",
          info:
            "!border-l-[3px] !border-l-[var(--accent)] !bg-[color-mix(in_oklab,var(--accent)_10%,var(--card))] dark:!bg-[color-mix(in_oklab,var(--accent)_14%,var(--card))]",
          loading:
            "!border-l-[3px] !border-l-[var(--accent)] !bg-[color-mix(in_oklab,var(--accent)_8%,var(--card))] dark:!bg-[color-mix(in_oklab,var(--accent)_12%,var(--card))]",
        },
      }}
      icons={{
        success: (
          <CheckCircle2
            className="size-5 text-[var(--success)]"
            strokeWidth={2.25}
            aria-hidden
          />
        ),
        error: (
          <XCircle
            className="size-5 text-destructive"
            strokeWidth={2.25}
            aria-hidden
          />
        ),
        warning: (
          <AlertTriangle
            className="size-5 text-[var(--warning)]"
            strokeWidth={2.25}
            aria-hidden
          />
        ),
        info: (
          <Info
            className="size-5 text-[var(--accent)]"
            strokeWidth={2.25}
            aria-hidden
          />
        ),
        loading: (
          <Loader2
            className="size-5 animate-spin text-[var(--accent)]"
            strokeWidth={2.25}
            aria-hidden
          />
        ),
      }}
    />
  )
}
