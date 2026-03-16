'use client'

import { CheckCircle2, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type StatusVariant = 'success' | 'error'

export interface StatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  variant: StatusVariant
  title: string
  description?: string
  primaryLabel?: string
  onPrimaryClick?: () => void
}

/**
 * StatusDialog
 *
 * A reusable confirmation popup for success and error states.
 * Designed for healthcare workflows across admin, clerk, doctor,
 * medical-aid officer, and pharmacy portals.
 */
export function StatusDialog({
  open,
  onOpenChange,
  variant,
  title,
  description,
  primaryLabel = 'OK',
  onPrimaryClick,
}: StatusDialogProps) {
  const Icon = variant === 'success' ? CheckCircle2 : AlertCircle

  const accentClasses =
    variant === 'success'
      ? 'border-emerald-500/40 bg-emerald-50/50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100'
      : 'border-red-500/40 bg-red-50/50 text-red-900 dark:bg-red-950/40 dark:text-red-100'

  const iconClasses =
    variant === 'success'
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-red-600 dark:text-red-400'

  const buttonClasses =
    variant === 'success'
      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
      : 'bg-red-600 hover:bg-red-700 text-white'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          'border shadow-2xl max-w-md',
          'backdrop-blur-sm',
          accentClasses,
        )}
      >
        <DialogHeader className="flex flex-row items-start gap-3">
          <div className="mt-0.5">
            <Icon className={cn('h-6 w-6', iconClasses)} />
          </div>
          <div className="space-y-1 text-left">
            <DialogTitle className="text-lg font-semibold tracking-tight">
              {title}
            </DialogTitle>
            {description && (
              <DialogDescription className="text-sm leading-relaxed">
                {description}
              </DialogDescription>
            )}
          </div>
        </DialogHeader>
        <DialogFooter className="mt-4 flex w-full justify-end gap-2">
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              className="border-muted-foreground/20 text-foreground"
            >
              Close
            </Button>
          </DialogClose>
          <Button
            type="button"
            className={buttonClasses}
            onClick={() => {
              if (onPrimaryClick) onPrimaryClick()
              onOpenChange(false)
            }}
          >
            {primaryLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

