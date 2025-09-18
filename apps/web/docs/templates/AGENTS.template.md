# AGENTS.md (Root/Package Template)

Scope: Global rules for agents (Claude, Copilot, Cursor) working in this package.

Source of Truth

- Prefer local `CLAUDE.md` for folder specifics; use this file for cross-cutting rules.

Safety

- Keep changes scoped; avoid broad refactors without approval.
- Don’t edit generated/build artifacts.
- No secrets in code. Use `.env.local` and document in `.env.example`.

Validation

- `<install/build/test commands>`
- `<how to run e2e/unit checks>`

Style/Conventions

- `<language/tooling/linting rules>`

Change Management

- Treat edits to this file as code; keep PRs small and reviewable.
