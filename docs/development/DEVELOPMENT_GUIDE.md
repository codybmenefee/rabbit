# Rabbit Development Guide

This guide provides comprehensive information for developers working on the Rabbit data analytics platform.

## 🏗️ Architecture Overview

Rabbit is built as a monorepo with a clear separation between platform-agnostic core logic and platform-specific implementations.

### Core Principles

1. **Platform Agnostic**: Core logic works across all platforms
2. **Composable**: Components can be easily combined and extended
3. **Type Safe**: Full TypeScript support throughout
4. **Testable**: Clear interfaces and dependency injection
5. **Scalable**: Easy to add new platforms and features

## 📁 Directory Structure

```
rabbit/
├── apps/
│   └── web/                    # Next.js web application
├── packages/
│   ├── core/                   # Platform-agnostic core
│   │   ├── types/              # Shared type definitions
│   │   ├── parsers/            # Base parser interfaces
│   │   ├── analytics/          # Analytics engines
│   │   └── storage/            # Storage abstractions
│   ├── ui/                     # Shared UI components
│   └── validation/             # Data validation utilities
├── platforms/                  # Platform-specific implementations
│   ├── youtube/                # YouTube platform
│   ├── spotify/                # Future: Spotify platform
│   └── podcast/                # Future: Podcast platform
├── tools/                      # Development tools
└── tests/                      # Test files
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm 8+
- Git

### Setup

```bash
# Clone repository
git clone https://github.com/your-org/rabbit.git
cd rabbit

# Install dependencies
npm install

# Start development server
npm run dev
```

### Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Run linting
npm run lint

# Type checking
npm run type-check

# Clean dependencies
npm run clean

# Install all dependencies
npm run install:all
```

## 🧩 Core Concepts

### Base Types

All platforms extend the `BaseMediaRecord` interface:

```typescript
interface BaseMediaRecord {
  id: string
  title: string | null
  creator: string | null
  platform: string
  consumedAt: string | null
  duration?: number | null
  url?: string | null
  topics: string[]
  // ... computed fields
}
```

### Parser Interface

All parsers implement the `BaseParser` interface:

```typescript
interface BaseParser<T extends BaseMediaRecord> {
  parse(file: File): Promise<BaseParserResult<T>>
  parseString(data: string, filename: string): Promise<BaseParserResult<T>>
  canParse(file: File): boolean
  getConfig(): BaseParserConfig
  getSupportedFormats(): string[]
  getMaxFileSize(): number
}
```

### Analytics Engine

Analytics are built on the `BaseAggregations` class:

```typescript
class BaseAggregations {
  static applyFilters<T>(records: T[], filters: BaseFilterOptions): T[]
  static computeKPIs<T>(records: T[], filters: BaseFilterOptions): BaseAnalytics
  static computeYoYComparison<T>(records: T[], filters: BaseFilterOptions): ComparisonResult
  // ... other methods
}
```

## 🔧 Adding a New Platform

### 1. Create Platform Directory

```bash
mkdir platforms/new-platform
mkdir platforms/new-platform/{parsers,types,analytics,components,config}
```

### 2. Define Types

```typescript
// platforms/new-platform/types/index.ts
import { BaseMediaRecord } from '../../../packages/core/types'

export interface NewPlatformRecord extends BaseMediaRecord {
  platform: 'NewPlatform'
  // platform-specific fields
}
```

### 3. Implement Parser

```typescript
// platforms/new-platform/parsers/new-platform-parser.ts
import { BaseParser } from '../../../packages/core/parsers/base/parser.interface'
import { NewPlatformRecord } from '../types'

export class NewPlatformParser implements BaseParser<NewPlatformRecord> {
  // implement interface methods
}
```

### 4. Add Analytics

```typescript
// platforms/new-platform/analytics/new-platform-analytics.ts
import { BaseAggregations } from '../../../packages/core/analytics/aggregations/base-aggregations'
import { NewPlatformRecord } from '../types'

export class NewPlatformAnalytics extends BaseAggregations {
  // implement platform-specific analytics
}
```

### 5. Create Components

```typescript
// platforms/new-platform/components/new-platform-dashboard.tsx
import { NewPlatformRecord } from '../types'
import { NewPlatformAnalytics } from '../analytics'

export function NewPlatformDashboard({ records }: { records: NewPlatformRecord[] }) {
  // implement dashboard
}
```

## 🧪 Testing

### Unit Tests

```typescript
// tests/unit/parsers/youtube-parser.test.ts
import { YouTubeParser } from '@rabbit/youtube/parsers'

describe('YouTubeParser', () => {
  it('should parse HTML content', async () => {
    const parser = new YouTubeParser()
    const result = await parser.parseString(htmlContent, 'test.html')
    expect(result.records).toHaveLength(expectedCount)
  })
})
```

### Integration Tests

```typescript
// tests/integration/analytics.test.ts
import { YouTubeAnalyticsEngine } from '@rabbit/youtube/analytics'

describe('Analytics Integration', () => {
  it('should compute KPIs correctly', () => {
    const kpis = YouTubeAnalyticsEngine.computeYouTubeKPIs(records, filters)
    expect(kpis.totalRecords).toBe(expectedCount)
  })
})
```

### E2E Tests

```typescript
// tests/e2e/upload-flow.spec.ts
import { test, expect } from '@playwright/test'

test('should upload and parse YouTube data', async ({ page }) => {
  await page.goto('/')
  await page.setInputFiles('input[type="file"]', 'test-data.html')
  await page.click('button[type="submit"]')
  await expect(page.locator('[data-testid="dashboard"]')).toBeVisible()
})
```

## 📦 Package Management

### Adding Dependencies

```bash
# Add to specific workspace
npm install package-name --workspace=apps/web
npm install package-name --workspace=packages/core
npm install package-name --workspace=platforms/youtube

# Add to root (affects all workspaces)
npm install package-name
```

### Workspace Dependencies

```json
{
  "dependencies": {
    "@rabbit/core": "workspace:*",
    "@rabbit/youtube": "workspace:*",
    "@rabbit/ui": "workspace:*"
  }
}
```

## 🎨 UI Development

### Component Structure

```typescript
// packages/ui/components/Button.tsx
import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '../utils'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors',
          {
            'bg-primary text-primary-foreground hover:bg-primary/90': variant === 'primary',
            'bg-secondary text-secondary-foreground hover:bg-secondary/80': variant === 'secondary',
            'border border-input bg-background hover:bg-accent': variant === 'outline',
          },
          {
            'h-9 px-3 text-sm': size === 'sm',
            'h-10 px-4 py-2': size === 'md',
            'h-11 px-8 text-lg': size === 'lg',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
```

### Styling Guidelines

- Use Tailwind CSS for styling
- Follow the design system in `packages/ui/styles/`
- Use CSS variables for theming
- Maintain consistent spacing and typography

## 🔍 Debugging

### Development Tools

```bash
# Start with debug logging
DEBUG=rabbit:* npm run dev

# Run specific tests
npm run test -- --grep "YouTube Parser"

# Type checking with detailed output
npm run type-check -- --noEmit --pretty
```

### Common Issues

1. **Import Errors**: Check workspace dependencies in package.json
2. **Type Errors**: Ensure all types are properly exported
3. **Build Errors**: Check for circular dependencies
4. **Test Failures**: Verify test data and mocks

## 📚 Documentation

### Code Documentation

```typescript
/**
 * Parses YouTube watch history from HTML content
 * 
 * @param htmlContent - Raw HTML content from Google Takeout
 * @param options - Parser configuration options
 * @returns Promise resolving to parsed records and metadata
 * 
 * @example
 * ```typescript
 * const parser = new YouTubeParser()
 * const result = await parser.parseString(htmlContent, 'watch-history.html')
 * console.log(`Parsed ${result.records.length} records`)
 * ```
 */
export class YouTubeParser implements BaseParser<YouTubeRecord> {
  // implementation
}
```

### API Documentation

- Use JSDoc comments for all public APIs
- Include examples for complex functions
- Document all parameters and return types
- Keep documentation up to date with code changes

## 🚀 Deployment

### Production Build

```bash
# Build all packages
npm run build

# Start production server
npm run start
```

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_APP_NAME=Rabbit
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id
```

## 🤝 Contributing

### Code Style

- Use Prettier for formatting
- Follow ESLint rules
- Use TypeScript strict mode
- Write meaningful commit messages

### Pull Request Process

1. Create feature branch
2. Make changes
3. Add tests
4. Update documentation
5. Submit pull request
6. Address review feedback

### Commit Convention

```
feat: add new platform support
fix: resolve parser memory leak
docs: update API documentation
test: add unit tests for analytics
refactor: simplify parser interface
```

## 🆘 Getting Help

- Check the [FAQ](FAQ.md)
- Review [Issues](https://github.com/your-org/rabbit/issues)
- Ask in [Discussions](https://github.com/your-org/rabbit/discussions)
- Join our [Discord](https://discord.gg/rabbit)

---

Happy coding! 🐰
