# Agent Working Agreements

This file defines how AI coding agents (Claude, Cursor, Codex) and humans collaborate in this repository. Its scope applies to the entire repo.

## Source Of Truth

- Prefer folder-local `CLAUDE.md` and `agent.md` for context and guardrails.
- When missing, inherit from the nearest parent folder. Root `CLAUDE.md` and this `AGENTS.md` are global fallbacks.

## Safety & Guardrails

- Keep changes scoped to the folder you are working in; do not restructure directories without explicit instruction.
- Do not modify generated or build artifacts (e.g., `.next/`, `node_modules/`, `playwright-report/`, `test-results/`, `convex/_generated/`).
- Never commit secrets. Use `.env.local` (ignored) and sample values in `.env.example`.
- Maintain TypeScript strictness and avoid `any` unless justified locally with comments.
- Prefer small, incremental changes with clear commit messages and runnable steps.

## Validation

- The Next.js app lives in `apps/web/`. Validate changes with:
  - `npm install` at repo root (workspaces) or inside `apps/web/`
  - `npm run lint`, `npm run dev` (from root or `apps/web/`)
  - `npx playwright test` (inside `apps/web/`) for E2E checks
- For analytics code in `apps/web/lib/`, prefer pure functions with unit coverage; validate via scripts in `apps/web/scripts/`.

## Auth & Backend

- Authentication: Clerk (`apps/web/middleware.ts`, `.clerk/`).
- Data store: Convex (no separate SQL database). Keep queries/mutations under `apps/web/convex/` and schemas in `apps/web/convex/schema.ts`.
- Do not reintroduce `db/` folders or SQL migrations unless the team explicitly decides to add a second datastore.

## Folder Conventions

- Each significant folder should contain a single `CLAUDE.md` with local guidance (purpose, conventions, quick commands, pitfalls).
- Avoid duplicating root content; include only what’s different for that folder and link back to root docs when needed.
- Root uses this `AGENTS.md` for cross-agent/global rules; subfolders standardize on `CLAUDE.md` for specifics.

## Decision Logs

- Record notable architecture or behavior changes in `.claude/context/recent-changes.md` and keep `.claude/context/current-state.md` accurate.

## Contact Points

- Humans own direction and acceptance. Agents should propose, not assume, broad refactors.

## Change Management

- Treat edits to `AGENTS.md`/`CLAUDE.md` as code changes; keep reviews and history clear.
