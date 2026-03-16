"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function MedicalAidRootPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/medical-aid/dashboard")
  }, [router])
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
      Redirecting to dashboard…
    </div>
  )
}
