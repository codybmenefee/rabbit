# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YouTube Analytics Intelligence Platform - A Next.js-based analytics dashboard for visualizing YouTube viewing history data from Google Takeout exports. Built with TypeScript, Tailwind CSS, and Recharts for data visualization.

## Development Commands

### Core Development
```bash
# Navigate to the main project directory
cd youtube-analytics

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Architecture

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript with strict mode enabled
- **Styling**: Tailwind CSS with custom glass morphism design system
- **Charts**: Recharts for data visualizations
- **Animations**: Framer Motion
- **UI Components**: Custom shadcn/ui-style components in `components/ui/`
- **Icons**: Lucide React

### Project Structure
```
youtube-analytics/
├── app/                    # Next.js App Router pages and layouts
├── components/            # React components organized by type
│   ├── dashboard/         # Visualization components (charts, metrics)
│   ├── import/           # Data import and processing UI
│   ├── layout/           # Application layout components
│   └── ui/               # Reusable UI primitives
├── lib/                   # Core utilities and data processing
├── types/                 # TypeScript type definitions
├── docs/                  # Project documentation
│   ├── agents/           # Agent reports and summaries
│   ├── architecture/     # Architecture documentation
│   └── api/              # API documentation
├── tests/                 # Testing files and fixtures
│   ├── fixtures/         # Test data and sample files
│   ├── unit/             # Unit tests
│   └── integration/      # Integration tests
├── scripts/               # Development and maintenance scripts
│   ├── validation/       # Data validation scripts
│   ├── testing/          # Testing utilities
│   └── dev-tools/        # Development tools
├── .dev/                  # Development artifacts and logs
└── inspo/basedash/       # Design inspiration references
```

### Data Flow Architecture (Prototype Phase)
1. **Client-side parsing**: Upload and parse Google Takeout `watch-history.html` in browser
2. **Local storage**: IndexedDB for persisting normalized watch records
3. **Aggregations**: Pure functions in `lib/` for computing insights
4. **Visualization**: Dashboard components consume aggregated data

### Key Type Definitions
- `VideoWatch` - Core watch record with title, channel, timestamps
- `CreatorMetrics` - Channel-level aggregated metrics
- `TopicTrend` - Time-series data for topic analysis
- `DashboardMetrics` - High-level KPI aggregations

### Design System
- Dark theme with gradient accents (purple/pink/cyan)
- Glass morphism effects with backdrop blur
- Consistent spacing and typography via Tailwind utilities
- Basedash-inspired UI patterns (reference `inspo/basedash/`)

## Import Path Resolution
The project uses TypeScript path aliases:
- `@/*` maps to the project root
- Example: `import { VideoWatch } from '@/types'`

## Data Source: Google Takeout Watch History
- Format: HTML file with video entries in content cells
- Key fields extracted:
  - Video title and URL
  - Channel name and URL  
  - Watch timestamp
  - Product type (YouTube vs YouTube Music)
- Edge cases handled: Private videos, missing URLs, non-ASCII characters

## Testing Approach
- Use sample files in `tests/fixtures/` for testing imports
- Create smaller test files (~200-500 entries) for faster development cycles
- Unit tests located in `tests/unit/`
- Integration tests in `tests/integration/`
- Validation scripts in `scripts/validation/`

## Phase 2 Considerations (Post-Prototype)
- Server-side parsing with database storage (Postgres/Turso)
- YouTube Data API integration for duration enrichment
- Multi-user support with authentication
- Advanced analytics (session detection, creator networks)

## Performance Notes
- Large HTML files are processed client-side (may be slow for full exports)
- React 19 concurrent features utilized
- Recharts for optimized chart rendering
- Tailwind for minimal CSS bundle size

## Common Tasks

### Adding New Visualizations
1. Create component in `components/dashboard/`
2. Add required types to `types/index.ts`
3. Update mock data in `lib/mock-data.ts`
4. Import and use in main dashboard page

### Modifying Color Scheme
- Update Tailwind config in `tailwind.config.js`
- Adjust CSS variables in `app/globals.css`
- Maintain consistency with glass morphism effects

### Integrating Real Data
Replace mock data functions in `lib/mock-data.ts` with API calls or database queries while maintaining the same interface contracts.

## Agent Documentation and Reports

Development agents should place their reports and documentation in the organized structure:

### Agent Report Locations
- **Quality Assurance**: `docs/agents/` - QA reports, validation results
- **Architecture Reviews**: `docs/agents/` - Implementation summaries, architectural decisions  
- **Performance Reports**: `docs/agents/` - Optimization reports, performance analysis
- **Issue Tracking**: `docs/agents/` - Bug reports, resolution documentation

### File Naming Convention
Use descriptive filenames with agent identifier and date:
```
[AGENT_TYPE]_[REPORT_TYPE]_[YYYY-MM-DD].md
```

Examples:
- `QA_VALIDATION_2024-08-10.md`
- `ARCHITECTURE_REVIEW_2024-08-10.md` 
- `PERFORMANCE_ANALYSIS_2024-08-10.md`

### Development Artifacts
- **Temporary files**: Place in `.dev/` directory
- **Debug logs**: Use `.dev/logs/`
- **Generated reports**: Use `.dev/reports/`

This organization ensures that agent work is properly documented and easily discoverable while keeping the main codebase clean.