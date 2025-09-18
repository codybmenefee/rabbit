# CLAUDE.md (youtube-analytics)

Purpose: Main Next.js app implementing the YouTube analytics dashboard with Clerk auth and Convex backend.

Quick commands:

- `npm install`
- `npm run dev` (<http://localhost:3000>)
- `npm run lint`
- `npx playwright test`

Conventions:

- App Router in `app/` (prefer Server Components; use Client only when needed).
- Keep analytics logic pure in `lib/` with unit coverage via `scripts/`.
- Auth via Clerk (`middleware.ts`, `.clerk/`); backend via Convex (`convex/`).
- Do not modify `.next/`, `node_modules/`, `playwright-report/`, or `test-results/`.
- Data store: Convex only (no separate SQL database). Configure environment via `.env.local` (untracked) using `.env.example` as reference. Deploy on Vercel.
