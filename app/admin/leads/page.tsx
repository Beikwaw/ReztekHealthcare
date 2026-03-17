"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

type LeadRow = {
  id: string
  name: string
  practiceName: string
  email: string
  patientsPerDay: number
  createdAt: string
}

export default function AdminLeadsPage() {
  const { firebaseUser } = useAuth()
  const [rows, setRows] = useState<LeadRow[]>([])
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
        const res = await fetch("/api/admin/leads", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as { error?: string } | null
          throw new Error(payload?.error || "Failed to load leads")
        }
        const data = (await res.json()) as { leads: LeadRow[] }
        if (!cancelled) setRows(data.leads || [])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load leads")
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
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Doctor leads</CardTitle>
            <CardDescription>All quote requests submitted via `/get-quote`.</CardDescription>
          </div>
          <Link href="/get-quote">
            <Button variant="outline">Open get-quote</Button>
          </Link>
        </div>
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
            Loading leads…
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Practice</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Patients/day</TableHead>
                <TableHead>Date submitted</TableHead>
                <TableHead className="text-right">Lead ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-muted-foreground">
                    No leads yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.practiceName}</TableCell>
                    <TableCell>{r.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{r.patientsPerDay}</Badge>
                    </TableCell>
                    <TableCell>{r.createdAt ? new Date(r.createdAt).toLocaleString("en-ZA") : "—"}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {r.id}
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

