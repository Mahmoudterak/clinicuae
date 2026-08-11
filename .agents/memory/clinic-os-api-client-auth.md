---
name: Clinic OS API client auth wiring
description: How the generated api-client-react gets its auth token in the Clinic OS web app
---

## Setup
`setAuthTokenGetter` from `@workspace/api-client-react` is called inside `AuthProvider` (auth-context.tsx) via a `useEffect` that watches `authData.token`. When the user logs in or the session is restored from localStorage, the effect fires and wires the JWT into every `customFetch` call made by the generated hooks (useListDoctors, useListPatients, etc.).

**Why:** `customFetch` is documented as cookie-free. For web apps using localStorage JWTs, `setAuthTokenGetter` must be the bridge — do not add manual `Authorization` headers to individual hooks.

**How to apply:** If a new generated hook appears to send unauthenticated requests (403/401), first verify `setAuthTokenGetter` is still wired in auth-context.tsx before assuming any other cause.

## Invoice dueDate
`dueDate` is required by the backend (`CreateInvoiceBody` Zod schema). The frontend schema must use `.min(1, ...)` not `.optional()`, otherwise the form submits an empty string and the backend rejects it with 400.
