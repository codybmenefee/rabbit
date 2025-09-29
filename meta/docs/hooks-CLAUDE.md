# CLAUDE.md (hooks/)

Purpose: Placeholder for shared React hooks that wrap Convex data access or shared browser logic.

Scope:
- Inherit root rules and consult related guidance in `lib/` and feature folders before adding new hooks.
- Applies to hook utilities you introduce under this directory (currently empty).

Conventions:
- Keep hooks side-effect free outside React lifecycles; guard SSR access to `window` or browser APIs.
- Accept explicit inputs (filters, ids, configuration) and return typed objects with `data`, `status`, and `error` states.
- Model eventual consistency—subscribe to Convex queries and surface background job progress instead of polling imperatively.
- Extract long utilities into adjacent modules when a hook grows beyond ~150 lines.

Validation:
- Add coverage in `tests` (React Testing Library hooks utilities) when behavior changes.
- `npm run lint` to enforce exhaustive deps and React rules of hooks.
- Exercise flows end-to-end with `npm run test:e2e` after modifying data loading semantics.

Pitfalls:
- Forgetting cleanup for subscriptions or timers, causing memory leaks.
- Returning raw Convex documents without shaping for component consumers.
- Swallowing errors—always expose actionable failure states so UI can respond.

References:
- `lib/CLAUDE.md` for data transformation expectations.
- `components/CLAUDE.md` to ensure hook outputs match UI expectations.
