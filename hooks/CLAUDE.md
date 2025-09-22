# Hooks Directory

## Purpose
React hooks that expose service-layer capabilities to components while maintaining consistent loading, error, and caching semantics.

## Conventions
- Hooks must be tree-shakeable and free of side effects outside React lifecycles.
- Accept explicit dependency inputs (service instances, configuration) rather than importing singletons when possible.
- Return typed result objects with `data`, `loading`, and `error` fields.
- Use `useMemo` for derived values and `useEffect` for asynchronous fetching.
- Keep hooks under 150 lines; extract helpers into adjacent files when necessary.

## Testing
- Add React Testing Library hooks tests under `tests/unit/hooks/`.
- Mock service dependencies with lightweight fakes.
- Cover loading, success, error, and revalidation paths.

## Pitfalls
1. Do not read from global state modules directly; rely on props/context.
2. Do not swallow errors—surface them through the returned `error` state.
3. Do not assume browser environment; guard against `window` usage for SSR.
4. Avoid stale closures by listing all dependencies in effect hooks.
5. Provide cleanup for subscriptions or polling timers.
