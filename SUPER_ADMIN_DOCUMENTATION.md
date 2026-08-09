# Clinic OS — Super Admin Control Center Documentation

## Overview

The Super Admin Control Center is a separate, privileged administration layer for the Clinic OS SaaS platform. It is completely isolated from normal clinic tenant functionality.

---

## Architecture

```
Platform Layer (Super Admin)
├── /superadmin             — Dashboard
├── /superadmin/clinics     — Clinic / Tenant Management
├── /superadmin/subscriptions — Plans & Subscriptions
├── /superadmin/feature-flags — Feature Flag Management
├── /superadmin/audit-logs  — Immutable Audit Trail
├── /superadmin/system-health — Real-time System Health
├── /superadmin/settings    — Platform Settings
└── /superadmin/developer   — Developer Center

Tenant Layer (Clinic OS)
└── /                       — Clinic admin, doctors, patients
```

---

## Roles

| Role | Description |
|------|-------------|
| Super Admin | Full platform access — the seeded default account |

Default credentials (change immediately in production):
- **Username:** `superadmin`
- **Password:** `superadmin123`

---

## Authentication & Sessions

- Super Admin uses **scrypt** password hashing (not bcrypt — not shared with clinic auth).
- Sessions are stored **in-memory** server-side (Map). Tokens are opaque random 32-byte hex strings.
- Token is sent as `Authorization: Bearer <token>` on every protected request.
- Token is stored in `localStorage` key `sa-auth` on the frontend.
- Session is destroyed on logout (server-side delete + localStorage clear).

> **Production note:** Switch the in-memory session store to Redis or PostgreSQL for multi-instance deployments.

---

## Permissions

All Super Admin API routes are protected by `authMiddleware` which validates the Bearer token against the server-side session Map. There is no frontend-only permission gate — every route enforces server-side auth.

---

## Database Structure

### New Tables (Super Admin layer)

#### `subscription_plans`
Defines available pricing plans with limits and feature access.

| Column | Type | Description |
|--------|------|-------------|
| id | serial PK | |
| slug | text unique | starter \| pro \| medical_center |
| name | text | English name |
| name_ar | text | Arabic name |
| monthly_price | numeric | Monthly price in currency |
| annual_price | numeric | Annual price per month (discounted) |
| currency | text | Default: AED |
| trial_days | integer | Trial period length |
| max_doctors | integer | -1 = unlimited |
| max_staff | integer | -1 = unlimited |
| max_patients | integer | -1 = unlimited |
| max_branches | integer | -1 = unlimited |
| storage_gb | integer | -1 = unlimited |
| features | jsonb | Array of feature keys |
| is_active | boolean | Visible to new clinics |
| is_popular | boolean | Shown as "most popular" |
| sort_order | integer | Display order |

#### `feature_flags`
Global feature toggles managed at the platform level.

| Column | Type | Description |
|--------|------|-------------|
| id | serial PK | |
| key | text unique | e.g. `whatsapp`, `ai_assistant` |
| name | text | English name |
| name_ar | text | Arabic name |
| description | text | What it controls |
| enabled | boolean | Global on/off |
| category | text | feature \| experimental \| maintenance |
| updated_by | text | Username of last editor |

Available flag keys:
- `whatsapp` — WhatsApp integration
- `ai_assistant` — AI Assistant feature
- `online_booking` — Public online booking page
- `inventory` — Inventory management
- `pharmacy` — Pharmacy module
- `laboratory` — Lab requests module
- `radiology` — Radiology module
- `zapier` — Zapier integration
- `api_access` — External API access (experimental)
- `dark_mode` — Dark mode UI (experimental)
- `maintenance_banner` — Maintenance announcement banner

#### `clinic_feature_flags`
Per-clinic feature flag overrides (allows enabling/disabling a feature for specific clinics).

#### `platform_settings`
Key-value store for platform-wide configuration.

| Key | Category | Default |
|-----|----------|---------|
| platform_name | general | Clinic OS |
| support_email | general | support@clinic-os.com |
| support_phone | general | 971568952775 |
| default_trial_days | general | 14 |
| default_currency | general | AED |
| maintenance_mode | maintenance | false |
| maintenance_message | maintenance | نقوم حالياً بتحديث النظام... |
| allow_self_registration | security | true |
| session_timeout_min | security | 60 |
| max_login_attempts | security | 5 |
| smtp_host | email | (empty) |
| smtp_port | email | 587 |
| smtp_from | email | (empty) |

#### `platform_audit_logs`
Immutable audit trail for all privileged actions.

| Column | Type | Description |
|--------|------|-------------|
| id | serial PK | |
| actor_id | integer | Super admin user ID |
| actor_username | text | |
| actor_name | text | |
| action | text | See action types below |
| resource_type | text | clinic \| user \| plan \| feature_flag \| setting |
| resource_id | text | |
| resource_label | text | Human-readable name |
| tenant_id | integer | Clinic ID if applicable |
| tenant_name | text | |
| ip | text | Request IP |
| user_agent | text | |
| previous_value | jsonb | State before change |
| new_value | jsonb | State after change |
| metadata | jsonb | Extra context |
| created_at | timestamptz | |

Logged action types:
- `login` / `logout`
- `clinic.create` / `clinic.update` / `clinic.suspend` / `clinic.delete`
- `plan.change` / `plan.create` / `plan.update` / `plan.delete`
- `impersonate`
- `feature_flag.toggle`
- `settings.update`
- `user.create`

---

## API Structure

All Super Admin APIs are mounted at `/api/superadmin/` in the Express server.

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth` | Login — returns Bearer token |
| DELETE | `/auth` | Logout — invalidates token |

### Stats
| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats` | Platform-wide statistics (real DB data) |

Returns: `{ total, active, trial, suspended, cancelled, mrr, arr, totalPatients, totalDoctors, totalAppointments, planBreakdown }`

### Clinics
| Method | Path | Description |
|--------|------|-------------|
| GET | `/clinics` | List all clinics (supports `?status=`, `?plan=`, `?search=`) |
| GET | `/clinics/:id` | Get single clinic |
| POST | `/clinics` | Create clinic (admin-created) |
| POST | `/clinics/register` | **PUBLIC** — landing page trial form |
| PATCH | `/clinics/:id` | Update clinic (triggers audit log) |
| DELETE | `/clinics/:id` | Soft delete (sets status to cancelled) |
| POST | `/clinics/:id/impersonate` | Generate 1-hour impersonation JWT |

### Plans
| Method | Path | Description |
|--------|------|-------------|
| GET | `/plans` | List all plans |
| POST | `/plans` | Create plan |
| PATCH | `/plans/:id` | Update plan |
| DELETE | `/plans/:id` | Delete plan |

### Audit Logs
| Method | Path | Description |
|--------|------|-------------|
| GET | `/audit-logs` | Paginated audit logs (`?page=`, `?limit=`) |

### Feature Flags
| Method | Path | Description |
|--------|------|-------------|
| GET | `/feature-flags` | List all flags |
| PATCH | `/feature-flags/:id` | Toggle a flag (logged) |

### Platform Settings
| Method | Path | Description |
|--------|------|-------------|
| GET | `/platform-settings` | List all settings |
| PATCH | `/platform-settings` | Bulk update settings (body: `{ settings: { key: value } }`) |

### System Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/system-health` | Real-time health check of all services |

### Developer Info
| Method | Path | Description |
|--------|------|-------------|
| GET | `/developer-info` | Node.js info, DB table row counts, recent audit logs |

### Admin Users
| Method | Path | Description |
|--------|------|-------------|
| GET | `/users` | List Super Admin users |
| POST | `/users` | Create Super Admin user |

---

## Impersonation

Impersonation allows a Super Admin to log into the Clinic OS interface as a clinic administrator — without knowing or exposing their password.

**How it works:**
1. Super Admin calls `POST /api/superadmin/clinics/:id/impersonate`
2. Server generates a short-lived JWT (1 hour) signed with `SESSION_SECRET`
3. JWT payload includes `{ role: "admin", impersonated: true, clinicId, clinicName, by: <superAdminUsername> }`
4. The action is logged to `platform_audit_logs` with action `impersonate`

**Security guarantees:**
- The clinic owner's password is never exposed
- All impersonation is logged with the Super Admin's identity
- The token expires in 1 hour
- The token cannot be used to create or modify Super Admin resources

---

## Tenant Isolation

The current architecture is a **single-tenant system** where all clinic data (patients, doctors, appointments, etc.) shares one database schema. The `registered_clinics` table acts as a CRM/subscription ledger rather than a multi-tenant data partition.

**Existing security measures:**
- All clinic-facing API routes require a valid admin JWT
- The admin JWT is created by the clinic owner's own login (scrypt-hashed password)
- Super Admin JWT and clinic admin JWT are separate tokens with different roles
- Super Admin APIs only accept Super Admin session tokens (different session store)

**For full multi-tenancy** (future): add a `tenant_id` foreign key to all clinic data tables and enforce it in every query.

---

## Security Model

1. **Never trust the frontend** — all authorization is enforced server-side.
2. **Scrypt password hashing** — used for both Super Admin and clinic admin passwords.
3. **Separate session stores** — Super Admin sessions (in-memory Map) are completely separate from clinic admin JWTs (signed JWT).
4. **Soft delete only** — clinics are never permanently deleted by default.
5. **Immutable audit logs** — every privileged action is recorded. Audit logs have no DELETE endpoint.
6. **No credentials in responses** — password hashes are never returned from any API.
7. **Impersonation logging** — every impersonation is permanently logged.

---

## Frontend Pages

| Route | Page | Description |
|-------|------|-------------|
| `/superadmin/login` | Login | Dark-themed login with Arabic RTL |
| `/superadmin/` | Dashboard | Stats cards + charts + recent activity |
| `/superadmin/clinics` | Clinics | Full CRUD table with search, filters, pagination |
| `/superadmin/subscriptions` | Subscriptions | Plan cards with feature management |
| `/superadmin/feature-flags` | Feature Flags | Toggle flags by category |
| `/superadmin/audit-logs` | Audit Logs | Paginated, filterable audit trail |
| `/superadmin/system-health` | System Health | Real-time service status cards |
| `/superadmin/settings` | Platform Settings | Tabbed settings form |
| `/superadmin/developer` | Developer Center | System info, DB tables, API logs |

---

## Deployment Requirements

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `SESSION_SECRET` | ✅ | JWT signing secret — use a strong random value in production |

### Seeded Data

Run once after first deploy:
```bash
# The seed script runs via the post-merge setup
# Or manually:
psql $DATABASE_URL -f scripts/seed-superadmin.sql
```

Initial Super Admin credentials:
- Username: `superadmin`  
- Password: `superadmin123`

**⚠️ Change the password immediately after first login in production.**

---

## Backup Strategy

1. **Database backups:** Use PostgreSQL `pg_dump` scheduled daily via cron.
2. **Point-in-time recovery:** Enable WAL archiving on the production PostgreSQL instance.
3. **Audit logs:** Never delete audit log rows — they serve as the compliance record.

---

## Recovery Strategy

1. Restore from the latest `pg_dump` backup.
2. Re-run `pnpm --filter @workspace/db run push-force` if schema migrations are needed.
3. Re-seed platform data (plans, feature flags, settings) using the psql seed commands in this document.
4. Super Admin passwords can be reset directly via `UPDATE super_admin_users SET password_hash = ... WHERE username = 'superadmin'` using the `hashPassword` utility exported from `superAdmin.ts`.

---

## Developer Notes

- The `superAdmin.ts` route file exports `hashPassword` for use in seed scripts.
- All audit logging is fire-and-forget (errors are swallowed so they never break requests).
- The `logAudit()` helper accepts a partial Express `req` object for flexibility in seed/test contexts.
- Feature flags are currently global only. Per-clinic overrides (`clinic_feature_flags` table) are seeded and ready but the frontend UI for per-clinic overrides is a future enhancement.
