# Components Directory

## Purpose
UI components organized by feature area. All visualization components follow consistent patterns for data flow, styling, and composition.

## Quick Commands
- `npm run dev` - Start development server for component development
- `npm run test:unit` - Run component unit tests
- `npm run storybook` - Component development with Storybook (if configured)

## Conventions

### Component Structure
```typescript
// 1. Imports (external → internal → relative)
import React from 'react'
import { WatchRecord } from '@/lib/types'
import { Button } from '@/components/ui'

// 2. Types/Interfaces
interface ComponentProps {
  data: WatchRecord[]
  filters: FilterOptions
  className?: string
}

// 3. Component
export function Component({ data, filters, className }: ComponentProps) {
  // Implementation
}

// 4. Helper functions (if needed)
function helperFunction() {}
```

### Data Flow Pattern
All visualization components follow this pattern:
1. Receive `WatchRecord[]` data as props
2. Apply filters via `FilterOptions`
3. Use aggregation functions from `lib/`
4. Render using Recharts or custom UI

### Styling Patterns
```tsx
// Glassmorphism Cards
<div className="rounded-xl border bg-card/50 backdrop-blur-sm p-6">

// Primary gradient (purple to pink)
<div className="bg-gradient-to-r from-purple-600 to-pink-600">

// Secondary gradient (cyan to blue)  
<div className="bg-gradient-to-r from-cyan-500 to-blue-600">
```

## Dependencies
- `@/lib/types` for data types
- `@/lib/analytics` for calculations
- `@/lib/aggregations` for data processing
- Recharts for visualizations
- Tailwind CSS for styling

## Testing
- Unit tests in `tests/unit/components/`
- Test with mock data using `generateDemoData()`
- Use React Testing Library for component tests
- Test user interactions and data flow

## File Organization
- `ui/` - Reusable base components (Button, Card, Input, etc.)
- `dashboard/` - Main dashboard visualizations
- `analytics/` - Advanced analytics components
- `channels/` - Channel-specific analysis views
- `history/` - Watch history browsing components
- `import/` - Data import and processing UI
- `layout/` - App structure (header, sidebar, topbar)
- `topics/` - Topic analysis and insights

## Performance Guidelines
- Use `React.memo` for expensive components
- Use `useMemo` for expensive calculations
- Keep components under 500 lines
- Split by clear responsibility boundaries

## Common Pitfalls
1. **Don't fetch data in components** - Pass data as props
2. **Don't use inline styles** - Use Tailwind classes
3. **Don't forget memoization** - Use useMemo for expensive operations
4. **Don't hardcode colors** - Use CSS variables or Tailwind
5. **Don't skip loading states** - Always handle loading/empty/error

## Links
- [Component Patterns](./docs/architecture/component-patterns.md)
- [Styling Guide](./docs/development/styling.md)
- [Testing Guide](./docs/development/testing.md)