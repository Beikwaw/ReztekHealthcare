import { test, expect } from "@playwright/test"
import { loginAsClerk } from "./auth"

test.describe("Clerk routes", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClerk(page)
  })

  test("dashboard loads and shows clerk content", async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/welcome|dashboard/i)
    await expect(page.getByRole("link", { name: /register patient/i })).toBeVisible()
    await expect(page.getByRole("link", { name: /waiting list/i })).toBeVisible()
    await expect(page.getByRole("link", { name: /billing/i })).toBeVisible()
    await expect(page.getByRole("link", { name: /appointments/i })).toBeVisible()
    await expect(page.getByRole("link", { name: /patients/i })).toBeVisible()
  })

  test("Register Patient page loads", async ({ page }) => {
    await page.getByRole("link", { name: /register patient/i }).first().click()
    await expect(page).toHaveURL(/\/dashboard\/patients\/new/)
    await expect(
      page.getByRole("heading", { name: /register|patient|new/i }).first()
    ).toBeVisible({ timeout: 10000 })
  })

  test("Patients page loads", async ({ page }) => {
    await page.getByRole("link", { name: /patients/i }).first().click()
    await expect(page).toHaveURL(/\/dashboard\/patients/)
    await expect(page.getByRole("heading", { name: /patients/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test("Patients list shows search or table or empty state", async ({ page }) => {
    await page.goto("/dashboard/patients")
    await expect(page).toHaveURL(/\/dashboard\/patients/)
    await expect(
      page
        .getByPlaceholder(/search/i)
        .or(page.getByRole("table"))
        .or(page.getByText(/all patients|no patients|patients/i))
    ).toBeVisible({ timeout: 10000 })
  })

  test("Waiting List page loads", async ({ page }) => {
    await page.getByRole("link", { name: /waiting list/i }).first().click()
    await expect(page).toHaveURL(/\/dashboard\/waiting/)
    await expect(
      page.getByRole("heading", { name: /waiting|list/i }).first()
    ).toBeVisible({ timeout: 10000 })
  })

  test("Appointments page loads", async ({ page }) => {
    await page.getByRole("link", { name: /appointments/i }).first().click()
    await expect(page).toHaveURL(/\/dashboard\/appointments/)
    await expect(page.getByRole("heading", { name: /appointment/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test("Billing page loads", async ({ page }) => {
    await page.getByRole("link", { name: /billing/i }).first().click()
    await expect(page).toHaveURL(/\/dashboard\/billing/)
    await expect(
      page.getByRole("heading", { name: /billing|invoice/i }).first()
    ).toBeVisible({ timeout: 10000 })
  })

  test("Clerk cannot access full patient record and is redirected to billing", async ({ page }) => {
    await page.goto("/dashboard/patients")
    await expect(page).toHaveURL(/\/dashboard\/patients/)
    const firstPatientLink = page.getByRole("link", { name: /billing & appointments/i }).first()
    if (await firstPatientLink.isVisible()) {
      await firstPatientLink.click()
      await expect(page).toHaveURL(/\/dashboard\/patients\/[^/]+\/billing/)
      await expect(
        page.getByRole("heading", { name: /billing|appointments/i }).first()
      ).toBeVisible({ timeout: 10000 })
      await expect(page.getByRole("link", { name: /create invoice/i })).toBeVisible()
    }
  })

  test("Direct visit to patient record URL redirects clerk to billing sub-route", async ({ page }) => {
    const dummyPatientId = "test-patient-redirect-123"
    await page.goto(`/dashboard/patients/${dummyPatientId}`)
    await page.waitForURL(/\/dashboard\/patients\/.+\/billing/, { timeout: 10000 })
    await expect(page).toHaveURL(new RegExp(`/dashboard/patients/${dummyPatientId}/billing`))
  })

  test("Clerk billing page shows invoices and appointments sections", async ({ page }) => {
    await page.goto("/dashboard/patients")
    const billingLink = page.getByRole("link", { name: /billing & appointments/i }).first()
    if (await billingLink.isVisible()) {
      await billingLink.click()
      await expect(page).toHaveURL(/\/dashboard\/patients\/.+\/billing/)
      await expect(
        page.getByRole("heading", { name: /invoices|appointments|billing/i }).or(
          page.getByText(/invoices|appointments/i)
        )
      ).toBeVisible({ timeout: 10000 })
    }
  })

  test("New invoice page loads with patient param when navigated from billing", async ({ page }) => {
    await page.goto("/dashboard/billing/new")
    await expect(page).toHaveURL(/\/dashboard\/billing\/new/)
    await expect(
      page.getByRole("heading", { name: /invoice|new|billing/i }).first()
    ).toBeVisible({ timeout: 10000 })
  })
})
