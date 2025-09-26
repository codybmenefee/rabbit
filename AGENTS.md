# Repository Guidelines

## Project Structure & Module Organization
- Next.js 15 App Router lives in `app/`; route groups (`app/analytics`, `app/history`) own feature pages.
- Shared building blocks: `components/`, `hooks/`, `lib/` (analytics helpers, UI glue).
- Async + backend: `convex/` schema/mutations, `apps/worker/src/` jobs, `scripts/` tooling.
- Assets/tests: `public/` for static files, `tests/` for Playwright suites and fixtures.
- Read the nearest `CLAUDE.md` before editing a folder; update it when structure or behavior shifts.

## Build, Test, and Development Commands
- `npm install` (root) bootstraps workspaces.
- `npm run dev` starts the app; `npm run worker:dev` runs the background worker.
- Ship pipeline: `npm run build` → `npm start`.
- Quality gates: `npm run lint`, `npm run type-check`, `npm run quality` (lint + types + tests).
- Analytics validation: `npm run validate:analytics`, `npm run validate:timestamps`, `npm run validate:stats`.

## Coding Style & Naming Conventions
- Strict TypeScript; justify any `any` usage inline.
- Prettier defaults (2-space, single quotes) via `npm run format`.
- Components/hooks use `PascalCase`/`camelCase`; files prefer `kebab-case` (`components/dashboard/metrics-card.tsx`).
- Favor providers/hooks over deeply threaded props.

## Testing Guidelines
- Playwright specs in `tests/` named `feature-name.spec.ts`; run via `npm run test` or `npm run test:e2e` (spawns dev server).
- Pair analytics changes with validation scripts/fixtures so `npm run validate:all` stays green.
- Document new fixtures or mocks alongside the suites that rely on them.

## Commit & Pull Request Guidelines
- Commit subjects: short, imperative intent (`feat: add session trend banner`).
- Separate refactors from behavioral changes.
- PRs link issues, summarize user impact, list validation commands, and show UI updates when visuals change.
- Note follow-up work or trade-offs explicitly for reviewers.

## Security & Configuration Tips
- Secrets stay in `.env.local`; never commit runtime credentials.
- Use non-production Clerk/Convex keys while testing.
- Verify user scoping any time you touch request handlers or Convex functions.

## Agent Documentation Standards
- `AGENTS.md` is the root contract; folder `CLAUDE.md` files refine instructions while inheriting parent rules.
- Add `CLAUDE.md` only when extra context is needed; subfolders inherit the nearest ancestor file.
- Keep entries concise (<400 words) with actionable bullets: commands, conventions, key files, hazards.
- Link to deeper docs instead of duplicating detail; highlight what differs from parent guidance.
- Treat these files like code—version, review, and prune outdated notes promptly.
- Agents must read relevant `CLAUDE.md` files, follow the hierarchy, and escalate missing/conflicting guidance instead of guessing.
