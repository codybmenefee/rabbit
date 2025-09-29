# Development Setup Guide

## Prerequisites

Before setting up, ensure you have:

- **Node.js**: Version 18 or higher
- **npm**: Version 8 or higher
- **Git**: For version control
- **Code Editor**: VS Code recommended (with TypeScript and Tailwind extensions)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/codybmenefee/rabbit
cd rabbit
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

```bash
# Copy template
cp .env.example .env.local
```

Required:

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Convex
NEXT_PUBLIC_CONVEX_URL=https://...
CONVEX_DEPLOY_KEY=...
```

### 4. Start Development Server

```bash
npm run dev
```

Available at http://localhost:4000. Login to view dashboard.

## Development Workflow

### Daily Development

1. **Start dev server**
   ```bash
   npm run dev
   ```

2. **Run quality checks**
   ```bash
   npm run quality
   ```

### Feature Development

1. **Create branch**
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make changes**
   - Follow folder patterns
   - Add tests

3. **Validate**
   ```bash
   npm run lint
   npm run type-check
   npm run test:e2e
   ```

4. **Commit/PR**
   ```bash
   git add .
   git commit -m "feat: your changes"
   git push origin feature/your-feature
   ```

## Project Structure

```
rabbit/
├── app/          # Next.js routes (dashboard, auth, placeholders)
├── components/   # UI (dashboard, layout, ui basics)
├── lib/          # Types, basic aggs/utils
├── convex/      # Schema/queries
├── tests/       # E2E (auth + dashboard)
└── docs/        # Setup
```

## Available Scripts

- `npm run dev` - Dev server (4000)
- `npm run build` - Production build
- `npm run start` - Production server (4000)
- `npm run lint` - ESLint
- `npm run type-check` - TypeScript
- `npm run format` - Prettier
- `npm run test:e2e` - Playwright E2E
- `npm run quality` - Lint + types + tests

## IDE Configuration

### VS Code

Add `.vscode/settings.json`:

```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "tailwindCSS.includeLanguages": {
    "typescript": "typescript",
    "typescriptreact": "typescriptreact"
  }
}
```

Extensions: TypeScript, Tailwind IntelliSense, ESLint, Prettier.

## Debugging

### Browser DevTools
- React DevTools
- Network tab (Convex queries)
- Performance tab

### Console
- `console.log` for debug
- `debugger` for breaks

### Common Issues

1. **Port in use**
   ```bash
   lsof -ti:4000 | xargs kill -9
   # Or npm run dev -- --port 4001
   ```

2. **Build errors**
   ```bash
   rm -rf .next node_modules/.cache
   npm install
   npm run build
   ```

3. **Type errors**
   ```bash
   rm -rf .next
   npm run type-check
   ```

## Deployment

### Vercel

- Connect repo
- Add env vars (Clerk/Convex)
- Auto-deploys from main

## Troubleshooting

- Docs: Check [README](../README.md)
- Issues: Open on GitHub
- Env: Verify Clerk/Convex keys
