# Firebase CLI Setup Guide

This guide shows you how to set up users and seed data using Firebase CLI, which is the preferred method according to your preferences.

## Prerequisites

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in your project (if not already done):
   ```bash
   firebase init firestore
   ```

## Method 1: Using Firebase Console (Easiest)

### Create Users via Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `dr-mkhonza-health-practice`
3. Navigate to **Authentication** → **Users**
4. Click **Add user** for each user:

   | Email                          | Password     | Role       |
   |--------------------------------|--------------|------------|
   | admin@drmkhonza.co.za          | Admin123!    | admin      |
   | dr.mkhonza@drmkhonza.co.za    | Doctor123!   | doctor     |
   | clerk@drmkhonza.co.za         | Clerk123!    | clerk      |
   | pharmacy@drmkhonza.co.za      | Pharmacy123!| pharmacy  |
   | patient@example.com           | Patient123!  | patient    |

5. After creating users, run the seed script to create Firestore documents:
   ```bash
   pnpm run seed:firestore
   ```

## Method 2: Using Firebase CLI with JSON Import

### Step 1: Create users.json file

Create a file `scripts/users.json`:

```json
{
  "users": [
    {
      "localId": "admin-uid",
      "email": "admin@drmkhonza.co.za",
      "passwordHash": "base64-encoded-password-hash",
      "salt": "base64-encoded-salt"
    }
  ]
}
```

**Note**: Generating password hashes requires Firebase Admin SDK. For simplicity, use Method 1 (Console) instead.

### Step 2: Import users

```bash
firebase auth:import scripts/users.json --project dr-mkhonza-health-practice
```

## Method 3: Using Firebase Admin SDK (Recommended for Production)

### Step 1: Get Service Account Key

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save the JSON file as `firebase-service-account.json` (add to `.gitignore`)

### Step 2: Create Admin Script

Create `scripts/seed-firestore-admin.js`:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

// Create users and Firestore documents
// (Similar to seed-firestore.js but using Admin SDK)
```

### Step 3: Run the script

```bash
node scripts/seed-firestore-admin.js
```

## Seeding Firestore Data

After creating users, run:

```bash
pnpm run seed:firestore
```

This will create:
- User profiles in Firestore
- Sample patients
- Sample appointments
- Sample invoices

## Firestore Security Rules

For development, you can use these rules (⚠️ **NOT for production**):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

For production, implement proper role-based access control based on user roles stored in the `users` collection.

## Verifying Setup

1. Check Authentication users:
   ```bash
   firebase auth:export users-export.json --project dr-mkhonza-health-practice
   ```

2. Check Firestore data:
   - Go to Firebase Console → Firestore Database
   - Verify collections: `users`, `patients`, `appointments`, `invoices`

3. Test login in your app:
   - Use the credentials from the seed script output
   - Verify each role can access their respective dashboard

