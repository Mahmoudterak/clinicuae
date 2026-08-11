---
name: Auth Router Ordering
description: doctorAuthRouter and patientAuthRouter must be mounted before clinic data routers to avoid requireClinic intercepting public auth endpoints.
---

# Auth Router Ordering Bug

Clinic data routers (`patientsRouter`, `doctorsRouter`, `appointmentsRouter`, etc.) apply `requireClinic` globally via `router.use(requireClinic)` at the TOP of each router file. This means they intercept **all** request paths, including public auth endpoints.

**The bug:** When `/doctor-auth/login` or `/patient-auth/login` are processed by Express, they reach `patientsRouter` (or similar) before `doctorAuthRouter`, because clinic data routers were mounted first in `routes/index.ts`. The `requireClinic` middleware runs, finds no Bearer header, and returns 401 immediately.

**The fix:** In `routes/index.ts`, mount `patientAuthRouter` and `doctorAuthRouter` **before** any clinic data router. The correct order is:

```
router.use(selectiveAdminAuth);  // general auth gate
router.use(authRouter);          // admin auth
router.use(healthRouter);        // healthz (already public)
router.use(patientAuthRouter);   // public patient login — BEFORE clinic data routers
router.use(doctorAuthRouter);    // public doctor login — BEFORE clinic data routers
router.use(patientsRouter);      // clinic data (has requireClinic globally)
router.use(doctorsRouter);       // clinic data (has requireClinic globally)
// ... rest of clinic data routers
```

**Why:** Express processes `router.use(someRouter)` calls in registration order. Without a path prefix, each router is tried for every request. If a router's global middleware (like `requireClinic`) sends a response, subsequent routers never see the request.

**How to apply:** Whenever adding a new auth endpoint that is public (no Bearer token required), mount its router in `routes/index.ts` BEFORE any clinic data router. Also add the path to `PUBLIC_EXACT` in `selectiveAdminAuth` as a belt-and-suspenders measure.
