---
name: SuperAdmin Routing — requireClinic intercept bug
description: Why superadmin routes returned 401 Unauthorized and how the fix works.
---

## The rule
`router.use("/superadmin", superAdminRouter)` MUST be the **first** mount in `routes/index.ts`, before `selectiveAdminAuth` and before all clinic routers.

**Why:** Many clinic routers (`auth.ts`, `settings.ts`, `adminUsers.ts`, `appointments.ts`, etc.) apply `router.use(requireClinic)` as a **global** middleware at the top of their Express Router. Since these routers are mounted **without a path prefix** (`router28.use(settings_default)`), Express sends EVERY incoming request through them, including `/superadmin/*` paths. The `requireClinic` middleware sees no Bearer token and immediately returns `401 {"error":"Unauthorized"}` — the request never reaches `superAdminRouter`.

**How to apply:** When adding new clinic-scoped routers that use `router.use(requireClinic)` at the top, mount superadmin first (already done in `routes/index.ts` line 37). The `/superadmin` mount before `selectiveAdminAuth` is intentional and correct.

**How it was fixed:** Moved `router.use("/superadmin", superAdminRouter)` to line 37 of `routes/index.ts` — before `selectiveAdminAuth` and before all other router mounts. The old mount at the bottom of the file was removed.

## Default superadmin credentials
- username: `superadmin`
- password: `Clinic@OS2024` (reset in DB via scrypt hash on 2026-08-11)
- The login page (`artifacts/superadmin/src/pages/login.tsx`) shows these credentials with a copy button and auto-fill.
