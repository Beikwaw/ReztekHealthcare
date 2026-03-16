"use client"

import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package } from "lucide-react"

export default function PharmacyInventoryPage() {
  const { user } = useAuth()

  if (user?.role !== "pharmacy" && user?.role !== "admin") {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="w-6 h-6 text-primary" />
          Inventory Management
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage stock levels for in-house pharmacy.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventory</CardTitle>
          <CardDescription>
            Stock management for medications available at the practice.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center text-muted-foreground rounded-lg border border-dashed">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Inventory tracking coming soon</p>
            <p className="text-sm mt-1">
              For external pharmacy fulfillment, use the Orders page to print or email prescriptions to patients.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
