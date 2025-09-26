# CLAUDE.md (.playwright-mcp/)

Purpose: Stores Playwright MCP artifacts (traces, screenshots, videos) generated during test debugging.

Scope:
- Inherit root testing guidance; this folder keeps transient assets outside git history by default.
- Applies to output captured by Playwright tooling—no source code lives here.

Conventions:
- Treat artifacts as disposable debugging aids; do not build runtime features that depend on them.
- When sharing failures, attach relevant files in PRs or issues instead of committing here.
- Clean up large archives when storage grows, but preserve traces until investigations conclude.

Maintenance:
- Verify `.gitignore` continues to exclude these files from commits.
- Update this note if Playwright storage paths change.
