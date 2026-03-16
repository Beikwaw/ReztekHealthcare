"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function PharmacyPendingPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/dashboard/pharmacy/orders?filter=pending")
  }, [router])
  return (
    <div className="flex items-center justify-center py-12">
      <p className="text-muted-foreground">Redirecting to orders…</p>
    </div>
  )
}
