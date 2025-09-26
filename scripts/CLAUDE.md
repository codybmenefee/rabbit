# CLAUDE.md (scripts/)

Purpose: Developer utilities, validation checks, and diagnostics used to test parsing, analytics, and worker performance.

Scope:
- Inherit root guidance; review nested docs inside `scripts/` before editing specific toolchains.
- Covers TypeScript (`tsx`) and Node scripts under `validation/`, `dev-tools/`, and root-level helpers.

Conventions:
- Keep scripts idempotent and safe for local runs and CI—no direct writes to production data.
- Organize by intent: `validation/` for regressions, `dev-tools/` for exploratory debugging.
- Accept file paths or config via CLI args/env vars rather than hardcoding values.
- Delegate heavy business logic to `lib/` modules; scripts should orchestrate, not duplicate algorithms.

Validation:
- `npm run validate:all` to execute the full suite.
- Run targeted commands (`npm run validate:analytics`, `npm run validate:timestamps`, `npm run dev:parse`, `npm run dev:perf:worker`) when iterating on specific areas.
- Ensure new scripts include usage notes in their header comments or related docs.

Pitfalls:
- Swallowing errors—exit with non-zero status and log actionable messages.
- Leaving large artifact dumps checked in; write to `/tmp` or dedicated ignore paths.
- Bypassing Convex workflows when backfilling data; enqueue jobs instead.

References:
- `lib/CLAUDE.md` for the functions scripts exercise.
- `tests/CLAUDE.md` for how validation complements automated coverage.
