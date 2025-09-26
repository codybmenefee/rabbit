# CLAUDE.md (public/)

Purpose: Static assets served directly by Next.js (favicons, images, manifest files).

Scope:
- Inherit root guidance; add deeper docs if you introduce nested asset folders.
- Applies to any publicly accessible file placed under `public/`.

Conventions:
- Use optimized assets and cache-friendly filenames; update component references when renaming.
- Never store secrets or user-specific data—everything here ships to the client unmodified.
- Prefer SVG or modern formats (`.webp`) when available; document fallback needs.

Maintenance:
- Keep file sizes reasonable (<1 MB when possible) to avoid bloating builds.
- Remove unused assets as features retire; note changes in related docs or PR descriptions.
