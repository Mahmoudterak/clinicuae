---
name: Orval zod v4 import fix
description: Why codegen rewrites the generated zod import to zod/v4
---

Orval v8 emits zod v4 syntax (e.g. `zod.int()`) but generates `import * as zod from 'zod'`, and the installed zod 3.25.x top-level entry is v3 — so `typecheck:libs` fails after codegen.

**Why:** version mismatch between Orval's emitted API and the zod package entry point.

**How to apply:** the `codegen` script in `lib/api-spec/package.json` includes a `sed` step rewriting the import to `zod/v4`. Keep that step when modifying the codegen script. Also: generated response schemas expect `createdAt` as string; server routes serialize Dates via `artifacts/api-server/src/lib/serialize.ts`.
