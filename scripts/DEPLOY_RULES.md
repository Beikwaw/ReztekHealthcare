# Deploy Firestore Security Rules

## Quick Method: Firebase Console (Recommended)

1. **Open Firestore Rules in Firebase Console:**
   - Go to: https://console.firebase.google.com/u/0/project/dr-mkhonza-health-practice/firestore/rules

2. **Copy the rules:**
   - Open `firestore.rules` file in this project
   - Copy all the content

3. **Paste and publish:**
   - Paste the rules into the Firebase Console editor
   - Click **"Publish"** button

That's it! Your rules are now active.

## Alternative: Firebase CLI

If you have Firebase CLI installed:

```bash
# Install Firebase CLI (if not installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase (if not already done)
firebase init firestore

# Deploy rules
firebase deploy --only firestore:rules
```

## What These Rules Do

The security rules provide:

- ✅ **Authenticated users** can read their own user profile
- ✅ **Staff** (admin, doctor, clerk, pharmacy) can read all patients, appointments, invoices
- ✅ **Patients** can only read their own data
- ✅ **Role-based access control** - each role has appropriate permissions
- ✅ **Secure by default** - denies access unless explicitly allowed

## Testing

After deploying rules, try logging in again with:
- Email: `admin@drmkhonza.co.za`
- Password: `Admin123!`

The "Missing or insufficient permissions" error should be resolved.

