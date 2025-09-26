# CLAUDE.md (.claude/)

Purpose: Central knowledge base for agent context—recent changes, task history, and specialized agent roles.

Scope:
- Inherit root rules; this folder augments them with operational notes for AI collaborators.
- Applies to `context/`, `agents/`, and supporting docs stored here.

Conventions:
- Update `context/current-state.md` and `context/recent-changes.md` whenever architecture or behavior shifts.
- Keep role docs concise and task-focused; link out to broader documentation rather than duplicating details.
- Treat this directory as documentation only—no application code or secrets belong here.

Maintenance:
- Sync decision logs with `.claude/context/recent-changes.md` before wrapping major tasks.
- Review for stale guidance regularly; prune superseded roles or instructions.

References:
- `AGENTS.md` for global expectations.
- Subdirectory README/`CLAUDE.md` files for role-specific details.
