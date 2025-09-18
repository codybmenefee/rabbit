# CLAUDE.md (types/)

Purpose: Shared TypeScript types and Zod schemas.

Conventions:

- Keep types stable and named clearly; prefer exact shapes.
- Provide Zod validators in `validation.ts` where runtime validation is needed.
- Avoid circular imports; keep modules small.
