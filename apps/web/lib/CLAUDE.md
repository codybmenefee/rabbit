# CLAUDE.md (lib/)

Purpose: Pure data parsing, normalization, and analytics utilities.

Conventions:

- Write deterministic, side-effect-free functions with strong types.
- Keep parsing resilient to Google Takeout format variants.
- Centralize aggregations; prefer adding new functions over overloading.
- Cover with scripts in `scripts/` and unit tests where appropriate.
