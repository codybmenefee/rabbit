# CLAUDE.md (.playwright-mcp)

Purpose: Stores Playwright MCP traces and screenshots used for debugging tests. Treat as artifacts.

- Do not read from or write code that depends on these artifacts.
- You may attach images in issues/PRs for debugging; do not ship them in builds.
- Clean up large/old files if disk usage grows; never delete `traces/` during active investigations.

