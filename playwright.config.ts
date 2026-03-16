import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  timeout: 30 * 1000,
  // Start dev server only in CI. Locally run: npm run dev (then npm run test:e2e).
  ...(process.env.CI
    ? {
        webServer: {
          command: "npm run build && npm run start",
          url: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
          timeout: 120 * 1000,
        },
      }
    : {}),
})
