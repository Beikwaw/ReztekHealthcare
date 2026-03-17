# Reztek Healthcare Practice – Video Script: Roles and How to Use the Site

**Use this text to record your video. Each section is written so you can demonstrate: what each role does, and exactly where to click and what you will see.**

---

## Part 1: Signing In (All Roles)

### Opening the portal
- Open the staff sign-in page. You will see the **Reztek Healthcare Practice** branding on the left and a **Sign in** form on the right.
- Enter your **email** and **password** (staff credentials only).
- Click **Sign in**.

### What happens next depends on your role

**If you are Admin (Reztek administrator)**  
- You sign in with **email and password only**. There is **no** two-factor authentication for admin.
- After clicking **Sign in**, you are taken straight to the **Dashboard**. The sidebar shows “Logged in as Administrator” and the admin menu.

**If you are Clerk**  
- You sign in with **email and password only**. After clicking **Sign in**, you are taken straight to the **Dashboard** (no two-factor authentication).

**If you are Doctor or Pharmacy**  
- You sign in with **email and password only**. No 6-digit code. After **Sign in**, you go straight to your role’s dashboard.

### Signing out (all roles)
- In the **sidebar**, scroll to the bottom. Click **Sign Out**. You are logged out and can sign in again with the same or another account.

---

## Part 2: Admin – What You Do and How to Do It

### Who is Admin?
- The **Administrator** (e.g. Reztek admin) has full access: staff, patients, consultations, pharmacy, billing, **patient activity and deletion requests**, reports, and settings.  
- Admin does **not** manage appointments in this portal (appointments are for clerks and doctors).

### What you see when you sign in (Admin)
1. After sign-in you land on **Dashboard**.
2. At the top you see **“Admin – [Your name]”** and the line **“Overview of the practice and quick links.”**
3. **Four stat cards** show: **Total Patients**, **Waiting Today**, **Consultations Today**, **Invoices** (these use **real data** from the system).
4. **Quick Actions** (clickable cards):
   - **Staff** – Opens the Staff management page.
   - **Patients** – Opens the full patient list.
   - **Settings** – Opens practice and app settings.
   - (There is no Appointments quick action for admin.)
5. **Reports** – One card that links to the Reports page.
6. **Deletion requests** – A card listing **pending** deletion requests (if any) with an **Approve & delete** button for each.
7. **Patient Activity (deletions & status)** – A card showing the latest patient deletions and status changes (who did what and when, with correct timestamps).

### Sidebar (Admin) – Where to go
- **Dashboard** – Home / overview.
- **Patients** – List and search all patients.
- **Consultations** – View all consultations (no Appointments link for admin).
- **Pharmacy** – Pharmacy orders.
- **Billing** – Invoices.
- **Medical Aid Claims** – Medical aid claims.
- **Patient Analytics** – Analytics view.
- **Medical Aid Billing** – Medical aid billing.
- **Patient Activity** – **Click here** to see the full **Patient Activity & Audit** page.
- **Deletion Requests** – **Click here** to see all pending deletion requests in one place.
- **Staff** – Staff list (real users from the system).
- **Reports** – Reports and analytics (real data).
- **Settings** – Practice settings.

### How to use the site as Admin (demonstrative steps)

**1. View and filter patient activity (audit)**  
- In the sidebar, click **Patient Activity**.  
- You will see two sections:  
  - **Patient Activity (deletions & status)** – Use the **filter dropdown** and choose **All**, **Deleted**, or **Status change**. The list **scrolls** so you can review all events. Each row shows: what happened (e.g. “Patient deleted” or “Status change”), which patient, who did it (name and role), and the **date and time** (correctly formatted).  
  - **Security audit (login / logout)** – Below that, you see who **signed in** or **signed out** and **when** (user name/email and timestamp).  
- Use **Refresh** at the top to reload the lists.

**2. Handle deletion requests**  
- In the sidebar, click **Deletion Requests**.  
- You will see a list of **pending** requests. Each row shows the **patient name**, who requested the deletion, and when.  
- To approve a deletion (patient and related records removed by the system), click **Approve & delete** for that request. Confirm if prompted. When done, the request disappears from the list.  
- You can also use the **Deletion requests** card on the **Dashboard** for the same action.

**3. View and manage staff (real data)**  
- In the sidebar, click **Staff**.  
- You will see the **real staff** list from the system (Firebase/Firestore): **Total Staff**, **Doctors**, **Pharmacy**, **Support Staff** counts and a **table** with each person’s name, contact (email/phone), **Role**, and **Joined** date.  
- Use the **Search** box to filter by name, email, or role.  
- Staff are created and managed in **Firebase** (Authentication + Firestore `users` collection). The “Add Staff Member” dialog is available; adding or changing roles is done in Firebase as per your setup docs.

**4. View reports (real data)**  
- In the sidebar, click **Reports**.  
- You will see **Reports & Analytics** with **real data**: **Total Patients**, **Appointments**, **Total Revenue**, **Pending Revenue**, and charts (e.g. appointments by type, revenue, patients).  
- Use the **Period** dropdown (week, month, quarter, year) and **Export** as implemented. All numbers come from live data, not mock data.

**5. Patients, Consultations, Billing, Pharmacy, Settings**  
- **Patients** – Search, view, edit, add appointments for a patient, request deletion (where implemented).  
- **Consultations** – Open any consultation to see full detail (symptoms, summary, diagnosis, prescriptions).  
- **Billing** – View and create invoices.  
- **Pharmacy** – View and manage pharmacy orders.  
- **Settings** – Update practice details, notifications, security, appearance; click **Save** to apply.

**6. Sign out**  
- In the sidebar, click **Sign Out** when finished. Your logout is recorded in **Security audit** for the next time an admin views **Patient Activity**.

---

## Part 3: Clerk – What You Do and How to Do It

### Who is Clerk?
- The **Clerk** (reception) registers patients, manages the waiting list, appointments, billing, and medical aid claims. The clerk **does not** see clinical content (symptoms, diagnosis, AI summary) or manage staff, settings, or full reports.  
- Clerks sign in with **email and password only** (no two-factor authentication).

### What you see when you sign in (Clerk)
1. After clicking **Sign in**, you land on **Dashboard**.
2. You see a welcome message and **Register New Patient** (or similar) as the main action.
3. **Stats:** e.g. Total Patients, Today’s Registrations, Waiting List, Today’s Date.
4. **Quick Actions:** Register New Patient, Search Patients, View Waiting List.
5. **Recently Registered** – Last registered patients with status (Waiting, With Doctor, Completed); **View All** goes to the full patient list.

### Sidebar (Clerk)
- **Dashboard** – Home.
- **Register Patient** – New patient form.
- **Patients** – Search and view patients (no clinical fields).
- **Waiting List** – Who is waiting or in consultation.
- **Appointments** – Manage appointments.
- **Billing** – Invoices (badge may show count).
- **Medical Aid Claims** – Medical aid claims.
- **Medical Aid Billing** – Medical aid billing.

### How to use the site as Clerk (demonstrative steps)

**1. Register a new patient**  
- Click **Register Patient** in the sidebar (or **Register New Patient** on the dashboard).  
- Fill the form: Account Number, Title, First Names, Surname, ID/Passport, Date of Birth, contact details, address, Account Responsible, medical aid if applicable, emergency/guardian if needed.  
- Click **Submit**.  
- In the **post-registration** dialog choose:  
  - **Create Bill & Send to Waiting** – Creates a bill (patient pre-filled) and sends the patient to the waiting list when you submit the bill.  
  - **Send to Waiting Only** – Puts the patient on the waiting list only; you can create a bill later from Billing or the patient.  
- Click **Done** when finished.

**2. Search and view patients**  
- Click **Patients** in the sidebar.  
- Use the **Search** box (name, email, phone, patient number).  
- Click **View** (eye) to open a patient’s details (demographics and admin info only—no symptoms or diagnosis).  
- Use **Edit** to change details, **Send to Waiting** to add them to the queue, or **Delete** (if allowed) with confirmation.

**3. Manage the waiting list**  
- Click **Waiting List** in the sidebar.  
- You will see everyone currently **Waiting** or **With Doctor**.  
- Use **Search** to filter by name, surname, or patient number.  
- For each patient: **View Details** (modal with number, phone, email, gender, medical aid, allergies, etc.), or **Remove** to mark them as completed (confirm in the dialog).  
- You do **not** see **Begin Consultation**—that is for the doctor.

**4. Billing**  
- Click **Billing** in the sidebar.  
- **New invoice** – Create an invoice; you can open the page with a patient pre-filled (e.g. from post-registration). Add line items, due date, discount; click **Submit** to save.  
- From the invoice list, open any invoice to view or edit.

**5. Appointments and Medical Aid**  
- **Appointments** – Create, view, and edit appointments and link them to patients.  
- **Medical Aid Claims** and **Medical Aid Billing** – Use these as configured for your practice.

**6. Sign out**  
- In the sidebar, click **Sign Out**. Your logout is recorded in the **Security audit** (visible to admin on the Patient Activity page).

---

## Part 4: Doctor – What You Do and How to Do It

### Who is Doctor?
- The **Doctor** sees the patient queue, starts and completes consultations, captures symptoms, uses the AI summary, writes prescriptions, and can view patients, appointments, and medical aid. The doctor does **not** manage staff or settings. Reports may be admin-only depending on configuration.

### What you see when you sign in (Doctor)
- You sign in with **email and password only** (no 6-digit code).  
- Dashboard shows a welcome (e.g. “Welcome back, Dr. [Surname]”), **View Waiting List**, and stats: Waiting Patients, In Consultation, Today’s Consultations, Total Patients.  
- **Quick Actions:** Next Patient, View Consultations, All Patients.  
- **Waiting Patients** – First few in the queue with **Start Consultation**; **View All** opens the full waiting list.

### Sidebar (Doctor)
- **Dashboard** – Home.
- **Waiting Patients** – Queue (badge may show count).
- **Consultations** – List and detail of consultations.
- **Patients** – Patient records.
- **Appointments** – Appointments.
- **Patient Analytics** – Analytics.
- **Medical Aid Claims** – Medical aid claims.
- **Medical Aid Billing** – Medical aid billing.

### How to use the site as Doctor (demonstrative steps)

**1. Start a consultation**  
- Click **Waiting Patients** (or **View Waiting List** on the dashboard).  
- Find the next patient and click **Begin Consultation**.  
- You are taken to the **New Consultation** page for that patient.

**2. Complete the consultation form**  
- **Patient Information** – Read-only (name, number, contact, DOB, medical aid, allergies, etc.).  
- **Patient Call & Consultation** – Tick: **Called patient by name and surname**, **Patient arrived, begin medical assessment**.  
- **General Health Questionnaire** – Choose a **category** (e.g. Cardiovascular, Respiratory), tick **symptoms**, add **Additional details** in the text area.  
- Click **Generate AI-Assisted Summary**. Wait for the **Clinical Summary** and **Dr diagnosis and finding** (editable).  
- Edit the summary and diagnosis if needed, then click **Doctor approves AI summary**.  
- Add **Doctor Notes** if desired.  
- Click **Complete Consultation** to save and open the **Consultation detail** page.

**3. Prescription and finish**  
- On the **Consultation detail** page: click **Add / Edit Prescription**, add medication, dosage, frequency, duration, instructions; click **Save**.  
- Use **Send script / PDF** or **Email consultation** as implemented.  
- When the visit is fully done, click **Complete consultation** so the patient is marked completed and removed from the queue.

**4. Other pages**  
- **Consultations** – Review past consultations.  
- **Patients** and **Appointments** – View and use as needed.  
- **Sign Out** in the sidebar when done.

---

## Part 5: Pharmacy – What You Do and How to Do It

### Who is Pharmacy?
- The **Pharmacy** role sees **Pending Orders** and **Dispense History**. You sign in with email and password only (no 6-digit code).

### Sidebar (Pharmacy)
- **Dashboard** – Home.
- **Pending Orders** – Orders to dispense (badge may show count).
- **Dispense History** – History of dispensed orders.

### How to use the site as Pharmacy
- Open **Pending Orders** to see and process orders.  
- Open **Dispense History** to review what has been dispensed.  
- Use **Sign Out** in the sidebar when done.

---

## Summary Table (copy-paste friendly)

| Role   | Main tasks | Key pages / buttons |
|--------|------------|----------------------|
| **Admin** | Full access except appointments; staff (real data), patients, consultations, pharmacy, billing, **Patient Activity** (filter: All/Deleted/Status), **Deletion Requests**, **Security audit** (login/logout), **Reports** (real data), Settings | Dashboard → Quick Actions (Staff, Patients, Settings); Sidebar: Patient Activity, Deletion Requests, Staff, Reports, Patients, Consultations, Billing, Pharmacy, Settings; Sign Out |
| **Clerk** | Register patients, waiting list, appointments, billing, medical aid; email/password sign-in only | Register Patient, Patients (search/view/edit), Waiting List (View Details, Remove), Billing (New invoice), Appointments, Medical Aid Claims/Billing; Sign Out |
| **Doctor** | Queue, consultations, symptoms, AI summary, prescriptions, complete visit; no MFA | Waiting Patients → Begin Consultation; New Consultation (checkboxes, questionnaire, Generate AI Summary, Doctor approves, Complete Consultation); Consultation detail (Prescription, Complete consultation); Sign Out |
| **Pharmacy** | Pending orders, dispense history | Pending Orders, Dispense History; Sign Out |

---

## Why This System Is Beneficial to a Healthcare Clinic

- **One place for everything** – Patient registration, waiting list, consultations, prescriptions, billing, and medical aid claims live in a single portal. Staff spend less time switching tools and more time with patients.
- **Role-based access** – Admins, clerks, doctors, and pharmacy each see only what they need. Clinical details stay with clinicians; reception handles front desk and billing without seeing sensitive notes.
- **Faster consultations** – AI-assisted summaries help doctors capture symptoms and draft findings quickly. Less typing means more face-to-face time and clearer records.
- **Clear billing and claims** – Invoices and medical aid submissions are generated from consultation data. Fewer manual forms and fewer errors mean faster payments and less admin.
- **Audit and compliance** – Patient activity (deletions, status changes) and security audit (logins/logouts) give clinics a traceable record for governance and dispute resolution.
- **Scalable and professional** – The same system works for a small practice or a multi-doctor clinic. Reztek branding and letterhead keep communications consistent and professional.

---

## Suggested Monthly Client Pricing (Rands)

Use these as a starting point; adjust for practice size, location, and included support.

| Tier | Monthly fee (ZAR) | Typical use |
|------|-------------------|-------------|
| **Small practice** (1–2 clinicians, single site) | **R 1 500 – R 3 000** | Basic staff portal, patients, consultations, billing, basic support |
| **Medium practice** (3–8 clinicians or 2 sites) | **R 3 500 – R 6 500** | Above + medical aid integration, more users, priority support |
| **Large / multi-site** | **R 7 000 – R 12 000+** | Full features, multiple locations, dedicated onboarding and support |

- **Per-seat add-ons:** Extra doctors or clerks beyond the tier: about **R 200 – R 400** per user per month.
- **One-off setup:** Consider **R 2 000 – R 5 000** for initial configuration, training, and data migration (optional).

**Recommendation:** Start at **R 2 000 – R 2 500/month** for a typical small clinic, then scale pricing as you add users and features.

---

**End of script.** You can copy any section above for your video voiceover or captions. Each part is written so you can demonstrate on screen: click here, you see this; do this next, you see that.
