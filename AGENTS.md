# Rabbit Agent Guidelines

## Dev environment tips
- Next.js 15 App Router lives in `app/`; route groups like `app/analytics` and `app/history` own their feature pages.
- Shared building blocks sit in `components/`, `hooks/`, and `lib/`; async logic stays in `convex/`, `apps/worker/src/`, and `scripts/`.
- Run `npm install` at the root to bootstrap the workspace, then `npm run dev` (app) or `npm run worker:dev` (worker) as needed.
- Use `npm run build` followed by `npm start` to simulate the production pipeline locally before shipping.
- Keep secrets in `.env.local`, use non-production Clerk/Convex keys, and read the nearest `CLAUDE.md` before editing a folder.
- Prefer MCP servers over manual scripts: `convex` for deployment metadata and data snapshots, `playwright` for finance dashboards and UI checks, `context7` for live library documentation.

## Testing instructions
- Run `npm run test` or `npm run test:e2e` (launches the dev server) to execute the Playwright suites in `tests/`.
- Add or update tests for every behavioral change; Playwright specs follow the `feature-name.spec.ts` pattern.
- For analytics work, run `npm run validate:analytics`, `npm run validate:timestamps`, and `npm run validate:stats` (or `npm run validate:all`).
- After refactors or import moves, confirm `npm run lint`, `npm run type-check`, and `npm run quality` still pass.
- Document new fixtures or mocks alongside the suites that rely on them so future runs stay deterministic.

## PR instructions
- Format commit subjects as imperative statements, for example `feat: add session trend banner`.
- Before opening a PR, run `npm run lint` and `npm run test`; include any additional validation commands you executed in the PR description.
- Summarize user-facing impact, link related issues, and attach screenshots or clips for visual changes.
- Call out follow-up work, trade-offs, or risks explicitly so reviewers can plan next steps.
- Keep refactors separate from behavioral changes to make review and rollback safer.
