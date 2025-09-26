# CLAUDE.md (.opencode/)

Purpose: Metadata and configuration consumed by local OpenCode tooling; not part of runtime logic.

Scope:
- Inherit root guidelines; this folder rarely needs additional sub-docs.
- Applies only to files supporting automation or editor integrations.

Conventions:
- Keep entries minimal, human-readable, and safe to ignore during builds/tests.
- Avoid adding runtime dependencies or secrets—store only configuration necessary for tooling.
- Document any non-obvious fields inline so other agents understand their effect.

Maintenance:
- Update when tooling expectations change; remove obsolete files to prevent drift.
