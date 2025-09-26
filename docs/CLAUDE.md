# CLAUDE.md (docs/)

Purpose: Long-form project documentation—architecture notes, development guides, API references, and decision records.

Scope:
- Inherit root instructions; consult subfolder `CLAUDE.md` files if present inside `docs/`.
- Use this folder to expand on topics mentioned briefly in `AGENTS.md` or feature-level guides.

Conventions:
- Keep articles concise and task-focused; link back to source files rather than duplicating code.
- Record architecture changes in `.claude/context/recent-changes.md` and reference them from relevant docs.
- Prefer Markdown with headings, callouts, and diagrams (Mermaid) when needed; store large assets externally.

Key Areas:
- `architecture/`: system diagrams, async pipeline flow, and future plans.
- `development/`: setup, style, and troubleshooting guides.
- `api/`: Convex queries/mutations, worker contracts, response shapes.
- `decision-records/` (if added): ADR-style history for major choices.

Maintenance:
- Update docs whenever behavior or tooling shifts; prune stale sections proactively.
- Note unresolved questions or follow-ups so agents can escalate rather than guess.

Validation:
- Run Markdown linting if configured (`npm run lint` covers `.md` via remark plugins).
- Spot-check cross-links and code samples before merging.
