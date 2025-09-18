# Test Fixtures and Sample Data

This directory contains test data and QA resources for the YouTube Analytics prototype.

## Files Overview

### Sample Data Files

- **`watch-history.sample.html`** - Reduced Google Takeout file with 300 entries
  - Based on actual watch history structure
  - Safe for development testing without exposing real user data
  - ~220KB file size (vs ~18MB original)
  - Contains variety of YouTube entries and timestamps

### Edge Case Test Data (JSON)

- **`edge-cases.json`** - Normal usage scenarios with complete data
- **`missing-data-cases.json`** - Private videos, missing URLs, non-ASCII characters
- **`time-variations.json`** - Different timestamp formats, boundary conditions

### QA Documentation

- **`QA_CHECKLIST.md`** - Comprehensive testing checklist for reviewers
- **`MANUAL_QA_FLOWS.md`** - Quick testing flows for developers

## Using Test Data

### In Development

The app includes developer controls (DEV button in bottom-right) when running in development mode:

```bash
npm run dev
# Look for yellow "DEV" button in browser
```

### Loading Sample Data

- **Load Test Fixtures**: Loads edge case data from JSON files
- **Load Sample Data**: Generates 200 realistic records spanning 6 months
- **Clear All Data**: Resets application state

### Manual HTML File Testing

You can also drag and drop `watch-history.sample.html` directly into the upload area to test the full import flow.

## Test Data Characteristics

### watch-history.sample.html

- **Entry Count**: ~300 records
- **Date Range**: Mixed timestamps from 2025 back to earlier dates
- **Structure**: Preserves original Google Takeout HTML format
- **Content**: Real YouTube video URLs (but shortened sample)

### JSON Fixtures

Each fixture file contains 3 normalized `WatchRecord` objects testing different scenarios:

#### Edge Cases

- Complete data with all fields populated
- YouTube and YouTube Music entries
- Various topic classifications

#### Missing Data Cases

- Entries with null timestamps
- Private/deleted videos (missing URLs)
- Unicode characters in titles
- Missing channel information

#### Time Variations

- Standard ISO timestamps
- Early morning hours (2 AM)
- Year boundary conditions (New Year's Eve)
- Different day-of-week patterns

## Validation

### Sample File Validation

The sample HTML file has been validated to ensure:

- ✅ 81 valid entries extracted
- ✅ 73 unique video URLs
- ✅ All timestamps parse correctly
- ✅ File structure matches original format
- ✅ Safe for automated testing

### JSON Schema Compliance

All JSON fixtures match the `WatchRecord` interface:

```typescript
interface WatchRecord {
  id: string
  watchedAt: string | null
  videoId: string | null
  videoTitle: string | null
  videoUrl: string | null
  channelTitle: string | null
  channelUrl: string | null
  product: 'YouTube' | 'YouTube Music'
  topics: string[]
  year: number | null
  month: number | null
  week: number | null
  dayOfWeek: number | null
  hour: number | null
  yoyKey: string | null
}
```

## Creating New Test Data

### Adding HTML Sample Files

1. Extract entries from large watch-history.html
2. Preserve HTML header and footer structure
3. Keep 200-500 entries for reasonable test size
4. Validate parsing works with existing parser

### Adding JSON Fixtures

1. Follow `WatchRecord` interface exactly
2. Include realistic data patterns
3. Test edge cases your feature needs to handle
4. Add to fixture loading utilities in `lib/fixtures.ts`

## QA Usage

### For Reviewers

1. Use `QA_CHECKLIST.md` for comprehensive testing
2. Load sample data using dev controls
3. Validate against acceptance criteria
4. Document any bugs found

### For Developers

1. Use `MANUAL_QA_FLOWS.md` for quick validation
2. Run flows before committing changes
3. Test with both fixtures and sample HTML
4. Check console for errors during testing

## Performance Notes

- Sample HTML file processes in ~2 seconds locally
- JSON fixtures load instantly
- Full watch-history.html may take 10-30 seconds to parse client-side
- Convex ingestion runs in chunks to avoid large payloads

---

**Note**: All test data is anonymized and safe for version control. No real user data is included in fixtures.
