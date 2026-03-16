# E2E Tests (Playwright)

End-to-end tests for the Dr. Mkhonza staff portal, covering **doctor** and **clerk** routes.

## Prerequisites

- **Dev server running**: Start the app with `npm run dev` (or `pnpm dev`) so it is available at `http://localhost:3000`.
- **Firebase**: Ensure `.env.local` has valid Firebase config and that the test users exist in Firebase Auth and have the correct roles in Firestore.

## Test users

| Role   | Email                    | Password   |
|--------|--------------------------|------------|
| Doctor | dr.mkhonza@drmkhonza.co.za | Doctor123! |
| Clerk  | clerk@drmkhonza.co.za   | Clerk123!  |

## Run tests

```bash
# Install browsers (first time only)
npx playwright install chromium

# Run all e2e tests (Chromium only for speed)
npx playwright test --project=chromium

# Run all projects (Chromium, Firefox, WebKit)
npm run test:e2e

# Run only doctor or clerk tests
npx playwright test tests/doctor.spec.ts --project=chromium
npx playwright test tests/clerk.spec.ts --project=chromium

# Run with UI
npm run test:e2e:ui
```

## What is tested

### Login (`tests/login.spec.ts`)
- Login page loads (email, password, sign in button).
- Doctor and clerk can sign in and land on dashboard.
- Invalid credentials show an error and stay on login.

### Doctor routes (`tests/doctor.spec.ts`)
- Dashboard shows doctor nav (Consultations, Waiting Patients, Patients, Appointments).
- Waiting Patients page loads.
- Consultations page loads (tabs, list or empty state).
- New consultation page loads.
- Patients page loads (search/table).
- Appointments page loads.
- Consultation detail page loads when opening a consultation (or empty state when none).

### Clerk routes (`tests/clerk.spec.ts`)
- Dashboard shows clerk nav (Register Patient, Patients, Waiting List, Appointments, Billing).
- Register Patient page loads.
- Patients list loads.
- Waiting List page loads.
- Appointments page loads.
- Billing page loads.
- Clerk “Billing & Appointments” link goes to `/dashboard/patients/[id]/billing` (not full record).
- Direct visit to `/dashboard/patients/[id]` redirects clerk to `/dashboard/patients/[id]/billing`.
- New invoice page loads.

## Config

- **Config file**: `playwright.config.ts`
- **Base URL**: `http://localhost:3000` (override with `PLAYWRIGHT_BASE_URL`).
- **CI**: In CI, set `CI=1` so Playwright can start the app with `npm run build && npm run start` before running tests.
