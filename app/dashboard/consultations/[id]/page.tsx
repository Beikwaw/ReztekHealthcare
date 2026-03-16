"use client"

import dynamic from "next/dynamic"

const ConsultationDetailView = dynamic(
  () => import("./ConsultationDetailView").then((mod) => mod.default),
  { ssr: false }
)

export default function ConsultationDetailPage() {
  return <ConsultationDetailView />
}
