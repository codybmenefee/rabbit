# YouTube Analytics Intelligence Platform

A Next.js-based analytics dashboard for visualizing YouTube viewing history data from Google Takeout exports.

## Project Structure

```
youtube-analytics/
├── app/                    # Next.js App Router pages and layouts
├── components/            # React components
│   ├── dashboard/         # Data visualization components
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
└── .dev/                  # Development artifacts and logs
```

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint
```

## Key Features

- **Client-side HTML parsing** of Google Takeout watch history
- **Interactive dashboard** with charts and metrics
- **Advanced filtering** by timeframe, product, topics, and channels
- **Year-over-year analytics** with trend calculations
- **Topic classification** with ML-style pattern matching
- **Responsive design** with glassmorphism UI

## Documentation

- [Architecture Overview](docs/architecture/)
- [Agent Reports](docs/agents/)
- [API Documentation](docs/api/)
- [Testing Guide](tests/)

## Development

This project uses:
- **Next.js 15** with App Router
- **TypeScript** with strict mode
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **date-fns** for date manipulation

For detailed development instructions, see [CLAUDE.md](../CLAUDE.md).