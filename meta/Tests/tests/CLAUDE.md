# CLAUDE.md (tests/)

Purpose: Central home for automated coverage—Playwright E2E specs, unit suites, fixtures, and future integration tests.

Scope:
- Inherit root and feature-level guidance; create subfolder `CLAUDE.md` files if test suites diverge.
- Applies to assets under `tests/` including fixtures and shared helpers.

Conventions:
- Use descriptive file names (`feature-name.spec.ts`) and organize by suite (`e2e/`, `unit/`, etc.) as directories expand.
- Prefer behavior-focused assertions; rely on `data-testid` attributes rather than brittle selectors.
- Mirror async pipeline stages in tests—assert on status transitions instead of forcing immediate worker output.

Validation:
- `npm run test` or `npm run test:e2e` for Playwright coverage (spins up `npm run dev` automatically).
- Add targeted unit suites once Jest/RT testing is re-enabled; place shared fixtures in `tests/fixtures/`.
- Record new workflows with Playwright traces when debugging failures (`playwright-report/`).

Pitfalls:
- Leaving tests coupled to implementation details (internal hooks, private data shapes).
- Skipping error-state coverage—include negative paths for uploads, auth, and background jobs.
- Forgetting to document new fixtures or helpers; note them here or alongside the suite.

References:
- `scripts/CLAUDE.md` for validation scripts that complement automated tests.
- `playwright.config.ts` for runner settings (ports, retries, reporters).
