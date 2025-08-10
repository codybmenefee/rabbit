# Aggregations & Filters Module

This module provides pure functions for computing insights from normalized YouTube watch history records and applying various filters.

## Core Functions

### Data Processing

#### `applyFilters(records: WatchRecord[], filters: FilterOptions): WatchRecord[]`
Applies timeframe, product, topic, and channel filters to watch records.

**Supported Filters:**
- `timeframe`: MTD, QTD, YTD, Last6M, Last12M, All
- `product`: YouTube, YouTube Music, All  
- `topics`: Array of topic strings for inclusion filtering
- `channels`: Array of channel names for inclusion filtering
- `searchTerm`: Text search across video titles and channel names

**Edge Case Handling:**
- Records with null `watchedAt` are excluded from timeframe filtering
- Missing channel titles are handled gracefully
- Empty topic arrays are preserved

#### `normalizeWatchRecord(rawData, id?): WatchRecord`
Converts raw parsed data into normalized WatchRecord format with derived fields.

**Derived Fields:**
- `topics`: Auto-classified using keyword patterns
- `year`, `month`, `week`, `dayOfWeek`, `hour`: Extracted from timestamp
- `yoyKey`: YYYY-MM format for year-over-year comparisons
- `product`: Standardized to 'YouTube' or 'YouTube Music'

**Input Edge Cases:**
- Null/missing timestamps → null date fields
- Private videos → null videoId/videoUrl
- Missing channel info → 'Unknown Channel' default
- Non-ASCII characters → preserved as-is

### Aggregation Functions

#### `computeKPIMetrics(records, filters): KPIMetrics`
Computes key performance indicators with year-over-year deltas.

**Returns:**
- `totalVideos`: Count after filters applied
- `uniqueChannels`: Distinct channel count
- `ytdVideos`, `mtdVideos`, `qtdVideos`: Period-specific counts
- `ytdYoyDelta`, `mtdYoyDelta`, `qtdYoyDelta`: Percentage change vs previous year

**YoY Calculation Logic:**
- Compares current period (YTD/MTD/QTD) to same period previous year
- Returns 0% if no previous year data
- Returns 100% if previous year had 0 and current > 0

#### `computeMonthlyTrend(records, filters): MonthlyCount[]`
Aggregates video counts by month with metadata.

**Returns Array of:**
- `month`: "MMM yyyy" format (e.g., "Jan 2024")
- `videos`: Unique video count for the month
- `watchTime`: Estimated (videos × 300 seconds)
- `uniqueChannels`: Distinct channels watched that month

**Sorting:** Chronological order (oldest to newest)

#### `computeTopChannels(records, filters, limit): ChannelMetrics[]`
Ranks channels by video count with percentage breakdown.

**Returns Array of:**
- `channel`: Channel name
- `videoCount`: Total videos watched
- `watchTime`: Estimated total (count × 300 seconds) 
- `percentage`: Share of total filtered videos

**Sorting:** Descending by video count
**Default Limit:** 10 channels

#### `computeDayTimeHeatmap(records, filters): DayHourMatrix[]`
Generates 7×24 matrix of watch activity by day of week and hour.

**Returns Array of 168 objects:**
- `day`: Day name ("Sun" through "Sat")
- `hour`: Hour 0-23
- `value`: Count of videos watched at that day/hour

**Missing Data:** Hours with no activity return `value: 0`

#### `computeTopicsLeaderboard(records, filters): TopicCount[]`
Ranks derived topics with trend analysis.

**Returns Array of:**
- `topic`: Topic name (e.g., "Technology", "Finance")
- `count`: Total videos in this topic
- `percentage`: Share of total topic mentions
- `trend`: "up" | "down" | "stable" vs previous month

**Trend Logic:**
- "up": >10% increase vs previous month
- "down": >10% decrease vs previous month
- "stable": within ±10%

### Topic Classification

#### `deriveTopics(title: string, channel: string): string[]`
Classifies content into topics using keyword pattern matching.

**Supported Topics:**
- Technology, Finance, Politics, Entertainment, Education
- Gaming, Music, Sports, News, Science, Cooking, Travel
- "Other" (fallback for unmatched content)

**Pattern Matching:**
- Case-insensitive regex patterns
- Searches both video title and channel name
- Multiple topics can be assigned to single video
- Comprehensive keyword coverage per topic

**Examples:**
- "JavaScript Tutorial" + "Code Academy" → ["Technology"]
- "Bitcoin Analysis" + "Crypto News" → ["Finance"]  
- "Cooking Pasta" + "Chef's Kitchen" → ["Cooking"]

## Data Contracts

### Input: WatchRecord
```typescript
{
  id: string
  watchedAt: string | null          // ISO timestamp
  videoId: string | null
  videoTitle: string | null
  videoUrl: string | null
  channelTitle: string | null
  channelUrl: string | null
  product: 'YouTube' | 'YouTube Music'
  topics: string[]                  // Derived classifications
  year: number | null               // Extracted from watchedAt
  month: number | null              // 1-12
  week: number | null               // Week of month
  dayOfWeek: number | null          // 0=Sunday, 6=Saturday  
  hour: number | null               // 0-23
  yoyKey: string | null             // "YYYY-MM" format
  rawTimestamp?: string             // Original timestamp text
}
```

### Output: Aggregation Results
All aggregation functions return deterministic results for the same input. Results include metadata about filtering and date ranges where applicable.

## Error Handling

- **Invalid Dates**: Parsed as null, excluded from time-based aggregations
- **Missing Data**: Gracefully handled with null checks and defaults
- **Empty Arrays**: Return empty results rather than throwing errors
- **Division by Zero**: YoY deltas handle zero denominators appropriately

## Performance Notes

- All functions are pure (no side effects)
- O(n) complexity for most aggregations where n = filtered record count
- Day/time heatmap always returns 168 data points regardless of input size
- Topic derivation uses efficient regex caching

## Testing

Comprehensive fixtures available in `fixtures.ts`:
- Edge cases: Private videos, missing timestamps, Unicode text
- Time variations: Different hours, days, boundary dates  
- YoY comparisons: Multi-year datasets for delta calculations
- Development data: Realistic 200+ record synthetic dataset

Run tests with: `npm run test:aggregations` (if test script configured)

## Integration with Dashboard

These functions are designed to be called from React components via:
1. Loading normalized records from storage
2. Applying user-selected filters via UI controls
3. Computing required aggregations for visualization
4. Passing results to chart components (Recharts)

All functions return data in formats compatible with the established chart component props.