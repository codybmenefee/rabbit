# CLAUDE.md (scripts/)

Purpose: Validation and developer scripts (TS/JS) for analytics and performance.

Conventions:

- Use `tsx` to run TS scripts locally.
- Keep scripts idempotent and safe for local use.
- Prefer reading from fixtures rather than production data.
- Debugging utilities live in `scripts/dev-tools/` (use `node` to run).

Run examples:

- `npx tsx scripts/validate-analytics.ts`
- `npx tsx scripts/validate-statistical-functions.ts`
- `node scripts/dev-tools/test-parsing.js`
- `node scripts/test-worker-performance.js`
