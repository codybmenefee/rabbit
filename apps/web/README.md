# YouTube Analytics Intelligence Platform

A Next.js-based analytics dashboard for visualizing YouTube viewing history data from Google Takeout exports.

## Project Structure

```text
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

1) Install dependencies

```bash
# from repo root (workspaces)
npm install

# or inside this app only
cd apps/web && npm install
```

2) Configure environment

```bash
cp apps/web/.env.example apps/web/.env.local
# Fill in Clerk + Convex values in .env.local
```

Required variables (see `.env.example`):
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_JWT_ISSUER_DOMAIN` (e.g. https://<your-tenant>.clerk.accounts.dev)
- `NEXT_PUBLIC_CONVEX_URL` (from Convex dev/prod)

3) Start Convex (database + functions) in a second terminal

```bash
cd apps/web
npx convex dev
# Copy the printed URL to NEXT_PUBLIC_CONVEX_URL in .env.local
```

4) Run the Next.js dev server

```bash
# from repo root
npm run dev

# or inside apps/web
npm run dev
```

Other commands

```bash
# Build for production
npm run build

# Run linting
npm run lint

# Type checking
npm run type-check

# E2E tests (Playwright)
npx playwright test
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
- **Clerk** for authentication
- **Convex** as the primary data store (queries/mutations under `convex/`)
- Deployed on **Vercel**

Notes:

- No traditional SQL database is used. Any prior `db/` artifacts have been removed to avoid confusion.
- Local `.env.local` is untracked; see `.env.example` for required variables.

For detailed development instructions, see [CLAUDE.md](../CLAUDE.md).
