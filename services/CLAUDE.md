# Services Directory

## Purpose
Shared service layer for backend-leaning functionality such as pre-computation, caching, storage adapters, and schedulers. Code here should stay framework-agnostic and rely on dependency injection for external resources.

## Conventions
- Keep modules focused on orchestration logic (no React code).
- Export strongly typed classes or factory functions with clear interfaces.
- Avoid side effects on import. Provide explicit `start`/`initialize` methods when needed.
- Use lightweight utilities only (`Map`, `Set`, `Date`); defer heavy integrations to adapters passed in via constructor options.
- Provide JSDoc for complex public APIs so hooks/components understand expected behavior.

## Testing
- Prefer unit tests close to business logic (to be added under `tests/unit/services/`).
- Mock external dependencies through the provided interfaces.
- Ensure deterministic behavior by injecting clock utilities when dealing with time.

## Pitfalls
1. Do not directly access Convex or Redis clients; wrap them behind interfaces.
2. Do not mutate input filter objects; clone before modification.
3. Do not use `any`. Define shared types in `services/types.ts`.
4. Keep synchronous operations non-blocking; use async methods for IO boundaries.
5. Document default configuration for each service class.
