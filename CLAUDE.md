# Rabbit Project Context

This file provides high-level project architecture and patterns for AI agents working in this repository.

## Project Overview

Rabbit is a YouTube Analytics Intelligence Platform - a Next.js-based analytics dashboard for visualizing YouTube viewing history data from Google Takeout exports. Built with TypeScript, Tailwind CSS, and Recharts for data visualization.

## Core Development Commands

```bash
# Install dependencies
npm install

# Run development server (port 3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Run all tests
npm run test

# Run validation scripts
npm run validate:all
```

## Architecture Overview

### Tech Stack

- Framework: Next.js 15 with App Router
- Language: TypeScript with strict mode enabled
- Styling: Tailwind CSS with glassmorphism design system
- Charts: Recharts for data visualizations
- Animations: Framer Motion
- UI Components: Custom shadcn/ui-style components
- Auth: Clerk
- Data Store: Convex (queries/mutations in `youtube-analytics/convex/`)
- Deployment: Vercel
- Testing: Playwright for E2E tests

### Core Data Flow

1. **Upload & Parse**: User uploads `watch-history.html` from Google Takeout
   - `lib/parser.ts`: YouTubeHistoryParser class handles HTML parsing
   - Extracts video titles, channels, timestamps, and products (YouTube/YouTube Music)
   - Handles multiple HTML formats and edge cases

2. **Data Normalization**:
   - `types/records.ts`: WatchRecord type with computed fields (year, month, week, hour)
   - Topic classification using keyword matching
   - Unique ID generation for deduplication

3. **Aggregations**:
   - `lib/aggregations.ts`: Core aggregation functions (KPIs, trends, channels)
   - `lib/advanced-analytics.ts`: Session analysis, viewing patterns
   - `lib/channel-aggregations.ts`: Channel-specific metrics
   - `lib/topic-aggregations.ts`: Topic analysis and trends

4. **Visualization**:
   - Dashboard components consume aggregated data
   - Real-time filtering by timeframe, product, topics, channels
   - YOY/QOQ comparisons with trend indicators

### Key Type Definitions

```typescript
// Core watch record
interface WatchRecord {
  id: string
  watchedAt: string | null
  videoTitle: string | null
  channelTitle: string | null
  product: 'YouTube' | 'YouTube Music'
  topics: string[]
  // Computed fields for aggregations
  year, month, week, dayOfWeek, hour: number | null
  yoyKey: string | null
}

// Filter options
interface FilterOptions {
  timeframe: 'All' | 'YTD' | 'QTD' | 'MTD' | 'Last6M' | 'Last12M'
  product: 'All' | 'YouTube' | 'YouTube Music'
  topics?: string[]
  channels?: string[]
}
```

### Import Path Resolution

- `@/*` maps to the project root
- Example: `import { WatchRecord } from '@/types/records'`

## Critical Implementation Details

### HTML Parsing Strategy

The parser (`lib/parser.ts`) uses multiple fallback strategies:

1. Primary: Look for `.content-cell` divs (standard Takeout format)
2. Secondary: Search for outer container cells
3. Fallback: Regex-based extraction for unrecognized formats

### Timestamp Handling

- Multiple date formats supported (e.g., "Jun 23, 2025, 11:42:47 PM CDT")
- Sanitizes non-breaking spaces and timezone tokens
- Falls back to regex patterns when Date parsing fails

### Session Detection

- Sessions are defined by 30-minute gaps between videos
- Calculated in `lib/advanced-analytics.ts::computeSessionAnalysis`
- Used for viewing pattern analysis

### Topic Classification

- Keyword-based classification in `lib/parser.ts::topicKeywords`
- Categories: tech, business, entertainment, education, news, health, science, lifestyle
- Fallback to "Other" when no keywords match

## Testing Approach

### E2E Tests (Playwright)

- `tests/simple-upload.spec.ts`: Basic upload flow
- `tests/qa-upload-flow.spec.ts`: Comprehensive QA scenarios
- Test fixtures in `tests/fixtures/` (mini HTML files for fast testing)

### Validation Scripts

- `scripts/validate-analytics.ts`: Tests aggregation accuracy
- `scripts/validate-statistical-functions.ts`: Validates YOY/QOQ calculations
- Run with `npx tsx <script-path>` or npm scripts in `youtube-analytics/package.json`

### Debug Tools

- Scripts are consolidated under `youtube-analytics/scripts/dev-tools/`
  - `test-parsing.js`: Parser output verification
  - `debug-cross-contamination.js`: Integrity checks for record isolation
  - `debug-real-fixtures.js`: Validate against real HTML fixtures
  - `simple-timestamp-test.js`: Quick timestamp extraction checks
  - `test-date-validation.js`: Date bounds validation
  - `test-enhanced-timestamp-validation.js`: Extended timestamp tests
  - `test-resilient-parser.js`: Resilience tests for parser
  
Run examples:

- `node youtube-analytics/scripts/dev-tools/test-parsing.js`
- `node youtube-analytics/scripts/dev-tools/debug-cross-contamination.js`

## Common Development Tasks

### Adding New Aggregation Functions

1. Add function to `lib/aggregations.ts` or create new file in `lib/`
2. Define return types in `types/records.ts` or `types/index.ts`
3. Import and use in dashboard components
4. Add validation tests in `scripts/validation/`

### Modifying the Parser

1. Update `lib/parser.ts` with new extraction logic
2. Test with sample files in `tests/fixtures/`
3. Run `node youtube-analytics/scripts/dev-tools/test-parsing.js` for quick verification
4. Update E2E tests if format changes significantly

### Creating New Dashboard Views

1. Create component in appropriate directory (`components/dashboard/`, `components/analytics/`)
2. Use existing aggregation functions or create new ones
3. Apply consistent styling with Tailwind utilities
4. Maintain glassmorphism effects (backdrop-blur, bg-opacity)

### Performance Optimization

- Large files (>10k records) may be slow client-side
- Consider pagination or virtualization for lists
- Use React.memo for expensive chart components
- Monitor with browser DevTools Performance tab

## Phase 2 Considerations (Post-Prototype)

- Server-side parsing with database storage
- YouTube Data API integration for video duration
- Multi-user support with authentication
- Advanced analytics (creator networks, recommendation analysis)

## Agent Documentation

Development agents should place reports in `docs/agents/` with naming convention:

```text
[AGENT_TYPE]_[REPORT_TYPE]_[YYYY-MM-DD].md
```

Example: `QA_VALIDATION_2024-08-11.md`

## Agent Files Hierarchy

- Root `AGENTS.md` defines global, cross-agent rules and safety.
- Subfolders use `CLAUDE.md` for local, folder-specific guidance only.
- Keep local files concise; link to detailed docs under `youtube-analytics/docs/` rather than duplicating content.
