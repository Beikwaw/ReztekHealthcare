import { Suspense } from "react"
import GetQuoteResultClient from "./ResultClient"

export const dynamic = "force-dynamic"

export default function GetQuoteResultPage() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center">Loading…</main>}>
      <GetQuoteResultClient />
    </Suspense>
  )
}
