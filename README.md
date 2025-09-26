# Rabbit - YouTube Analytics Intelligence Platform

A Next.js-based analytics dashboard for visualizing YouTube viewing history data from Google Takeout exports. Built with TypeScript, Tailwind CSS, and Recharts for data visualization.

## 🚀 Quick Start

```bash
# Clone and setup
git clone [https://github.com/codybmenefee/rabbit]
cd rabbit
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your Clerk and Convex credentials

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🏗️ Architecture

- **Frontend**: Next.js 15 with App Router
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS with glassmorphism design
- **Charts**: Recharts for data visualizations
- **Auth**: Clerk for authentication
- **Backend**: Convex for data storage and queries
- **Worker**: Node-based background processor powered by Convex jobs
- **Deployment**: Vercel

## 📁 Project Structure

```
rabbit/
├── app/                    # Next.js App Router pages
├── components/             # UI components organized by feature
├── hooks/                  # Shared React hooks (add as they appear)
├── lib/                    # Core business logic and utilities
├── convex/                 # Backend functions and schema
├── apps/worker/            # Background job runner for Convex jobs
├── scripts/                # Development and validation scripts
├── tests/                  # Automated tests and fixtures
├── docs/                   # Comprehensive documentation
├── public/                 # Static assets served by Next.js
└── .claude/                # AI agent context and decision logs
```

## 🔄 Data Flow

1. **Import** – users upload Google Takeout HTML; `lib/parser.ts` normalizes records before Convex mutations persist them.
2. **Store** – Convex (`convex/ingest.ts`, `convex/schema.ts`) keeps canonical watch data and enrichment status per user.
3. **Analyze** – UI components pull records via Convex queries and run calculations with `lib/aggregations.ts` and `lib/advanced-analytics.ts`.
4. **Enrich** – the worker in `apps/worker/` leases Convex jobs to fetch metadata, transcripts, and AI summaries, writing results back through `pipeline:*` mutations.

## 🛠️ Development

### Prerequisites
- Node.js 18+ 
- npm 8+
- Clerk account for authentication
- Convex account for backend

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run worker:dev   # Run background job worker (requires service token)

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
npm run format       # Format code with Prettier

# Testing
npm run test         # Run all tests
npm run test:unit    # Run unit tests
npm run test:e2e     # Run E2E tests

# Validation
npm run validate:all # Run all validation scripts
npm run validate:analytics  # Validate analytics functions
npm run validate:parsers    # Validate data parsers
```

### Development Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow the established patterns in each folder
   - Update relevant `CLAUDE.md` files if patterns change
   - Add tests for new functionality

3. **Validate Changes**
   ```bash
   npm run lint
   npm run test
   npm run validate:all
   ```

4. **Submit Pull Request**
   - Ensure all checks pass
   - Include clear description of changes
   - Reference any related issues

## 📚 Documentation

- [Contributing Guidelines](./CONTRIBUTING.md) - How to contribute to the project
- [Architecture Overview](./docs/architecture/) - Technical architecture details
- [Development Setup](./docs/development/setup.md) - Detailed setup instructions
- [API Documentation](./docs/api/) - Backend API reference

## 🧪 Testing

The project uses multiple testing strategies:

- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test component interactions
- **E2E Tests**: Test complete user workflows with Playwright
- **Validation Scripts**: Test data integrity and analytics accuracy

## 🚀 Deployment

The application is deployed on Vercel with automatic deployments from the main branch.

### Environment Variables

Required environment variables (see `.env.example`):

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret
NEXT_PUBLIC_CONVEX_URL=your_convex_url
CONVEX_DEPLOY_KEY=your_convex_deploy_key
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- Check the [documentation](./docs/) for detailed guides
- Open an issue for bugs or feature requests
- Join our discussions for questions and ideas

---

Built with ❤️ by the Rabbit team
