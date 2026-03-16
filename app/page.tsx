import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center bg-white px-6 py-12">
      {/* Full-page logo – entire landing is the logo image */}
      <div className="flex flex-col items-center justify-center w-full max-w-3xl">
        <div className="w-full flex justify-center mb-6">
          <Image
            src="/reztek-logo.png"
            alt="Reztek Healthcare Practice"
            width={640}
            height={240}
            className="h-auto w-full max-w-[600px] object-contain"
            priority
          />
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#1e3a5f] mt-2">
          REZTEK HEALTHCARE PRACTICE PORTAL
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Staff portal access
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/login">
            <Button
              size="lg"
              className="min-w-[220px] h-12 text-base font-semibold bg-[#16a34a] hover:bg-[#15803d] text-white border-0"
            >
              Sign in
            </Button>
          </Link>
          <Link
            href="/login"
            className="text-sm text-neutral-600 hover:text-neutral-900 underline-offset-2 hover:underline"
          >
            Continue to staff portal
          </Link>
        </div>
        <div className="mt-10 flex items-center justify-center gap-2 text-[11px] text-neutral-500">
          <span>Powered by</span>
          <Image
            src="/reztek-logo.png"
            alt="Reztek"
            width={84}
            height={28}
            className="h-6 w-auto"
            priority
          />
        </div>
      </div>
    </main>
  )
}
