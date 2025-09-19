# Deprecated Code Analysis and Removal Plan

## Overview

This document identifies all code that will become deprecated with the implementation of the pre-computation service and provides a detailed plan for migration and removal.

## Deprecated Code Categories

### 1. Client-side Aggregation Functions

#### Files to be Deprecated
- `lib/aggregations.ts` - Main aggregation functions
- `lib/channel-aggregations.ts` - Channel-specific aggregations
- `lib/topic-aggregations.ts` - Topic-specific aggregations

#### Functions to be Deprecated

**From `lib/aggregations.ts`:**
```typescript
// These functions will be moved to the pre-computation service
export function computeKPIMetrics(records: WatchRecord[], filters: FilterOptions): KPIMetrics
export function computeMonthlyTrend(records: WatchRecord[], filters: FilterOptions): MonthlyCount[]
export function computeTopChannels(records: WatchRecord[], filters: FilterOptions, limit: number = 10): ChannelMetrics[]
export function computeDayTimeHeatmap(records: WatchRecord[], filters: FilterOptions): DayHourMatrix[]
export function computeTopicsLeaderboard(records: WatchRecord[], filters: FilterOptions): TopicCount[]
export function computeHistoryAnalytics(records: WatchRecord[])
export function computeSessionAnalysis(records: WatchRecord[])
export function computeViewingPatterns(records: WatchRecord[])
```

**From `lib/channel-aggregations.ts`:**
```typescript
export function computeEnhancedChannelMetrics(records: WatchRecord[], filters?: FilterOptions): EnhancedChannelMetrics[]
export function computeChannelRelationships(records: WatchRecord[]): ChannelRelationship[]
export function computeChannelEvolution(records: WatchRecord[], channelTitle: string): ChannelEvolution
```

**From `lib/topic-aggregations.ts`:**
```typescript
export function computeTopicEvolution(records: WatchRecord[], filters: FilterOptions): TopicEvolutionData[]
export function computeTopicQualityMetrics(records: WatchRecord[], filters: FilterOptions): TopicQualityMetrics[]
export function computeTopicRecommendationImpact(records: WatchRecord[], filters: FilterOptions): TopicRecommendationImpact[]
export function computeTopicDiversityMetrics(records: WatchRecord[], filters: FilterOptions): TopicDiversityMetrics
```

### 2. Client-side Data Processing Utilities

#### Functions to be Deprecated
```typescript
// From lib/aggregations.ts
function parseFlexibleTimestamp(value?: string | null): Date | null
function getWatchDate(record: WatchRecord): Date | null
function resolveTimestamp(watchedAt?: string | null, rawTimestamp?: string | null): { isoString: string | null; date: Date | null }
function applyFilters(records: WatchRecord[], filters: FilterOptions): WatchRecord[]
function calculatePercentageChange(current: number, previous: number): number
function deriveTopics(title: string, channel: string): string[]
function normalizeWatchRecord(rawData: any, id?: string): WatchRecord
```

### 3. Component-level Aggregation Logic

#### Files to be Modified
- `components/dashboard/main-dashboard.tsx`
- `components/analytics/analytics-dashboard.tsx`
- `components/history/history-insights.tsx`
- `components/channels/channel-portfolio-view.tsx`
- `components/channels/channel-discovery-analysis.tsx`
- `components/channels/channel-relationship-analysis.tsx`
- `components/topics/topic-portfolio-dashboard.tsx`
- `components/topics/content-quality-metrics.tsx`
- `components/topics/interest-evolution-chart.tsx`
- `components/topics/recommendation-impact-analysis.tsx`

#### Code Patterns to be Replaced

**Current Pattern (to be deprecated):**
```typescript
// In components
const analytics = useMemo(() => {
  try {
    const kpiMetrics = computeKPIMetrics(data, filters)
    const monthlyTrend = computeMonthlyTrend(data, filters)
    const topChannels = computeTopChannels(data, filters, 10)
    // ... more computations
    return {
      kpiMetrics,
      monthlyTrend,
      topChannels
    }
  } catch (error) {
    console.error('Error computing analytics:', error)
    return defaultAnalytics
  }
}, [data, filters])
```

**New Pattern (replacement):**
```typescript
// In components
const kpiMetrics = useAggregation('kpi', filters)
const monthlyTrend = useAggregation('monthly_trend', filters)
const topChannels = useAggregation('top_channels', filters)
```

### 4. Type Definitions to be Updated

#### Types to be Moved/Updated
```typescript
// Move these to services/types.ts
export interface AggregationResult {
  data: any
  computedAt: Date
  expiresAt: Date
  version: number
  source: 'precomputed' | 'client-side'
}

export interface PrecomputedAggregation {
  id: string
  userId: string
  aggregationType: AggregationType
  filterHash: string
  data: any
  computedAt: string
  expiresAt: string
  version: number
  metadata: any
}

export type AggregationType = 
  | 'kpi'
  | 'monthly_trend'
  | 'top_channels'
  | 'day_time_heatmap'
  | 'topics_leaderboard'
  | 'session_analysis'
  | 'viewing_patterns'
  | 'enhanced_channel_metrics'
  | 'channel_relationships'
  | 'topic_evolution'
  | 'topic_quality_metrics'
  | 'topic_recommendation_impact'
  | 'topic_diversity_metrics'
```

## Migration Strategy

### Phase 1: Mark as Deprecated (Week 1)

#### 1.1 Add Deprecation Warnings
```typescript
// lib/aggregations.ts
/**
 * @deprecated This function will be removed in v2.0.0. Use the pre-computation service instead.
 * @see {@link https://docs.example.com/migration-guide}
 */
export function computeKPIMetrics(records: WatchRecord[], filters: FilterOptions): KPIMetrics {
  console.warn('computeKPIMetrics is deprecated. Use the pre-computation service instead.')
  // ... existing implementation
}
```

#### 1.2 Create Migration Hooks
```typescript
// hooks/useAggregation.ts
export function useAggregation<T>(
  type: AggregationType,
  filters: FilterOptions
): {
  data: T | null
  loading: boolean
  error: string | null
  source: 'precomputed' | 'client-side'
} {
  // Implementation that can fallback to deprecated functions
}
```

### Phase 2: Gradual Migration (Weeks 2-4)

#### 2.1 Update Components
```typescript
// components/dashboard/main-dashboard.tsx
export function MainDashboard({ data }: MainDashboardProps) {
  const [filters, setFilters] = useState<FilterOptions>({
    timeframe: 'All',
    product: 'All',
    topics: [],
    channels: []
  })

  // Replace useMemo with new hooks
  const kpiMetrics = useAggregation('kpi', filters)
  const monthlyTrend = useAggregation('monthly_trend', filters)
  const topChannels = useAggregation('top_channels', filters)
  const dayTimeHeatmap = useAggregation('day_time_heatmap', filters)
  const topicsLeaderboard = useAggregation('topics_leaderboard', filters)

  // Rest of component remains the same
  return (
    <div className="dashboard">
      {/* Component JSX */}
    </div>
  )
}
```

#### 2.2 Create Service Layer
```typescript
// services/aggregation-service.ts
export class AggregationService {
  async getAggregation(
    userId: string,
    type: AggregationType,
    filters: FilterOptions
  ): Promise<AggregationResult> {
    // Try pre-computed first
    const precomputed = await this.getPrecomputedAggregation(userId, type, filters)
    if (precomputed) {
      return precomputed
    }

    // Fallback to client-side computation
    return await this.getClientSideAggregation(userId, type, filters)
  }

  private async getClientSideAggregation(
    userId: string,
    type: AggregationType,
    filters: FilterOptions
  ): Promise<AggregationResult> {
    // Use deprecated functions as fallback
    const records = await this.getUserRecords(userId)
    
    switch (type) {
      case 'kpi':
        return {
          data: computeKPIMetrics(records, filters),
          computedAt: new Date(),
          expiresAt: new Date(Date.now() + 300000), // 5 minutes
          version: 1,
          source: 'client-side'
        }
      // ... other cases
    }
  }
}
```

### Phase 3: Remove Deprecated Code (Weeks 5-6)

#### 3.1 Remove Deprecated Functions
```typescript
// lib/aggregations.ts - Remove these functions
// export function computeKPIMetrics(...) - REMOVED
// export function computeMonthlyTrend(...) - REMOVED
// export function computeTopChannels(...) - REMOVED
// export function computeDayTimeHeatmap(...) - REMOVED
// export function computeTopicsLeaderboard(...) - REMOVED
// export function computeHistoryAnalytics(...) - REMOVED
// export function computeSessionAnalysis(...) - REMOVED
// export function computeViewingPatterns(...) - REMOVED

// Keep only utility functions that are still needed
export function normalizeWatchRecord(rawData: any, id?: string): WatchRecord {
  // Keep this as it's used for data ingestion
}
```

#### 3.2 Remove Deprecated Files
```bash
# Remove these files after migration
rm lib/aggregations.ts
rm lib/channel-aggregations.ts
rm lib/topic-aggregations.ts
```

#### 3.3 Update Imports
```typescript
// Update all imports from deprecated files
// OLD:
import { computeKPIMetrics } from '@/lib/aggregations'

// NEW:
import { useAggregation } from '@/hooks/useAggregation'
```

## Code Removal Checklist

### Files to Remove Completely
- [ ] `lib/aggregations.ts` - Move functions to services
- [ ] `lib/channel-aggregations.ts` - Move functions to services
- [ ] `lib/topic-aggregations.ts` - Move functions to services

### Functions to Remove
- [ ] `computeKPIMetrics` - Move to services
- [ ] `computeMonthlyTrend` - Move to services
- [ ] `computeTopChannels` - Move to services
- [ ] `computeDayTimeHeatmap` - Move to services
- [ ] `computeTopicsLeaderboard` - Move to services
- [ ] `computeHistoryAnalytics` - Move to services
- [ ] `computeSessionAnalysis` - Move to services
- [ ] `computeViewingPatterns` - Move to services
- [ ] `computeEnhancedChannelMetrics` - Move to services
- [ ] `computeChannelRelationships` - Move to services
- [ ] `computeChannelEvolution` - Move to services
- [ ] `computeTopicEvolution` - Move to services
- [ ] `computeTopicQualityMetrics` - Move to services
- [ ] `computeTopicRecommendationImpact` - Move to services
- [ ] `computeTopicDiversityMetrics` - Move to services

### Utility Functions to Keep
- [ ] `normalizeWatchRecord` - Keep for data ingestion
- [ ] `parseFlexibleTimestamp` - Move to services
- [ ] `getWatchDate` - Move to services
- [ ] `resolveTimestamp` - Move to services
- [ ] `applyFilters` - Move to services
- [ ] `calculatePercentageChange` - Move to services
- [ ] `deriveTopics` - Move to services

### Components to Update
- [ ] `components/dashboard/main-dashboard.tsx`
- [ ] `components/analytics/analytics-dashboard.tsx`
- [ ] `components/history/history-insights.tsx`
- [ ] `components/channels/channel-portfolio-view.tsx`
- [ ] `components/channels/channel-discovery-analysis.tsx`
- [ ] `components/channels/channel-relationship-analysis.tsx`
- [ ] `components/topics/topic-portfolio-dashboard.tsx`
- [ ] `components/topics/content-quality-metrics.tsx`
- [ ] `components/topics/interest-evolution-chart.tsx`
- [ ] `components/topics/recommendation-impact-analysis.tsx`

## Testing Strategy for Deprecated Code

### Before Removal
- [ ] Ensure all functions have equivalent implementations in services
- [ ] Test that new hooks return same data as deprecated functions
- [ ] Verify performance improvements
- [ ] Test error handling and edge cases

### During Migration
- [ ] Run both old and new code in parallel
- [ ] Compare results for consistency
- [ ] Monitor performance metrics
- [ ] Test rollback procedures

### After Removal
- [ ] Verify no broken imports
- [ ] Test all components still work
- [ ] Check for any remaining references to deprecated code
- [ ] Validate performance improvements

## Rollback Plan for Deprecated Code

### Immediate Rollback
1. Restore deprecated functions from git history
2. Update components to use deprecated functions
3. Remove new service implementations
4. Test system functionality

### Partial Rollback
1. Restore specific deprecated functions
2. Update specific components
3. Keep some new implementations
4. Gradual re-migration

## Documentation Updates

### Code Documentation
- [ ] Update function documentation
- [ ] Add migration guides
- [ ] Update API documentation
- [ ] Create deprecation notices

### User Documentation
- [ ] Update user guides
- [ ] Create migration tutorials
- [ ] Update troubleshooting guides
- [ ] Create performance comparison charts

## Performance Impact

### Before Removal
- Client-side computation: 2-5 seconds
- Memory usage: 50-100MB
- CPU usage: High during computation
- Bundle size: Large due to aggregation functions

### After Removal
- Pre-computed data: 200-500ms
- Memory usage: 10-20MB
- CPU usage: Minimal
- Bundle size: Reduced by ~50KB

## Security Considerations

### Data Privacy
- Ensure pre-computed data is properly encrypted
- Implement access controls for aggregated data
- Audit data access and usage

### Code Security
- Remove any hardcoded secrets from deprecated code
- Ensure new service has proper authentication
- Implement rate limiting and abuse prevention

This comprehensive analysis ensures a clean migration away from deprecated code while maintaining system functionality and performance.
