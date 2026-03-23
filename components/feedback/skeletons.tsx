import { cn } from "@/lib/utils"

type SkeletonBlockProps = {
  className?: string
}

function SkeletonBlock({ className }: SkeletonBlockProps) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border p-4", className)}>
      <div className="space-y-3">
        <SkeletonBlock className="h-5 w-1/3" />
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="h-4 w-4/5" />
        <SkeletonBlock className="h-9 w-28" />
      </div>
    </div>
  )
}

export function TableRowSkeleton({ columns = 7 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className="p-4">
          <SkeletonBlock className="h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}

export function TableSkeleton({ rows = 6, columns = 7 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-md border">
      <table className="w-full border-collapse">
        <tbody>
          {Array.from({ length: rows }).map((_, index) => (
            <TableRowSkeleton key={index} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
