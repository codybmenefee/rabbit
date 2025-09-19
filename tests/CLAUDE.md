# Testing Directory

## Purpose
Comprehensive testing suite including unit tests, integration tests, and E2E tests. Ensures code quality, functionality, and user experience.

## Quick Commands
- `npm run test` - Run all tests
- `npm run test:unit` - Run unit tests only
- `npm run test:e2e` - Run E2E tests only
- `npm run test:watch` - Run tests in watch mode

## Conventions

### Test Organization
- `unit/` - Unit tests for individual functions and components
- `e2e/` - End-to-end tests for complete user workflows
- `fixtures/` - Test data and mock files
- Co-locate tests with source files when appropriate

### Naming Conventions
- Test files: `*.test.ts` or `*.spec.ts`
- Describe blocks: Use clear, descriptive names
- Test cases: Follow "should [expected behavior] when [condition]"

### Test Structure
```typescript
describe('ComponentName', () => {
  describe('when [condition]', () => {
    it('should [expected behavior]', () => {
      // Arrange
      const props = { /* test props */ }
      
      // Act
      const result = renderComponent(props)
      
      // Assert
      expect(result).toBe(expected)
    })
  })
})
```

## Dependencies
- Playwright for E2E tests
- Jest for unit tests
- React Testing Library for component tests
- Test fixtures for consistent data

## Testing Strategies

### Unit Tests
- Test individual functions and components
- Use mock data from fixtures
- Aim for >80% code coverage
- Test edge cases and error conditions

### Integration Tests
- Test component interactions
- Test data flow between modules
- Test API integrations
- Test error handling

### E2E Tests
- Test complete user workflows
- Use real browser automation
- Test across different browsers
- Test responsive design

## Test Data
- Use fixtures in `fixtures/` directory
- Keep test data minimal but realistic
- Use factories for generating test data
- Avoid hardcoded test values

## Common Patterns

### Component Testing
```typescript
import { render, screen } from '@testing-library/react'
import { Component } from '@/components/Component'

describe('Component', () => {
  it('should render with data', () => {
    const mockData = generateMockData()
    render(<Component data={mockData} />)
    
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })
})
```

### Function Testing
```typescript
import { parseYouTubeHistory } from '@/lib/parsers'

describe('parseYouTubeHistory', () => {
  it('should parse valid HTML', () => {
    const html = readFixture('valid-history.html')
    const result = parseYouTubeHistory(html)
    
    expect(result).toHaveLength(expectedCount)
    expect(result[0]).toMatchObject(expectedRecord)
  })
})
```

### E2E Testing
```typescript
import { test, expect } from '@playwright/test'

test('user can upload and view data', async ({ page }) => {
  await page.goto('/')
  await page.setInputFiles('input[type="file"]', 'fixtures/sample-data.html')
  await page.click('button[type="submit"]')
  
  await expect(page.locator('[data-testid="dashboard"]')).toBeVisible()
})
```

## Performance Testing
- Test with large datasets
- Measure parsing performance
- Test memory usage
- Test rendering performance

## Accessibility Testing
- Test keyboard navigation
- Test screen reader compatibility
- Test color contrast
- Test focus management

## Pitfalls
1. **Don't test implementation details** - Test behavior, not internals
2. **Don't use brittle selectors** - Use data-testid attributes
3. **Don't skip error cases** - Test failure scenarios
4. **Don't ignore async operations** - Use proper async/await
5. **Don't forget cleanup** - Clean up after tests

## Links
- [Testing Guide](../docs/development/testing.md)
- [Test Fixtures](./fixtures/)
- [Playwright Config](../playwright.config.ts)
- [Jest Config](../jest.config.js)