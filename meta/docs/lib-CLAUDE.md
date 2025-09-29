# CLAUDE.md (lib/)

Purpose: Pure TypeScript utilities for parsing, normalization, analytics, and other business logic shared by frontend, Convex, and the worker.

Scope:
- Inherit root and adjacent folder guidance; coordinate with `convex/` and the worker docs before changing shared types.
- Applies to modules under `lib/` including `aggregations`, `parsers`, and supporting helpers.

Conventions:
- Keep functions deterministic and side-effect free; avoid browser or Node globals that break cross-runtime reuse.
- Export explicit types from `lib/types.ts`; do not introduce `any` without an inline justification.
- Structure modules by domain (`aggregations`, `advanced-analytics`, `channel-aggregations`, etc.) and keep functions focused.
- Document tricky algorithms with concise comments or JSDoc so agents understand intent.

Validation:
- `npm run validate:analytics`, `npm run validate:timestamps`, `npm run validate:stats` to cover key pipelines.
- `npm run quality` before merging large logic changes (lint, types, Playwright smoke).
- Add scenario-based fixtures in `scripts/validation/` when introducing new calculations.

Pitfalls:
- Mutating arguments or shared state—always clone structures before modification.
- Recomputing expensive aggregates in UI/worker code; centralize logic here and reuse.
- Losing timezone fidelity when parsing timestamps; use `parseWatchTimestamp` which handles common timezone abbreviations (CDT, PST, etc.) and converts to UTC ISO strings while preserving original strings in `raw`.

References:
- `scripts/CLAUDE.md` for validation tooling.
- `convex/CLAUDE.md` and `apps/worker/CLAUDE.md` for how this logic feeds async jobs.
