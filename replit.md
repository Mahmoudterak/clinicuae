# Clinic OS

A cloud-based medical center management system for clinic staff: dashboard, patients, doctors, appointments, medical records, prescriptions, and invoicing.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (`artifacts/clinic-os`, served at `/`), wouter, TanStack Query, Recharts, shadcn/ui
- API: Express 5 (`artifacts/api-server`, served at `/api`)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec at `lib/api-spec/openapi.yaml`)

## Where things live

- OpenAPI contract: `lib/api-spec/openapi.yaml` (source of truth for all API shapes)
- DB schema: `lib/db/src/schema/*.ts` (patients, doctors, appointments, medicalRecords, prescriptions, invoices)
- API routes: `artifacts/api-server/src/routes/*.ts` (one file per domain)
- Frontend pages: `artifacts/clinic-os/src/pages/`
- Brand logo: `artifacts/clinic-os/src/assets/clinic-os-logo.png`

## Architecture decisions

- Contract-first: change `openapi.yaml`, run codegen, then update server routes and frontend.
- `createdAt` timestamps are serialized to ISO strings in routes via `artifacts/api-server/src/lib/serialize.ts` (generated Zod schemas expect strings, Drizzle returns Date).
- The codegen script rewrites the generated zod import to `zod/v4` (Orval emits v4 syntax; top-level `zod` entry is v3).
- List endpoints denormalize `patientName` / `doctorName` for display convenience.

## Product

Core clinic management MVP: dashboard KPIs + charts + activity feed, patient registry with profiles, doctor directory, appointment scheduling with filters, medical records, prescriptions, and invoicing with mark-as-paid. Planned next: RBAC auth, AI assistant features, lab/radiology/pharmacy/inventory modules.

## User preferences

- Brand: "Clinic OS" (cyan/blue medical identity, provided logo). Wants a full multi-tenant medical SaaS eventually (see attached_assets brief). Arabic RTL + English support is a stated goal for later.

## Gotchas

- After changing `lib/api-spec/openapi.yaml`, always run codegen before touching server or frontend code.
- Entity responses must pass through `iso()` before Zod `.parse()` if they include `createdAt`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
