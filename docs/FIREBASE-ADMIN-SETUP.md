# Firebase: Reztek admin and authentication

This app uses **Firebase Authentication** (email/password) and **Firestore** for user profiles.  
**Only clerks** are required to use MFA (TOTP). The **admin** (Reztek) does **not** use MFA.

---

## 1. Remove the current admin (optional)

If you are replacing an existing admin:

1. **Firebase Console** → your project → **Authentication** → **Users**.
2. Find the admin user (e.g. the one with admin role) and delete it (⋮ → **Delete account**).
3. **Firestore** → **Data** → open the **`users`** collection.
4. Find the document whose **document ID** is the same as that user’s **UID** and delete it (or leave it; the app will treat “no profile” as clerk by default, but a stale doc could be confusing).

---

## 2. Create the Reztek admin in Firebase

### Step A: Create the Auth user

1. **Firebase Console** → **Authentication** → **Users** → **Add user**.
2. Enter:
   - **Email**: e.g. `admin@reztek.co.za` (or your chosen admin email).
   - **Password**: a strong password (you’ll use this to sign in to the app).
3. Click **Add user**.
4. Copy the new user’s **UID** (e.g. `abc123...`) from the Users table. You need this for the next step.

### Step B: Create the Firestore profile (admin document)

The app loads the user’s **role** from Firestore collection **`users`**, document ID = **Auth UID**.

1. **Firestore** → **Data** → **`users`** collection.
2. Click **Add document**.
3. **Document ID**: paste the **UID** from Step A (must match the Auth user’s UID exactly).
4. Add fields:

   | Field         | Type   | Value                    |
   |--------------|--------|---------------------------|
   | `email`      | string | same as Auth email       |
   | `name`       | string | e.g. `Reztek Admin`       |
   | `role`       | string | **`admin`**               |
   | `createdAt`  | timestamp | (optional) e.g. now   |

5. Save.

The admin can now sign in with **email + password only** (no MFA). The dashboard will **not** redirect them to MFA enrollment.

---

## 3. MFA for clerks only

- **Firebase Console** → **Authentication** → **Sign-in method** → **Multi-factor authentication**: keep **TOTP (Authenticator)** **enabled** so clerks can enroll and sign in with a 6-digit code.
- **Clerks**: must enroll TOTP at `/dashboard/mfa/enroll` and enter the 6-digit code at login. The app enforces this for `role === "clerk"` only.
- **Admin**: no MFA; do **not** enroll MFA for the admin Auth user in Firebase.

---

## 4. Summary

| Step | Where | What |
|------|--------|------|
| Delete old admin | Auth → Users, Firestore → `users` | Remove Auth user and optional `users/{uid}` doc |
| Create admin Auth user | Auth → Users → Add user | Email + password, copy **UID** |
| Create admin profile | Firestore → `users` | New doc with **document ID = UID**, field `role` = `"admin"` |
| MFA | Auth → Sign-in method → MFA | Keep TOTP enabled; only clerks use MFA in the app |

After this, the new admin can log in with email/password only; clerks will still be required to set up and use Google Authenticator.
