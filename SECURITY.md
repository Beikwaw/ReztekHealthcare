# Security – Keeping Keys Safe

**Never commit or share these:**

- **`.env.local`** – Contains Firebase client config, `OPENAI_API_KEY`, `RESEND_API_KEY`, etc. It is listed in `.gitignore` and must stay out of the repo.
- **`firebase-service-account.json`** – Contains the Firebase Admin private key. Used only on the server (e.g. API routes). Keep it local or in CI secrets; never commit. Also in `.gitignore`.
- **Any file matching `*-service-account*.json` or `*.pem`** – Ignored by default.

**Setup for new clones:**

1. Copy `.env.example` to `.env.local` and fill in real values (Firebase Console, OpenAI, Resend).
2. For server-side PDF/email: download the Firebase service account JSON from [Firebase Console → Project Settings → Service accounts] and save as `firebase-service-account.json` in the project root (do not commit).

**Demo / seed data:**

- `lib/auth-context.tsx` exposes **demo credentials** (e.g. admin123, doctor123) for development. In production, use real Firebase Auth users and consider disabling or overriding demo logins.
- Scripts in `scripts/` (e.g. `seed-firestore-auto.js`) use hardcoded seed passwords for initial setup. Change these after first run or use strong passwords in production.

**If a key was exposed:**

Rotate it immediately: regenerate in Firebase/OpenAI/Resend, update `.env.local` and any CI secrets, and remove the key from git history if it was ever committed (e.g. `git filter-branch` or BFG Repo-Cleaner).
