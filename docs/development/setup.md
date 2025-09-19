# Development Setup Guide

## Prerequisites

Before setting up the development environment, ensure you have the following installed:

- **Node.js**: Version 18 or higher
- **npm**: Version 8 or higher
- **Git**: For version control
- **Code Editor**: VS Code recommended (with TypeScript and Tailwind CSS extensions)

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd rabbit
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

```bash
# Copy the environment template
cp .env.example .env.local

# Edit .env.local with your credentials
```

Required environment variables:

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Convex Backend
NEXT_PUBLIC_CONVEX_URL=your_convex_url
CONVEX_DEPLOY_KEY=your_convex_deploy_key
```

### 4. Start Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Development Workflow

### Daily Development

1. **Start the development server**
   ```bash
   npm run dev
   ```

2. **Run tests in watch mode**
   ```bash
   npm run test:watch
   ```

3. **Check code quality**
   ```bash
   npm run quality
   ```

### Feature Development

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the established patterns
   - Update relevant documentation
   - Add tests for new functionality

3. **Validate your changes**
   ```bash
   npm run lint
   npm run type-check
   npm run test
   npm run validate:all
   ```

4. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: add your feature"
   git push origin feature/your-feature-name
   ```

## Project Structure

```
rabbit/
├── app/                    # Next.js App Router pages
├── components/             # UI components organized by feature
├── lib/                    # Core business logic and utilities
├── convex/                 # Backend functions and schema
├── tests/                  # All tests (unit, integration, e2e)
├── scripts/                # Development and validation scripts
└── docs/                   # Documentation
```

## Available Scripts

### Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server

### Code Quality
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks
- `npm run format` - Format code with Prettier
- `npm run quality` - Run all quality checks

### Testing
- `npm run test` - Run all tests
- `npm run test:unit` - Run unit tests
- `npm run test:e2e` - Run E2E tests
- `npm run test:watch` - Run tests in watch mode

### Validation
- `npm run validate:all` - Run all validation scripts
- `npm run validate:analytics` - Validate analytics functions
- `npm run validate:parsers` - Validate data parsers

### Development Tools
- `npm run dev:parse` - Debug parsing with sample data
- `npm run dev:perf:worker` - Test worker performance

## IDE Configuration

### VS Code Extensions

Recommended extensions for optimal development experience:

- **TypeScript**: Built-in TypeScript support
- **Tailwind CSS IntelliSense**: Autocomplete for Tailwind classes
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **Auto Rename Tag**: Automatically rename paired HTML/JSX tags
- **Bracket Pair Colorizer**: Colorize matching brackets
- **GitLens**: Enhanced Git capabilities

### VS Code Settings

Create `.vscode/settings.json`:

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

## Debugging

### Browser DevTools
- Use React DevTools for component debugging
- Use Network tab to monitor API calls
- Use Performance tab for performance analysis

### Console Debugging
- Use `console.log` for quick debugging
- Use `debugger` statements for breakpoints
- Use browser DevTools for advanced debugging

### Validation Scripts
- Use `npm run dev:parse` to debug parsing issues
- Use `npm run validate:all` to check data integrity
- Use `npm run dev:perf:worker` to test performance

## Common Issues

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
npm run dev -- --port 3001
```

### TypeScript Errors
```bash
# Clear TypeScript cache
rm -rf .next
rm -rf node_modules/.cache
npm run type-check
```

### Build Issues
```bash
# Clean and rebuild
rm -rf .next
rm -rf node_modules
npm install
npm run build
```

## Performance Optimization

### Development Performance
- Use `npm run dev` for fast development
- Use `npm run build` to test production build
- Monitor bundle size with `npm run analyze`

### Runtime Performance
- Use React.memo for expensive components
- Use useMemo for expensive calculations
- Use lazy loading for large components
- Monitor performance with DevTools

## Testing

### Unit Tests
- Test individual functions and components
- Use mock data from fixtures
- Aim for >80% code coverage

### Integration Tests
- Test component interactions
- Test data flow between modules
- Test API integrations

### E2E Tests
- Test complete user workflows
- Use Playwright for browser automation
- Test across different browsers

## Deployment

### Local Testing
```bash
npm run build
npm run start
```

### Vercel Deployment
- Connect repository to Vercel
- Configure environment variables
- Deploy automatically on push to main

## Troubleshooting

### Common Problems

1. **Module not found errors**
   - Check import paths
   - Verify file exists
   - Check TypeScript configuration

2. **Build failures**
   - Check for TypeScript errors
   - Verify all dependencies are installed
   - Check environment variables

3. **Test failures**
   - Check test data fixtures
   - Verify test environment setup
   - Check for async operation issues

### Getting Help

- Check the [documentation](../README.md)
- Search existing [issues](https://github.com/your-org/rabbit/issues)
- Ask questions in [discussions](https://github.com/your-org/rabbit/discussions)
- Review the [contributing guide](../CONTRIBUTING.md)
