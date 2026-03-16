/**
 * Predefined medical consumables for Medical Aid claims.
 * Used in the Add Billing Item dropdown (no free-text input).
 * Amount is manually entered by the user - these are item names only.
 */

export interface BillableItem {
  id: string
  name: string
}

export const BILLABLE_ITEMS: BillableItem[] = [
  { id: "bandage", name: "Bandage" },
  { id: "syringe", name: "Syringe" },
  { id: "gloves", name: "Gloves" },
  { id: "medication", name: "Medication" },
  { id: "iv-drip", name: "IV Drip" },
  { id: "dressing-kit", name: "Dressing Kit" },
  { id: "injection", name: "Injection" },
]

export function getBillableItemById(id: string): BillableItem | undefined {
  return BILLABLE_ITEMS.find((item) => item.id === id)
}
