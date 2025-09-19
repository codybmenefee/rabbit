# Scripts Directory

## Purpose
Development and validation scripts for analytics, performance testing, and data integrity. All scripts are safe for local development and CI/CD.

## Quick Commands
- `npm run validate:all` - Run all validation scripts
- `npm run validate:analytics` - Test analytics functions
- `npm run validate:parsers` - Test data parsers
- `npm run dev:parse` - Debug parsing with sample data
- `npm run dev:perf:worker` - Test worker performance

## Conventions

### Script Organization
- `dev-tools/` - Debug utilities and development helpers
- `validation/` - Data integrity and accuracy validation
- Use `tsx` for TypeScript scripts
- Use `node` for JavaScript scripts
- Keep scripts idempotent and safe

### Error Handling
- Always handle errors gracefully
- Provide clear error messages
- Exit with appropriate codes
- Log errors for debugging

### Performance
- Use efficient algorithms
- Process data in chunks for large datasets
- Provide progress indicators
- Allow for cancellation

## Dependencies
- `tsx` for TypeScript execution
- `date-fns` for date manipulation
- Test fixtures for sample data
- No external API dependencies

## Script Categories

### Validation Scripts
- `validate-analytics.ts` - Test analytics calculations
- `validate-statistical-functions.ts` - Test YoY/QoQ calculations
- `validate-timestamp-extraction.ts` - Test date parsing
- `validation/run-validation.ts` - Run all validations

### Development Tools
- `dev-tools/test-parsing.js` - Debug HTML parsing
- `dev-tools/debug-data.js` - Inspect parsed data
- `dev-tools/performance-test.js` - Test performance
- `dev-tools/test-worker-performance.js` - Test Web Workers

## Common Patterns

### Validation Script
```typescript
import { validateAnalytics } from './validation/analytics'

async function main() {
  try {
    console.log('Starting analytics validation...')
    const result = await validateAnalytics()
    
    if (result.success) {
      console.log('✅ All validations passed')
      process.exit(0)
    } else {
      console.error('❌ Validation failed:', result.errors)
      process.exit(1)
    }
  } catch (error) {
    console.error('Script failed:', error)
    process.exit(1)
  }
}

main()
```

### Development Tool
```typescript
import { parseYouTubeHistory } from '@/lib/parsers'
import { readFixture } from './utils'

async function debugParsing() {
  const html = readFixture('sample-data.html')
  const records = parseYouTubeHistory(html)
  
  console.log(`Parsed ${records.length} records`)
  console.log('Sample record:', records[0])
}
```

## Testing
- Test scripts with sample data
- Verify error handling
- Test with different input formats
- Validate output accuracy

## Performance Guidelines
- Use streaming for large files
- Implement progress reporting
- Allow for memory management
- Test with realistic data sizes

## Pitfalls
1. **Don't modify production data** - Use test fixtures only
2. **Don't ignore errors** - Handle all failure cases
3. **Don't skip validation** - Verify script outputs
4. **Don't use blocking operations** - Use async/await
5. **Don't forget cleanup** - Clean up resources

## Links
- [Validation Scripts](./validation/)
- [Development Tools](./dev-tools/)
- [Test Fixtures](../tests/fixtures/)
- [Analytics Functions](../lib/analytics/)