import { Page } from "@playwright/test"

const DOCTOR_EMAIL = "dr.mkhonza@drmkhonza.co.za"
const DOCTOR_PASSWORD = "Doctor123!"
const CLERK_EMAIL = "clerk@drmkhonza.co.za"
const CLERK_PASSWORD = "Clerk123!"

export async function loginAsDoctor(page: Page): Promise<void> {
  await page.goto("/login")
  await page.getByLabel("Email").fill(DOCTOR_EMAIL)
  await page.getByLabel("Password").fill(DOCTOR_PASSWORD)
  await page.getByRole("button", { name: /sign in/i }).click()
  await page.waitForURL("/dashboard", { timeout: 15000 })
}

export async function loginAsClerk(page: Page): Promise<void> {
  await page.goto("/login")
  await page.getByLabel("Email").fill(CLERK_EMAIL)
  await page.getByLabel("Password").fill(CLERK_PASSWORD)
  await page.getByRole("button", { name: /sign in/i }).click()
  await page.waitForURL("/dashboard", { timeout: 15000 })
}
