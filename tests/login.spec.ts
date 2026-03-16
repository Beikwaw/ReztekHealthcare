import { test, expect } from "@playwright/test"

test.describe("Login", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/login")
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible()
    await expect(page.getByLabel("Email")).toBeVisible()
    await expect(page.getByLabel("Password")).toBeVisible()
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible()
  })

  test("doctor can log in and reach dashboard", async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel("Email").fill("dr.mkhonza@drmkhonza.co.za")
    await page.getByLabel("Password").fill("Doctor123!")
    await page.getByRole("button", { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
    await expect(page.getByRole("link", { name: /consultations/i })).toBeVisible()
  })

  test("clerk can log in and reach dashboard", async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel("Email").fill("clerk@drmkhonza.co.za")
    await page.getByLabel("Password").fill("Clerk123!")
    await page.getByRole("button", { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
    await expect(page.getByRole("link", { name: /billing|register patient/i })).toBeVisible()
  })

  test("invalid credentials show error", async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel("Email").fill("wrong@example.com")
    await page.getByLabel("Password").fill("wrongpass")
    await page.getByRole("button", { name: /sign in/i }).click()
    await expect(page.getByText(/invalid|error|incorrect/i)).toBeVisible({ timeout: 10000 })
    await expect(page).toHaveURL(/\/login/)
  })
})
