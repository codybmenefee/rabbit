# CLAUDE.md (components/)

Purpose: Shared React UI building blocks and feature views used across the dashboard.

Scope:
- Inherits root and `app/` guidance; read nested `CLAUDE.md` files (e.g. `components/dashboard/`) before editing specialized areas.
- Covers colocated component code, styles, and helper utilities under this directory.

Conventions:
- Export `PascalCase` components and co-locate lightweight helpers; keep files focused on presentation and state orchestration.
- Accept data via props/context—never fetch Convex data directly inside components.
- Use Tailwind classes and shared tokens (`bg-card`, gradients) instead of inline styles or hardcoded colors.
- Memoize expensive renders (`React.memo`, `useMemo`) when components are fed large datasets.

Key Files:
- `ui/`: low-level primitives (buttons, inputs) reused everywhere.
- `dashboard/`: metric cards, charts, and layout shells for analytics pages.
- `import/`: upload workflows and progress visuals.

Validation:
- `npm run lint` for JSX and Tailwind rules.
- `npm run test:e2e` to exercise interactive flows.
- Add or update component-focused tests/fixtures in `tests` when introducing new behavior.

Pitfalls:
- Forgetting loading/empty/error states for long-running Convex jobs.
- Recomputing aggregations inside render—delegate to `lib/` functions upfront.
- Diverging from established spacing/typography scales; reuse existing utility classes.

References:
- `lib/CLAUDE.md` for analytics helpers and data transformation rules.
- `hooks/CLAUDE.md` when components rely on shared React hooks.
