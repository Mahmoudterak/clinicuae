---
name: Developer Center 500 bug
description: Root cause and fix for the Developer Center page causing logout, then returning 500
---

## Root cause (logout bug — FIXED)
`GET /api/superadmin/developer-info` did not exist. The request fell through to a middleware that returned 401. `api-client.ts` removes `sa-auth` and calls `window.location.reload()` on any 401, causing a full logout.

**Fix:** Added the `/developer-info` endpoint to `superAdmin.ts`.

## Root cause (500 bug — FIXED)
The initial endpoint implementation referenced `platformAuditLogsTable.ipAddress` (does not exist) and joined with `superAdminUsersTable` unnecessarily. The correct field is `platformAuditLogsTable.ip`; `actorUsername` is a direct column on `platformAuditLogsTable`, no join needed.

**How to apply:** Any future queries on `platformAuditLogsTable` — use `.ip`, `.actorUsername`, `.actorName` directly (no join to `superAdminUsersTable` required for display).
