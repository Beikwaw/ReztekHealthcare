# Automated Firestore Setup Guide

This guide will help you automatically create all collections and data in Firestore.

## Quick Start (3 Steps)

### Step 1: Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **dr-mkhonza-health-practice**
3. Click the ⚙️ **Settings** icon → **Project settings**
4. Go to the **Service accounts** tab
5. Click **Generate new private key**
6. Save the downloaded JSON file as `firebase-service-account.json` in your project root
   ```bash
   # The file should be at:
   /Users/davdminlah/Desktop/clinic-management-system/firebase-service-account.json
   ```

### Step 2: Run the Automated Seed Script

```bash
pnpm run seed:auto
```

This will automatically:
- ✅ Create 5 users in Firebase Authentication
- ✅ Create user profiles in Firestore
- ✅ Create 3 sample patients
- ✅ Create sample appointments
- ✅ Create sample invoices

### Step 3: Verify in Firebase Console

Visit your Firestore database:
https://console.firebase.google.com/u/0/project/dr-mkhonza-health-practice/firestore/databases/-default-/data

You should see these collections:
- `users` - User profiles with roles
- `patients` - Patient records
- `appointments` - Appointment records
- `invoices` - Billing invoices

## What Gets Created

### Users (Firebase Auth + Firestore)

| Role       | Email                          | Password     |
|------------|--------------------------------|--------------|
| ADMIN      | admin@drmkhonza.co.za         | Admin123!    |
| DOCTOR     | dr.mkhonza@drmkhonza.co.za    | Doctor123!   |
| CLERK      | clerk@drmkhonza.co.za         | Clerk123!     |
| PHARMACY   | pharmacy@drmkhonza.co.za      | Pharmacy123! |
| PATIENT    | patient@example.com           | Patient123!  |

### Collections Created

- **users** - 5 user profiles
- **patients** - 3 sample patients with medical history
- **appointments** - 2 sample appointments
- **invoices** - 1 sample invoice

## Troubleshooting

### Error: "Could not initialize Firebase Admin SDK"

**Solution**: Make sure you've downloaded the service account key:
1. Check that `firebase-service-account.json` exists in project root
2. Verify the file is valid JSON
3. Make sure it's not corrupted

### Error: "Permission denied"

**Solution**: The service account needs proper permissions:
1. In Firebase Console → IAM & Admin
2. Make sure the service account has "Firebase Admin" role
3. Or use "Owner" role for development

### Error: "User already exists"

**Solution**: The script will skip existing users and continue. This is normal if you run the script multiple times.

## Security Notes

⚠️ **Important**:
- Never commit `firebase-service-account.json` to git (it's in .gitignore)
- Change default passwords in production
- Use proper Firestore security rules in production

## Next Steps

After running the script:
1. Test login with the credentials shown
2. Verify each role can access their dashboard
3. Check Firestore Console to see all created data
4. Start using the application!

