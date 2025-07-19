# Testing Framework - Rabbit YouTube Analytics Platform

## 🧪 Testing Strategy Overview

This document outlines the comprehensive testing framework for the Rabbit YouTube Analytics Platform, covering backend services, frontend components, and end-to-end user flows.

## 📁 Project Structure

```
tests/
├── README.md                    # This file - testing documentation
├── backend/                     # Backend testing (Jest + TypeScript)
│   ├── unit/                   # Unit tests for individual functions/classes
│   │   ├── services/           # Service layer tests
│   │   ├── controllers/        # API endpoint tests
│   │   ├── utils/              # Utility function tests
│   │   └── models/             # Data model tests
│   ├── integration/            # Integration tests
│   │   ├── api/               # API integration tests
│   │   ├── database/          # Database integration tests
│   │   └── external/          # External service integration tests
│   ├── fixtures/              # Test data and mock responses
│   └── helpers/               # Test utilities and setup
├── frontend/                   # Frontend testing (Jest + React Testing Library)
│   ├── unit/                  # Component unit tests
│   │   └── components/        # Individual component tests
│   ├── integration/           # Page and flow tests
│   │   └── pages/            # Next.js page tests
│   ├── fixtures/             # Test data and mock responses
│   └── helpers/              # Test utilities and setup
├── e2e/                       # End-to-end tests (Playwright)
│   ├── tests/                # E2E test scenarios
│   ├── fixtures/             # Test data for E2E
│   └── helpers/              # E2E utilities and page objects
└── shared/                    # Shared testing utilities
    ├── mocks/                # Common mocks and stubs
    └── utils/                # Cross-platform test utilities
```

## 🛠 Technology Stack

### Backend Testing
- **Framework:** Jest with TypeScript support
- **Utilities:** Supertest for API testing, ts-jest for TypeScript
- **Mocking:** Jest mocks for external services
- **Coverage:** Istanbul via Jest

### Frontend Testing
- **Framework:** Jest + React Testing Library
- **Utilities:** @testing-library/jest-dom, @testing-library/user-event
- **Mocking:** MSW (Mock Service Worker) for API mocking
- **Coverage:** Istanbul via Jest

### End-to-End Testing
- **Framework:** Playwright
- **Browsers:** Chromium, Firefox, Safari
- **Utilities:** Page Object Model pattern

## 🚀 Quick Start

### Running Tests

```bash
# Backend tests only
cd backend && npm test

# Frontend tests only  
cd frontend && npm test

# All unit and integration tests
npm run test:all

# E2E tests
npm run test:e2e

# Generate coverage reports
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Writing Tests

#### 1. Backend Unit Tests
```typescript
// tests/backend/unit/services/ParserService.test.ts
import { ParserService } from '../../../backend/src/services/ParserService';

describe('ParserService', () => {
  let parserService: ParserService;

  beforeEach(() => {
    parserService = new ParserService();
  });

  describe('parseWatchHistory', () => {
    it('should parse valid HTML correctly', () => {
      const html = '<div>Sample HTML</div>';
      const result = parserService.parseWatchHistory(html);
      expect(result).toBeDefined();
    });
  });
});
```

#### 2. Frontend Component Tests
```typescript
// tests/frontend/unit/components/FileUpload.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { FileUpload } from '../../../frontend/src/components/FileUpload';

describe('FileUpload Component', () => {
  it('renders upload area correctly', () => {
    render(<FileUpload onFileSelect={jest.fn()} />);
    expect(screen.getByText(/drag.*drop/i)).toBeInTheDocument();
  });

  it('handles file selection', () => {
    const mockOnFileSelect = jest.fn();
    render(<FileUpload onFileSelect={mockOnFileSelect} />);
    
    const file = new File(['content'], 'test.html', { type: 'text/html' });
    const input = screen.getByLabelText(/file upload/i);
    
    fireEvent.change(input, { target: { files: [file] } });
    expect(mockOnFileSelect).toHaveBeenCalledWith(file);
  });
});
```

#### 3. E2E Tests
```typescript
// tests/e2e/tests/upload-flow.spec.ts
import { test, expect } from '@playwright/test';

test('complete upload and analysis flow', async ({ page }) => {
  await page.goto('/');
  
  // Upload file
  await page.setInputFiles('input[type="file"]', 'tests/e2e/fixtures/sample-history.html');
  
  // Wait for processing
  await expect(page.locator('[data-testid="processing-status"]')).toBeVisible();
  
  // Verify results
  await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible();
});
```

## 📊 Test Categories

### 🔧 Unit Tests
**Purpose:** Test individual functions and classes in isolation

**Coverage Target:** 90%+ for business logic

**Focus Areas:**
- Service methods (data parsing, API calls, analytics calculations)
- Utility functions (date formatting, data transformation)
- Component rendering and user interactions
- Edge cases and error handling

### 🔗 Integration Tests
**Purpose:** Test interactions between different parts of the system

**Coverage Target:** 80%+ for critical paths

**Focus Areas:**
- API endpoints with database operations
- Service layer interactions
- Frontend page rendering with API calls
- File upload and processing workflows

### 🌐 End-to-End Tests
**Purpose:** Test complete user journeys

**Coverage Target:** 100% of critical user flows

**Focus Areas:**
- Complete upload and analysis workflow
- Dashboard navigation and filtering
- Error scenarios and recovery
- Performance under load

## 🎯 Testing Guidelines

### Best Practices

1. **Test Naming:** Use descriptive names that explain what is being tested
2. **Arrange-Act-Assert:** Structure tests clearly with setup, action, and verification
3. **Independence:** Each test should be independent and not rely on others
4. **Mocking:** Mock external dependencies but avoid over-mocking
5. **Data:** Use realistic test data that represents actual usage

### Do's and Don'ts

✅ **DO:**
- Test edge cases and error conditions
- Use meaningful test data
- Keep tests simple and focused
- Mock external APIs and services
- Test user-facing behavior, not implementation details

❌ **DON'T:**
- Test implementation details that may change
- Write flaky tests that fail intermittently
- Use production data in tests
- Skip testing error paths
- Make tests dependent on each other

## 🔧 Configuration

### Jest Configuration (Backend)
Located in `backend/package.json`:
```json
{
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "testMatch": ["**/tests/**/*.test.ts"],
    "collectCoverageFrom": [
      "src/**/*.ts",
      "!src/**/*.test.ts",
      "!src/index.ts"
    ]
  }
}
```

### Jest Configuration (Frontend)
Located in `frontend/jest.config.js`:
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/frontend/helpers/setup.ts'],
  testMatch: ['**/tests/**/*.test.{ts,tsx}'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
```

### Playwright Configuration
Located in `tests/e2e/playwright.config.ts`:
```typescript
export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } }
  ]
});
```

## 📈 Coverage Targets

- **Overall Coverage:** 85%+
- **Business Logic:** 95%+
- **UI Components:** 80%+
- **API Endpoints:** 90%+
- **Critical User Flows:** 100%

## 🚨 Continuous Integration

Tests are integrated into the CI/CD pipeline with:
- All tests must pass before merging
- Coverage reports generated for each PR
- E2E tests run on staging environment
- Performance tests for critical endpoints

## 🔄 Test Maintenance

### Regular Tasks
- Update test data when schema changes
- Review and update mocks when APIs change
- Refactor tests when code structure changes
- Add tests for new features
- Remove tests for deprecated features

### Monitoring
- Track test execution times
- Monitor flaky test patterns
- Review coverage trends
- Update testing tools and dependencies

## 📞 Getting Help

For questions about testing:
1. Check this documentation first
2. Look at existing test examples
3. Ask in the #testing channel
4. Review the test PR templates

---

*This testing framework is designed to ensure high-quality, maintainable code while supporting rapid development cycles.*