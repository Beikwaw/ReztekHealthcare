import { test, expect } from "@playwright/test"
import { loginAsDoctor } from "./auth"

test.describe("Doctor routes", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDoctor(page)
  })

  test("dashboard loads and shows doctor content", async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/welcome|dashboard/i)
    await expect(page.getByRole("link", { name: /consultations/i })).toBeVisible()
    await expect(page.getByRole("link", { name: /waiting patients/i })).toBeVisible()
    await expect(page.getByRole("link", { name: /patients/i })).toBeVisible()
    await expect(page.getByRole("link", { name: /appointments/i })).toBeVisible()
  })

  test("Waiting Patients page loads", async ({ page }) => {
    await page.getByRole("link", { name: /waiting patients/i }).first().click()
    await expect(page).toHaveURL(/\/dashboard\/waiting/)
    await expect(page.getByRole("heading", { name: /waiting|patients/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test("Consultations page loads", async ({ page }) => {
    await page.getByRole("link", { name: /consultations/i }).first().click()
    await expect(page).toHaveURL(/\/dashboard\/consultations/)
    await expect(page.getByRole("heading", { name: /consultation/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test("Consultations list shows tabs or content", async ({ page }) => {
    await page.goto("/dashboard/consultations")
    await expect(page).toHaveURL(/\/dashboard\/consultations/)
    await expect(
      page.getByRole("tab", { name: /in-progress|completed|all/i }).or(
        page.getByText(/in-progress|completed|consultation/i)
      )
    ).toBeVisible({ timeout: 10000 })
  })

  test("Patients page loads", async ({ page }) => {
    await page.getByRole("link", { name: /patients/i }).first().click()
    await expect(page).toHaveURL(/\/dashboard\/patients/)
    await expect(page.getByRole("heading", { name: /patients/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test("Patients list shows search or table", async ({ page }) => {
    await page.goto("/dashboard/patients")
    await expect(page).toHaveURL(/\/dashboard\/patients/)
    await expect(
      page.getByPlaceholder(/search/i).or(page.getByRole("table")).or(page.getByText(/all patients|no patients/i))
    ).toBeVisible({ timeout: 10000 })
  })

  test("Appointments page loads", async ({ page }) => {
    await page.getByRole("link", { name: /appointments/i }).first().click()
    await expect(page).toHaveURL(/\/dashboard\/appointments/)
    await expect(page.getByRole("heading", { name: /appointment/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test("New consultation page loads when navigated", async ({ page }) => {
    await page.goto("/dashboard/consultations")
    const newLink = page.getByRole("link", { name: /new|start|create/i }).first()
    if (await newLink.isVisible()) {
      await newLink.click()
      await expect(page).toHaveURL(/\/dashboard\/consultations\/new/)
    } else {
      await page.goto("/dashboard/consultations/new")
      await expect(page).toHaveURL(/\/dashboard\/consultations\/new/)
    }
    await expect(page.getByRole("heading", { name: /consultation|new/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test("Consultation detail or empty state on consultations page", async ({ page }) => {
    await page.goto("/dashboard/consultations")
    await expect(page).toHaveURL(/\/dashboard\/consultations/)
    const viewDetailsLink = page.getByRole("link", { name: /view details|continue consultation/i }).first()
    if (await viewDetailsLink.isVisible()) {
      await viewDetailsLink.click()
      await expect(page).toHaveURL(/\/dashboard\/consultations\/[^/]+$/)
      await expect(
        page.getByRole("heading", { name: /consultation|details|not found/i }).first()
      ).toBeVisible({ timeout: 10000 })
    } else {
      await expect(page.getByText(/no consultation|consultations/i).first()).toBeVisible({ timeout: 5000 })
    }
  })
})
