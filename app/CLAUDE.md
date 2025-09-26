# CLAUDE.md (app/)

Purpose: Define expectations for Next.js App Router routes, layouts, and providers.

Scope:
- Inherit root `AGENTS.md` plus parent `CLAUDE.md`; review segment-level docs before editing nested folders.
- Applies to files under `app/` including route groups and shared layouts.

Conventions:
- Prefer Server Components; add `"use client"` only for interactive UI or hook requirements.
- Keep route handlers thin—delegate data access to `lib/` functions or Convex queries/mutations.
- Co-locate segment-specific UI, loading, and error states within the route folder.
- Surface background-job progress via Convex status reads; never block requests on long-running work.

Validation:
- `npm run dev` to verify routes render.
- `npm run test:e2e` (Playwright) for navigation and upload flows touching new segments.
- When introducing data dependencies, run `npm run quality` to cover lint, types, and tests together.

Pitfalls:
- Mixing client and server APIs in one file—split components as needed.
- Forgetting metadata defaults or viewport settings when creating new routes.
- Assuming Convex data is instantly consistent; handle "loading" and "empty" states explicitly.

References:
- `components/CLAUDE.md` for shared UI patterns.
- `convex/CLAUDE.md` for data access expectations.
