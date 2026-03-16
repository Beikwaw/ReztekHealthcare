// MFA enrollment has been removed; keep route as a simple redirect-friendly stub.
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function EnrollTotpPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/dashboard")
  }, [router])

  return null
}
