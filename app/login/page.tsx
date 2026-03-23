"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2, Eye, EyeOff } from "lucide-react"
import { FadeIn } from "@/components/animations/fade-in"
import { notifyError, notifySuccess, withLoadingToast } from "@/lib/toast-utils"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [mfaCode, setMfaCode] = useState("")
  const [mfaRequired, setMfaRequired] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const { login, isLoading } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    const result = await withLoadingToast("Signing in...", async () => login(email, password))
    if (result.success) {
      notifySuccess("formSubmitted")
      router.push("/dashboard")
    } else {
      const message = result.error || "Invalid email or password."
      setError(message)
      notifyError("apiFailed", message)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left panel – Reztek Healthcare Practice branding */}
      <div className="relative hidden lg:flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e3a5f] to-[#0f172a] text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-60" />
        <div className="relative z-10 flex flex-col items-center justify-center max-w-md px-12 text-center">
          <Image
            src="/reztek-logo.png"
            alt="Reztek Healthcare Practice"
            width={360}
            height={140}
            className="h-auto w-full max-w-[340px] object-contain"
            priority
          />
          <p className="mt-6 text-lg font-medium text-white/95">Staff sign-in portal</p>
          <p className="mt-2 text-sm text-white/70">
            Secure access for authorized staff. Use your credentials to sign in.
          </p>
        </div>
      </div>

      {/* Right panel – login form */}
      <div className="flex flex-col items-center justify-center p-6 sm:p-8 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Logo on mobile */}
          <div className="flex justify-center lg:hidden">
            <Link href="/">
              <Image
                src="/reztek-logo.png"
                alt="Reztek Healthcare Practice"
                width={280}
                height={100}
                className="h-auto w-[260px] object-contain"
                priority
              />
            </Link>
          </div>

          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-foreground">Sign in</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Use your staff credentials to access the portal
              </p>
            </div>

            <FadeIn>
              <Card className="border-border/60 shadow-sm">
                <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder=""
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-[#16a34a] hover:bg-[#15803d] text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in…
                      </>
                    ) : (
                      "Sign in"
                    )}
                  </Button>
                </form>

                {/* MFA step removed – all roles use email + password only */}
                </CardContent>
              </Card>
            </FadeIn>
          </div>

          <div className="space-y-2">
            <p className="text-center text-xs text-muted-foreground">
              Staff access only.
            </p>
            <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
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
        </div>
      </div>
    </div>
  )
}
