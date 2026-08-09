---
name: Tenant Isolation Architecture
description: How clinic data isolation is enforced at the API level — all data tables have clinic_id, all routes use requireClinic middleware
---

## The Rule
Every tenant-data route MUST use `requireClinic` middleware from `artifacts/api-server/src/middlewares/adminAuth.ts`. Every DB query on tenant data MUST filter by `eq(table.clinicId, req.clinicId!)`.

**Why:** Without this, Clinic A can read Clinic B's patients/records/invoices by calling the API directly. All data tables share one PostgreSQL DB.

## How to Apply
```typescript
import { requireClinic } from "../middlewares/adminAuth";
router.use(requireClinic); // at top of router

// GET: add eq(table.clinicId, req.clinicId!) to WHERE
// POST: add clinicId: req.clinicId to inserted values
// PATCH/DELETE: use and(eq(table.clinicId, req.clinicId!), eq(table.id, id)) in WHERE
```

## Tables With clinic_id (nullable, added via drizzle push)
patients, doctors, appointments, medical_records, prescriptions, invoices,
lab_requests, radiology_requests, medications, inventory, departments, staff,
payments, insurance, branches, clinic_settings, admin_users, doctor_accounts, whatsapp

## Routes Updated With requireClinic
patients.ts, doctors.ts, appointments.ts, medicalRecords.ts, invoices.ts,
prescriptions.ts, departments.ts, staff.ts, branches.ts, settings.ts,
dashboard.ts, adminUsers.ts

## Routes NOT Protected (intentionally public or have own auth)
- patientAuth.ts — patient JWT auth, not admin
- doctorAuth.ts — doctor login flow
- onlineBookings.ts — mixed: public availability + protected bookings
- zapier.ts — has its own webhook-secret auth
- health.ts — public

## Auth Flow
1. POST /api/auth/login → queries adminUsers table by username
2. If found: verifies password, returns JWT `{ role: "admin", clinicId, adminId, adminName }`
3. If not in DB: falls back to ADMIN_USERNAME/ADMIN_PASSWORD env vars (legacy single-tenant)
4. `requireClinic` middleware: verifies JWT, rejects if no clinicId in payload (returns 403)
5. `req.clinicId` is available in all handlers after requireClinic

## Security Events
All login attempts (success + failure) logged to `security_events` table via `securityLogger.ts`.
Super Admin can view via GET /api/superadmin/security/events|stats|active-sessions.
