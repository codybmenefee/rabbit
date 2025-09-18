# CLAUDE.md (convex/)

Purpose: Convex schema, queries, and mutations for server-side data.

Conventions:

- Keep schema in `schema.ts` authoritative; update types and clients accordingly.
- Separate read (queries) from write (mutations); keep functions small and typed.
- Enforce auth via Clerk where appropriate; validate inputs server-side.
- Never import from client-only code.

Run checks:

- `npm run dev` and exercise routes that call Convex
- Ensure `convex.json` is valid and functions compile
