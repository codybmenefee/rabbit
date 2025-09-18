# Migration Guide: YouTube Analytics → Rabbit Platform

This guide helps developers migrate from the old YouTube-specific structure to the new platform-agnostic Rabbit architecture.

## 🎯 What Changed

### Directory Structure
- **Old**: `youtube-analytics/` (single app)
- **New**: `rabbit/` (monorepo with multiple packages)

### Key Improvements
1. **Platform Agnostic**: Core logic separated from platform-specific code
2. **Monorepo Structure**: Better organization for multiple platforms
3. **Cleaner Architecture**: Clear separation of concerns
4. **Scalable**: Easy to add new platforms (Spotify, podcasts, etc.)

## 📁 File Mapping

### Old → New Structure

| Old Location | New Location | Notes |
|--------------|--------------|-------|
| `youtube-analytics/lib/parser.ts` | `platforms/youtube/parsers/youtube-parser.ts` | Refactored with base interface |
| `youtube-analytics/lib/aggregations.ts` | `packages/core/analytics/aggregations/base-aggregations.ts` | Platform-agnostic base |
| `youtube-analytics/lib/advanced-analytics.ts` | `platforms/youtube/analytics/youtube-analytics.ts` | YouTube-specific analytics |
| `youtube-analytics/types/records.ts` | `packages/core/types/index.ts` | Base types |
| `youtube-analytics/types/records.ts` | `platforms/youtube/types/index.ts` | YouTube-specific types |
| `youtube-analytics/components/` | `apps/web/components/` | Moved to web app |
| `youtube-analytics/app/` | `apps/web/app/` | Moved to web app |

## 🔄 Migration Steps

### 1. Update Imports

**Old imports:**
```typescript
import { WatchRecord } from '@/types/records'
import { YouTubeHistoryParser } from '@/lib/parser'
import { computeKPIs } from '@/lib/aggregations'
```

**New imports:**
```typescript
import { BaseMediaRecord } from '@rabbit/core/types'
import { YouTubeRecord } from '@rabbit/youtube/types'
import { YouTubeParser } from '@rabbit/youtube/parsers'
import { BaseAggregations } from '@rabbit/core/analytics'
import { YouTubeAnalyticsEngine } from '@rabbit/youtube/analytics'
```

### 2. Update Type Usage

**Old:**
```typescript
interface WatchRecord {
  id: string
  watchedAt: string | null
  videoTitle: string | null
  channelTitle: string | null
  product: 'YouTube' | 'YouTube Music'
  topics: string[]
  // ... computed fields
}
```

**New:**
```typescript
interface YouTubeRecord extends BaseMediaRecord {
  platform: 'YouTube'
  product: 'YouTube' | 'YouTube Music'
  channelTitle: string | null
  videoTitle: string | null
  // ... other fields
}
```

### 3. Update Parser Usage

**Old:**
```typescript
const parser = new YouTubeHistoryParser()
const records = await parser.parseHTML(htmlContent)
```

**New:**
```typescript
const parser = new YouTubeParser()
const result = await parser.parse(file)
const records = result.records
```

### 4. Update Analytics Usage

**Old:**
```typescript
import { computeKPIs, computeYoYComparison } from '@/lib/aggregations'

const kpis = computeKPIs(records, filters)
const yoy = computeYoYComparison(records, filters)
```

**New:**
```typescript
import { BaseAggregations } from '@rabbit/core/analytics'
import { YouTubeAnalyticsEngine } from '@rabbit/youtube/analytics'

const kpis = BaseAggregations.computeKPIs(records, filters)
const youtubeKpis = YouTubeAnalyticsEngine.computeYouTubeKPIs(records, filters)
const yoy = BaseAggregations.computeYoYComparison(records, filters)
```

## 🧹 Cleanup Tasks

### Files to Remove
- `lib/parser.worker.ts` (replaced by new parser structure)
- `lib/parser-core.ts` (functionality moved to new parsers)
- `lib/mock-data.ts` (use demo data from packages)
- `lib/demo-data.ts` (use demo data from packages)
- `lib/fixtures.ts` (use test fixtures from tests/)

### Files to Update
- All component imports
- All type definitions
- All analytics functions
- All parser usage

## 🚀 Benefits of New Structure

### 1. Platform Agnostic
- Core logic works across all platforms
- Easy to add new platforms (Spotify, podcasts, etc.)
- Consistent API across platforms

### 2. Better Organization
- Clear separation of concerns
- Easier to find and maintain code
- Better testability

### 3. Scalability
- Monorepo structure supports multiple apps
- Shared packages reduce duplication
- Independent platform development

### 4. Developer Experience
- Better TypeScript support
- Clearer interfaces and contracts
- Easier to understand and contribute

## 🔧 Development Commands

### Old Commands
```bash
cd youtube-analytics
npm run dev
npm run build
npm run test
```

### New Commands
```bash
# From root directory
npm run dev          # Start web app
npm run build        # Build web app
npm run test         # Run tests
npm run lint         # Run linting
npm run type-check   # Type checking
```

## 📚 Next Steps

1. **Update all imports** to use new package structure
2. **Remove old files** that are no longer needed
3. **Update components** to use new types and functions
4. **Test thoroughly** to ensure everything works
5. **Update documentation** to reflect new structure

## 🆘 Need Help?

- Check the [Architecture Guide](architecture/)
- Review the [API Reference](api/)
- Ask questions in [Discussions](https://github.com/your-org/rabbit/discussions)
- Create an [Issue](https://github.com/your-org/rabbit/issues) for bugs

---

This migration brings Rabbit to a more scalable, maintainable, and extensible architecture that will support our vision of becoming a comprehensive media analytics platform.
