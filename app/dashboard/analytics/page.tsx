"use client"

import dynamic from "next/dynamic"

const LazyAnalyticsDashboard = dynamic(
  () => import("./analytics-dashboard").then((m) => ({ default: m.PatientAnalyticsDashboard })),
  {
    loading: () => (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        Loading analytics…
      </div>
    ),
    ssr: false,
  },
)

export default function AnalyticsPage() {
  return <LazyAnalyticsDashboard />
}
