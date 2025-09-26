# CLAUDE.md (apps/worker/)

Purpose: Long-running worker that leases Convex jobs, talks to external providers, and writes results back through mutations.

Scope:
- Inherit root and `convex/` rules; coordinate with `lib/` when changing job payloads or result shapes.
- Applies to source under `apps/worker/src/` and related configuration.

Conventions:
- Implement handlers as idempotent async functions; Convex may retry jobs.
- Interact with external APIs using credentials from environment variables—guard for missing config and mark jobs as skipped when required inputs are absent.
- Keep imports lightweight; share heavy logic via `lib/` modules instead of duplicating code here.
- Log actionable context (job id, entity id) but never secrets or large payloads.

Validation:
- `npm run worker:dev` for the development loop (requires `CONVEX_URL` and `CONVEX_SERVICE_TOKEN`).
- Add smoke coverage by enqueueing sample jobs locally and confirming state transitions in Convex.
- Run `npm run quality` after changing job shapes to ensure frontend/tests remain in sync.

Environment:
- Keys defined in `.env.example` (Convex service token, YouTube/LLM providers, storage credentials) must be set locally before running the worker.

Pitfalls:
- Leaving leases unresolved—always call `jobs.complete` or `jobs.fail` on every path.
- Storing large artifacts in Convex documents instead of object storage.
- Forgetting to update this file when introducing new job types or providers.

References:
- `convex/CLAUDE.md` for schema and job helper expectations.
- `lib/CLAUDE.md` for shared analytics helpers.
