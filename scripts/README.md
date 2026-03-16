# Firestore Database Seeding CLI

This directory contains scripts for seeding your Firestore database with initial data.

## Prerequisites

1. Make sure your `.env.local` file is configured with Firebase credentials
2. Firebase Authentication must be enabled in your Firebase project
3. Firestore Database must be created and initialized
4. **Important**: You need to create users in Firebase Authentication first (see below)

## Usage

### Seed real staff users (Clerk, Admin, Doctor) – production

Use real Gmail accounts and set passwords via environment variables (never commit passwords):

1. In `.env.local` add (once) your passwords for each account:
   ```
   SEED_CLERK_PASSWORD=<clerk-password>
   SEED_ADMIN_PASSWORD=<admin-password>
   SEED_DR_PASSWORD=<doctor-password>
   ```
2. Run:
   ```bash
   node scripts/seed-real-users.js
   ```
3. Remove or comment out the `SEED_*` lines from `.env.local` after seeding.

This creates/updates Firebase Auth users and their Firestore `users` documents with roles:

| Role   | Email                     |
|--------|---------------------------|
| Clerk  | clerk1drmkhonza@gmail.com |
| Admin  | reztekportal@gmail.com    |
| Doctor | winston.mkhonza@gmail.com |

Requires `firebase-service-account.json` in the project root.

### Seed All Data (Users + Sample Data)

```bash
pnpm run seed:firestore
# or
node scripts/seed-firestore.js
```

This will create:
- 5 users with different roles (admin, doctor, clerk, pharmacy, patient)
- 3 sample patients
- Sample appointments
- Sample invoices

### Seed Users Only

```bash
pnpm run seed:users
# or
node scripts/seed-firestore.js --users-only
```

This will only create the user accounts in Firebase Auth and their profiles in Firestore.

## Created Users

After running the script, you'll see login credentials for all created users:



## Important Notes

⚠️ **Security Warning**: These are default passwords for development only. Change them immediately in production!

⚠️ **Firebase Authentication**: The script uses Firebase client SDK, so you need to:
1. Enable Email/Password authentication in Firebase Console
2. Make sure your Firestore security rules allow writes (for development)

## Firebase Console Setup

### Step 1: Enable Authentication

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `dr-mkhonza-health-practice`
3. Go to **Authentication** → **Sign-in method**
4. Enable **Email/Password** provider

### Step 2: Create Users in Firebase Authentication

**Option A: Via Firebase Console (Easiest)**
1. Go to **Authentication** → **Users**
2. Click **Add user** for each user below:

| Email                          | Password     |
|--------------------------------|--------------|
| admin@drmkhonza.co.za          | Admin123!    |
| dr.mkhonza@drmkhonza.co.za    | Doctor123!   |
| clerk@drmkhonza.co.za         | Clerk123!    |
| pharmacy@drmkhonza.co.za      | Pharmacy123! |
| patient@example.com           | Patient123!  |

**Option B: Via Firebase CLI** (See `scripts/firebase-cli-setup.md` for detailed instructions)

### Step 3: Set up Firestore

1. Go to **Firestore Database**
2. Create database (if not already created)
3. Start in test mode for development (or set proper security rules)

### Step 4: Run the Seed Script

After creating users, run:
```bash
pnpm run seed:firestore
```

This will create user profiles and sample data in Firestore.

## Troubleshooting

### Error: "auth/email-already-in-use"
- The user already exists. The script will skip creating that user and continue.

### Error: "Missing required Firebase environment variables"
- Make sure your `.env.local` file exists and contains all required variables:
  - `NEXT_PUBLIC_FIREBASE_API_KEY`
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `NEXT_PUBLIC_FIREBASE_APP_ID`
  - `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

### Error: "Permission denied"
- Check your Firestore security rules
- For development, you can temporarily use:
  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /{document=**} {
        allow read, write: if true;
      }
    }
  }
  ```
- ⚠️ **Never use these rules in production!**

## Collections Created

The script creates data in the following Firestore collections:

- `users` - User profiles with roles
- `patients` - Patient records
- `appointments` - Appointment records
- `invoices` - Billing invoices
- `medicalRecords` - Medical history records
- `prescriptions` - Prescription records
- `pharmacyOrders` - Pharmacy order records
- `notifications` - System notifications

## Customization

You can modify the seed data by editing `scripts/seed-firestore.js`:

- `usersData` - Array of users to create
- `patientsData` - Array of patients to create
- Modify `createAppointments()` and `createInvoices()` functions to add more sample data

