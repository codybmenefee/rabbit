# CLAUDE.md (tests/)

Purpose: Playwright E2E tests and unit tests.

Conventions:

- Keep fixtures small and focused; large files live under `fixtures/` with README.
- Name tests by behavior, not implementation.
- Avoid flakiness: explicit waits and robust selectors.

Run:

- `npx playwright test`
- `npx playwright test tests/simple-upload.spec.ts`
