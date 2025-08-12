# CLAUDE.md - Components Directory

This file provides guidance to Claude Code (claude.ai/code) when working with components in this directory.

## Component Architecture

### Directory Structure
```
components/
├── analytics/          # Advanced analytics visualizations
├── channels/           # Channel-specific analysis views
├── dashboard/          # Main dashboard visualizations
├── history/            # Watch history browsing components
├── import/             # Data import and processing UI
├── layout/             # App structure (header, sidebar, topbar)
├── topics/             # Topic analysis and insights
└── ui/                 # Reusable UI primitives
```

## Component Patterns

### Data Flow Pattern
All visualization components follow this pattern:
1. Receive `WatchRecord[]` data as props
2. Apply filters via `FilterOptions`
3. Use aggregation functions from `lib/`
4. Render using Recharts or custom UI

Example:
```tsx
interface ComponentProps {
  data: WatchRecord[]
  filters: FilterOptions
}

export function MyChart({ data, filters }: ComponentProps) {
  const aggregated = useMemo(() => 
    computeAggregation(data, filters), [data, filters]
  )
  return <Recharts... data={aggregated} />
}
```

### Styling Patterns

#### Glassmorphism Cards
```tsx
<div className="rounded-xl border bg-card/50 backdrop-blur-sm p-6">
  {/* Content */}
</div>
```

#### Gradient Accents
```tsx
// Primary gradient (purple to pink)
<div className="bg-gradient-to-r from-purple-600 to-pink-600">

// Secondary gradient (cyan to blue)  
<div className="bg-gradient-to-r from-cyan-500 to-blue-600">
```

#### Consistent Spacing
- Card padding: `p-6`
- Section spacing: `space-y-6`
- Grid gaps: `gap-6`

### Component Categories

#### Dashboard Components (`dashboard/`)
Core visualizations for the main dashboard:
- `kpi-cards.tsx`: Key performance indicators with YOY trends
- `monthly-trend-chart.tsx`: Time series visualization
- `top-channels-chart.tsx`: Channel rankings
- `day-time-heatmap.tsx`: Viewing pattern heatmap
- `topics-leaderboard.tsx`: Topic distribution
- `dashboard-filters.tsx`: Global filter controls

#### Analytics Components (`analytics/`)
Advanced analysis features:
- `session-analysis-card.tsx`: Viewing session detection
- `viewing-patterns-card.tsx`: Time-based patterns
- `statistical-deep-dive.tsx`: Statistical analysis
- `time-series-chart.tsx`: Detailed time series

#### UI Primitives (`ui/`)
Reusable shadcn/ui-style components:
- `card.tsx`: Base card component
- `button.tsx`: Button variants
- `badge.tsx`: Status badges
- `select.tsx`: Dropdown selects
- `chart-container.tsx`: Chart wrapper with loading states

#### Import Components (`import/`)
File upload and processing:
- `FileUpload.tsx`: Drag-and-drop file handler
- `ImportSummary.tsx`: Post-import statistics
- `ErrorBoundary.tsx`: Error handling wrapper

## Common Component Tasks

### Creating a New Chart Component
```tsx
// 1. Import dependencies
import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { WatchRecord, FilterOptions } from '@/types/records'
import { computeYourAggregation } from '@/lib/aggregations'

// 2. Define props interface
interface YourChartProps {
  data: WatchRecord[]
  filters: FilterOptions
  className?: string
}

// 3. Create component with memoized data
export function YourChart({ data, filters, className }: YourChartProps) {
  const chartData = useMemo(() => 
    computeYourAggregation(data, filters),
    [data, filters]
  )

  // 4. Apply consistent styling
  return (
    <div className={`rounded-xl border bg-card/50 backdrop-blur-sm p-6 ${className}`}>
      <h3 className="text-lg font-semibold mb-4">Your Chart Title</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          {/* Chart configuration */}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

### Adding Loading States
```tsx
import { Skeleton } from '@/components/ui/skeleton'

if (isLoading) {
  return (
    <div className="rounded-xl border bg-card/50 backdrop-blur-sm p-6">
      <Skeleton className="h-4 w-32 mb-4" />
      <Skeleton className="h-[300px] w-full" />
    </div>
  )
}
```

### Implementing Dark Mode Support
All components automatically support dark mode via Tailwind's dark: prefix:
```tsx
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
```

### Performance Optimization
```tsx
// Use React.memo for expensive components
export const ExpensiveChart = React.memo(({ data, filters }) => {
  // Component implementation
})

// Use useMemo for expensive calculations
const processedData = useMemo(() => {
  return expensiveCalculation(data)
}, [data])

// Virtualize long lists
import { FixedSizeList } from 'react-window'
```

## Component Testing

### Visual Testing
1. Run `npm run dev`
2. Navigate to component routes:
   - `/` - Main dashboard
   - `/dashboard-demo` - Demo with mock data
   - `/analytics` - Analytics page
   - `/channels` - Channel analysis
   - `/topics` - Topic insights

### Data Testing
Use mock data for development:
```tsx
import { generateDemoData } from '@/lib/demo-data'

const mockData = generateDemoData(1000) // Generate 1000 records
```

## Recharts Configuration

### Common Chart Props
```tsx
<LineChart
  data={data}
  margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
>
  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
  <XAxis 
    dataKey="month" 
    stroke="#9CA3AF"
    fontSize={12}
  />
  <YAxis 
    stroke="#9CA3AF"
    fontSize={12}
  />
  <Tooltip
    contentStyle={{
      backgroundColor: 'rgba(17, 24, 39, 0.9)',
      border: '1px solid #374151',
      borderRadius: '0.5rem'
    }}
  />
  <Line
    type="monotone"
    dataKey="value"
    stroke="url(#colorGradient)"
    strokeWidth={2}
    dot={false}
  />
</LineChart>
```

### Gradient Definitions
```tsx
<defs>
  <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stopColor="#9333EA" />
    <stop offset="100%" stopColor="#EC4899" />
  </linearGradient>
</defs>
```

## Component Conventions

### Naming
- Components: PascalCase (e.g., `KpiCards.tsx`)
- Props interfaces: ComponentNameProps
- Exported functions: camelCase for utilities

### File Structure
```tsx
// 1. Imports
import { external } from 'package'
import { internal } from '@/lib'
import { Component } from '@/components'

// 2. Types/Interfaces
interface Props {}

// 3. Component
export function Component() {}

// 4. Helper functions (if needed)
function helperFunction() {}
```

### Prop Patterns
```tsx
// Always include optional className
interface ComponentProps {
  data: WatchRecord[]
  filters: FilterOptions
  className?: string // For composition
  onAction?: () => void // Callbacks prefixed with 'on'
}
```

## Accessibility

- Use semantic HTML elements
- Include aria-labels for interactive elements
- Ensure keyboard navigation works
- Maintain color contrast ratios
- Add loading announcements for screen readers

## Common Pitfalls to Avoid

1. **Don't fetch data in components** - Pass data as props
2. **Don't use inline styles** - Use Tailwind classes
3. **Don't forget memoization** - Use useMemo for expensive operations
4. **Don't hardcode colors** - Use CSS variables or Tailwind
5. **Don't skip loading states** - Always handle loading/empty/error

## Adding New Component Categories

When creating a new component category:
1. Create new directory under `components/`
2. Add index file exporting all components
3. Update this CLAUDE.md with the new category
4. Follow existing patterns from similar categories