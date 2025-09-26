# CLAUDE.md (convex/)

Purpose: Convex schema, queries, mutations, and job orchestration that back the app and worker.

Scope:
- Inherit root guidance plus worker expectations; check sibling files (`jobs.ts`, `pipeline.ts`) before editing.
- Applies to `schema.ts`, data access layers, and job management helpers.

Conventions:
- Keep `schema.ts` authoritative—update generated types and client usage when fields change.
- Separate reads and writes: queries stay pure; mutations validate, persist, and enqueue follow-up work via `jobs` helpers.
- Model long-running workflows with explicit status/timestamp fields and deterministic `dedupeKey` values.
- Never call external APIs from Convex; delegate to the worker through queued jobs.

Validation:
- `npm run quality` after schema or mutation changes (lint, types, Playwright smoke).
- `npx convex dev` when iterating locally to verify new tables or indexes.
- Add regression coverage in `scripts/validation/` if analytics-facing documents change shape.

Pitfalls:
- Skipping Clerk auth checks before accessing user data.
- Writing large payloads directly to Convex documents—store references instead.
- Forgetting to complete/fail jobs, leaving leases stuck.

References:
- `apps/worker/CLAUDE.md` for how jobs are consumed.
- `lib/CLAUDE.md` for shared data transformation helpers.
