# CLAUDE.md (app/)

Purpose: Next.js App Router routes, layouts, and providers.

Conventions:

- Prefer Server Components; use `"use client"` only for interactive UI.
- Keep route handlers lightweight; push data logic into `lib/` or Convex.
- Co-locate segment-specific components under the route segment.
- Maintain consistent metadata and loading states.

Run checks:

- `npm run dev` to validate routes
- `npx playwright test` for end-to-end flows
