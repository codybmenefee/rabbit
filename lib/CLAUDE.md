# Business Logic Directory

## Purpose
Pure functions for data processing, analytics calculations, and business logic. All functions are deterministic, side-effect-free, and strongly typed.

## Quick Commands
- `npm run validate:analytics` - Test analytics functions
- `npm run validate:parsers` - Test data parsers
- `npm run validate:all` - Run all validation scripts
- `npm run dev:parse` - Debug parsing with sample data

## Conventions

### Function Design
- Write pure, side-effect-free functions
- Use strong TypeScript typing (avoid `any`)
- Keep functions under 50 lines
- Single responsibility per function
- Document complex algorithms with JSDoc

### File Organization
- `types.ts` - All type definitions
- `utils.ts` - Common utilities
- `analytics/` - Analytics calculations and insights
- `parsers/` - Data parsing utilities
- `storage/` - Storage abstractions

### Error Handling
```typescript
// Use Result pattern for operations that can fail
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E }

// Example usage
function parseData(input: string): Result<WatchRecord[]> {
  try {
    const records = parseYouTubeHistory(input)
    return { success: true, data: records }
  } catch (error) {
    return { success: false, error: error as Error }
  }
}
```

## Dependencies
- No external dependencies in core functions
- Use types from `./types.ts`
- Date manipulation with `date-fns`
- Validation with `zod`

## Testing
- Unit tests for all functions in `tests/unit/lib/`
- Validation scripts in `scripts/validation/`
- Test with real data fixtures
- Aim for 100% function coverage

## Data Flow
1. **Parsing**: Raw HTML → `WatchRecord[]`
2. **Normalization**: Add computed fields (year, month, etc.)
3. **Aggregation**: Group and calculate metrics
4. **Analysis**: Generate insights and trends

## Performance Guidelines
- Use efficient data structures
- Avoid unnecessary iterations
- Cache expensive calculations
- Use Web Workers for heavy parsing

## Common Patterns

### Aggregation Functions
```typescript
export function computeKPIs(records: WatchRecord[]): KPIMetrics {
  return {
    totalVideos: records.length,
    totalChannels: new Set(records.map(r => r.channelTitle)).size,
    // ... other metrics
  }
}
```

### Parser Functions
```typescript
export function parseYouTubeHistory(html: string): WatchRecord[] {
  // Parse HTML and extract records
  // Handle multiple formats
  // Validate and normalize data
}
```

## Pitfalls
1. **Don't mutate input data** - Always return new objects
2. **Don't use external APIs** - Keep functions pure
3. **Don't ignore edge cases** - Handle all input variations
4. **Don't skip validation** - Validate all inputs
5. **Don't forget timezone handling** - Be explicit about dates

## Links
- [Analytics Functions](./analytics/)
- [Parser Implementation](./parsers/)
- [Type Definitions](./types.ts)
- [Validation Scripts](../scripts/validation/)