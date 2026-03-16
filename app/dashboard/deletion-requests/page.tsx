"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useDeletionRequests } from "@/lib/firestore-hooks"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Trash2, Loader2 } from "lucide-react"

export default function DeletionRequestsPage() {
  const { user, firebaseUser } = useAuth()
  const { requests, loading, refetch } = useDeletionRequests("pending")
  const [approvingId, setApprovingId] = useState<string | null>(null)

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Only administrators can manage deletion requests.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const handleApproveDeletion = async (patientId: string, deletionRequestId: string) => {
    if (!firebaseUser) {
      toast.error("You must be signed in to approve deletions.")
      return
    }
    setApprovingId(deletionRequestId)
    try {
      const token = await firebaseUser.getIdToken()
      const res = await fetch("/api/admin/delete-patient", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ patientId, deletionRequestId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "Failed to delete patient.")
        return
      }
      toast.success("Patient deleted successfully.")
      refetch()
    } catch (err) {
      console.error("Approve deletion error:", err)
      toast.error("Failed to delete patient. Please try again.")
    } finally {
      setApprovingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Deletion Requests</h1>
        <p className="text-muted-foreground">Pending requests to permanently delete patients. Approve to delete patient and related records.</p>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Pending requests
          </CardTitle>
          <CardDescription>{requests.length} pending</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">No pending deletion requests.</p>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{req.patientName || req.patientId}</p>
                    <p className="text-sm text-muted-foreground">
                      Requested by {req.requestedByName}{" "}
                      {req.createdAt instanceof Date
                        ? req.createdAt.toLocaleString("en-ZA")
                        : new Date(req.createdAt).toLocaleString("en-ZA")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={approvingId !== null}
                    onClick={() => handleApproveDeletion(req.patientId, req.id)}
                  >
                    {approvingId === req.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Approve & delete
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
