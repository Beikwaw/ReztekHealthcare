"use client"

import { useEffect, useState } from "react"

import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { getSafeClientErrorMessage, getSafeMessageFromResponse } from "@/lib/client-errors"
import { ERROR_MESSAGES } from "@/lib/error-messages"
import { Loader2 } from "lucide-react"

type DemoRow = {
  id: string
  name: string
  practiceName: string
  date: string
  time: string
  address: string
  createdAt: string
}

export default function AdminDemoRequestsPage() {
  const { firebaseUser } = useAuth()
  const [rows, setRows] = useState<DemoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError("")
        if (!firebaseUser) return
        const token = await firebaseUser.getIdToken()
        const res = await fetch("/api/admin/demo-requests", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as { error?: string } | null
          throw new Error(payload?.error || "Failed to load demo requests")
        }
        const data = (await res.json()) as { demoRequests: DemoRow[] }
        if (!cancelled) setRows(data.demoRequests || [])
      } catch (e) {
        if (!cancelled) setError(getSafeClientErrorMessage(e, ERROR_MESSAGES.GENERIC))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [firebaseUser])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Demo requests</CardTitle>
        <CardDescription>In-person demo bookings submitted from quote results.</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-10">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading demo requests…
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Practice</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="text-right">Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-muted-foreground">
                    No demo requests yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.practiceName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{r.date || "—"}</Badge>
                    </TableCell>
                    <TableCell>{r.time || "—"}</TableCell>
                    <TableCell className="max-w-[380px] whitespace-normal">
                      {r.address || "—"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {r.createdAt ? new Date(r.createdAt).toLocaleString("en-ZA") : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

