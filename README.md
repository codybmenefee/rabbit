# Rabbit - Minimal YouTube Analytics Dashboard

A Next.js-based dashboard for viewing pre-loaded YouTube viewing history data. Built with TypeScript, Tailwind CSS, and Recharts for data visualization. Users authenticate via Clerk and view their data from Convex.

## 🚀 Quick Start

```bash
# Clone and setup
git clone https://github.com/codybmenefee/rabbit
cd rabbit
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your Clerk and Convex credentials

# Start development server (port 4000)
npm run dev
```

Open http://localhost:4000 to view the application. After login, you'll see the dashboard with your data.

## 🏗️ Architecture

- **Frontend**: Next.js 15 with App Router
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS
- **Charts**: Recharts for data visualizations
- **Auth**: Clerk for authentication
- **Backend**: Convex for data storage and queries
- **Deployment**: Vercel

## 📁 Project Structure

```
rabbit/
├── app/                    # Next.js App Router pages
├── components/             # UI components (dashboard, layout, ui)
├── lib/                    # Core types and basic utilities
├── convex/                 # Backend schema and queries
├── tests/                  # Playwright E2E tests
├── docs/                   # Setup documentation
└── ...                     # Config files (package.json, tsconfig.json, etc.)
```

## 🔄 Data Flow

1. **Authentication**: Users sign in via Clerk at /sign-in.
2. **Dashboard**: Protected route at / fetches user records from Convex and displays KPIs/charts.

Data is assumed pre-loaded into Convex; no upload functionality.

## 🛠️ Development

### Prerequisites
- Node.js 18+
- npm 8+
- Clerk account for authentication
- Convex account for backend

### Available Scripts

```bash
# Development
npm run dev          # Start development server (port 4000)
npm run build        # Build for production
npm run start        # Start production server (port 4000)

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
npm run format       # Format code with Prettier

# Testing
npm run test         # Run E2E tests
npm run test:e2e     # Run E2E tests

# Quality
npm run quality      # Lint + types + tests
```

### Development Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow patterns in each folder
   - Update relevant CLAUDE.md files if patterns change
   - Add tests for new functionality

3. **Validate Changes**
   ```bash
   npm run lint
   npm run type-check
   npm run test
   ```

4. **Submit Pull Request**
   - Ensure all checks pass
   - Include clear description of changes
   - Reference any related issues

## 📚 Documentation

- [Contributing Guidelines](./CONTRIBUTING.md)
- [Development Setup](./docs/development/setup.md)

## 🧪 Testing

Uses Playwright for E2E tests covering auth and dashboard loading.

## 🚀 Deployment

Deployed on Vercel with automatic deployments from main.

### Environment Variables

See `.env.example`:
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- CLERK_SECRET_KEY
- NEXT_PUBLIC_CONVEX_URL
- CONVEX_DEPLOY_KEY (for dev)

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - see [LICENSE](LICENSE).

## 🆘 Support

- Check [docs](./docs/) for setup
- Open issues for bugs/features

---
Built with ❤️ by the Rabbit team
