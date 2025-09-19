# Pre-computation Service Architecture Plan

## Overview

This document outlines the design and implementation plan for a dedicated pre-computation service that will significantly improve frontend performance by pre-calculating aggregations and storing them with timestamps for fast retrieval.

## Current Performance Issues

### Identified Bottlenecks
1. **Client-side computation**: All aggregations computed in React components
2. **Repeated calculations**: Same aggregations recalculated on every filter change
3. **Large dataset processing**: Full dataset processed for each aggregation
4. **Complex timestamp parsing**: Multiple format attempts for each record
5. **Memory intensive operations**: Multiple Map/Set operations and array iterations
6. **No caching**: No persistence of computed results

### Performance Impact
- Dashboard load time: 2-5 seconds with large datasets
- Filter changes: 500ms-2s delay
- Memory usage: 50-100MB for large datasets
- CPU usage: High during aggregation computation

## Architecture Design

### Service Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Pre-computation Service                  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │  Aggregation    │  │  Cache Manager  │  │  Scheduler  │ │
│  │  Engine         │  │                 │  │             │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │  Data Processor │  │  Storage Layer  │  │  API Layer  │ │
│  │                 │  │                 │  │             │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Data Ingestion**: New watch records trigger aggregation updates
2. **Incremental Processing**: Only process new/changed data
3. **Aggregation Computation**: Pre-calculate all possible filter combinations
4. **Storage**: Store results with timestamps and metadata
5. **API Serving**: Fast retrieval of pre-computed results

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1-2)

#### 1.1 Database Schema Extensions
```sql
-- Pre-computed aggregations table
CREATE TABLE precomputed_aggregations (
  id UUID PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  aggregation_type VARCHAR NOT NULL, -- 'kpi', 'monthly_trend', 'top_channels', etc.
  filter_hash VARCHAR NOT NULL, -- Hash of filter combination
  data JSONB NOT NULL, -- Pre-computed result
  computed_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  version INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for fast retrieval
CREATE INDEX idx_precomputed_user_type ON precomputed_aggregations(user_id, aggregation_type);
CREATE INDEX idx_precomputed_filter_hash ON precomputed_aggregations(filter_hash);
CREATE INDEX idx_precomputed_expires ON precomputed_aggregations(expires_at);

-- Data change tracking
CREATE TABLE data_change_log (
  id UUID PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  change_type VARCHAR NOT NULL, -- 'insert', 'update', 'delete'
  record_count INTEGER NOT NULL,
  changed_at TIMESTAMP NOT NULL,
  processed BOOLEAN DEFAULT FALSE
);
```

#### 1.2 Convex Schema Updates
```typescript
// Add to convex/schema.ts
precomputed_aggregations: defineTable({
  userId: v.string(),
  aggregationType: v.string(),
  filterHash: v.string(),
  data: v.any(),
  computedAt: v.string(),
  expiresAt: v.string(),
  version: v.number(),
  metadata: v.optional(v.any())
})
  .index('by_user_type', ['userId', 'aggregationType'])
  .index('by_filter_hash', ['filterHash'])
  .index('by_expires', ['expiresAt']),

data_change_log: defineTable({
  userId: v.string(),
  changeType: v.string(),
  recordCount: v.number(),
  changedAt: v.string(),
  processed: v.boolean()
})
  .index('by_user_processed', ['userId', 'processed'])
  .index('by_changed_at', ['changedAt'])
```

### Phase 2: Aggregation Engine (Week 2-3)

#### 2.1 Core Aggregation Service
```typescript
// services/aggregation-engine.ts
export class AggregationEngine {
  private cache: Map<string, AggregationResult> = new Map()
  private processor: DataProcessor
  private storage: StorageLayer

  async computeAggregation(
    userId: string,
    type: AggregationType,
    filters: FilterOptions
  ): Promise<AggregationResult> {
    const cacheKey = this.generateCacheKey(userId, type, filters)
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }

    // Check persistent storage
    const stored = await this.storage.getAggregation(userId, type, filters)
    if (stored && !this.isExpired(stored)) {
      this.cache.set(cacheKey, stored.data)
      return stored.data
    }

    // Compute new aggregation
    const data = await this.processor.compute(type, filters)
    const result = {
      data,
      computedAt: new Date(),
      expiresAt: this.calculateExpiration(type),
      version: 1
    }

    // Store and cache
    await this.storage.storeAggregation(userId, type, filters, result)
    this.cache.set(cacheKey, data)
    
    return data
  }

  private generateCacheKey(userId: string, type: string, filters: FilterOptions): string {
    return `${userId}:${type}:${this.hashFilters(filters)}`
  }
}
```

#### 2.2 Data Processor
```typescript
// services/data-processor.ts
export class DataProcessor {
  async compute(type: AggregationType, filters: FilterOptions): Promise<any> {
    const records = await this.getFilteredRecords(filters)
    
    switch (type) {
      case 'kpi':
        return this.computeKPIMetrics(records, filters)
      case 'monthly_trend':
        return this.computeMonthlyTrend(records, filters)
      case 'top_channels':
        return this.computeTopChannels(records, filters)
      case 'day_time_heatmap':
        return this.computeDayTimeHeatmap(records, filters)
      case 'topics_leaderboard':
        return this.computeTopicsLeaderboard(records, filters)
      case 'session_analysis':
        return this.computeSessionAnalysis(records)
      case 'viewing_patterns':
        return this.computeViewingPatterns(records)
      case 'enhanced_channel_metrics':
        return this.computeEnhancedChannelMetrics(records, filters)
      case 'channel_relationships':
        return this.computeChannelRelationships(records)
      case 'topic_evolution':
        return this.computeTopicEvolution(records, filters)
      default:
        throw new Error(`Unknown aggregation type: ${type}`)
    }
  }

  private async getFilteredRecords(filters: FilterOptions): Promise<WatchRecord[]> {
    // Optimized data retrieval with database-level filtering
    return await this.database.getFilteredRecords(filters)
  }
}
```

### Phase 3: Caching and Storage (Week 3-4)

#### 3.1 Multi-layer Caching
```typescript
// services/cache-manager.ts
export class CacheManager {
  private memoryCache: Map<string, CachedItem> = new Map()
  private redisClient: Redis
  private storage: StorageLayer

  async get(key: string): Promise<any> {
    // L1: Memory cache
    if (this.memoryCache.has(key)) {
      const item = this.memoryCache.get(key)!
      if (!this.isExpired(item)) {
        return item.data
      }
      this.memoryCache.delete(key)
    }

    // L2: Redis cache
    const redisData = await this.redisClient.get(key)
    if (redisData) {
      const item = JSON.parse(redisData)
      if (!this.isExpired(item)) {
        this.memoryCache.set(key, item)
        return item.data
      }
    }

    // L3: Persistent storage
    const stored = await this.storage.get(key)
    if (stored) {
      this.setMemoryCache(key, stored)
      return stored.data
    }

    return null
  }

  async set(key: string, data: any, ttl: number): Promise<void> {
    const item = {
      data,
      timestamp: Date.now(),
      ttl
    }

    // Set in all layers
    this.memoryCache.set(key, item)
    await this.redisClient.setex(key, ttl, JSON.stringify(item))
    await this.storage.set(key, item)
  }
}
```

#### 3.2 Storage Layer
```typescript
// services/storage-layer.ts
export class StorageLayer {
  async storeAggregation(
    userId: string,
    type: AggregationType,
    filters: FilterOptions,
    result: AggregationResult
  ): Promise<void> {
    const filterHash = this.hashFilters(filters)
    const record = {
      userId,
      aggregationType: type,
      filterHash,
      data: result.data,
      computedAt: result.computedAt.toISOString(),
      expiresAt: result.expiresAt.toISOString(),
      version: result.version,
      metadata: {
        filterCount: this.countActiveFilters(filters),
        recordCount: result.data.totalVideos || 0
      }
    }

    await this.convex.mutation('storePrecomputedAggregation', record)
  }

  async getAggregation(
    userId: string,
    type: AggregationType,
    filters: FilterOptions
  ): Promise<StoredAggregation | null> {
    const filterHash = this.hashFilters(filters)
    return await this.convex.query('getPrecomputedAggregation', {
      userId,
      aggregationType: type,
      filterHash
    })
  }
}
```

### Phase 4: Scheduler and Triggers (Week 4-5)

#### 4.1 Incremental Processing
```typescript
// services/scheduler.ts
export class AggregationScheduler {
  private processor: DataProcessor
  private storage: StorageLayer

  async scheduleIncrementalUpdate(userId: string, changeType: string): Promise<void> {
    // Determine which aggregations need updating
    const affectedTypes = this.getAffectedAggregationTypes(changeType)
    
    for (const type of affectedTypes) {
      await this.scheduleAggregationUpdate(userId, type)
    }
  }

  private getAffectedAggregationTypes(changeType: string): AggregationType[] {
    const mapping = {
      'new_records': ['kpi', 'monthly_trend', 'top_channels', 'topics_leaderboard'],
      'channel_changes': ['top_channels', 'enhanced_channel_metrics', 'channel_relationships'],
      'topic_changes': ['topics_leaderboard', 'topic_evolution'],
      'timestamp_changes': ['day_time_heatmap', 'viewing_patterns', 'session_analysis']
    }
    
    return mapping[changeType] || []
  }

  async scheduleAggregationUpdate(userId: string, type: AggregationType): Promise<void> {
    // Get all filter combinations for this user
    const filterCombinations = await this.getFilterCombinations(userId)
    
    for (const filters of filterCombinations) {
      await this.processor.compute(type, filters)
    }
  }
}
```

#### 4.2 Background Processing
```typescript
// services/background-processor.ts
export class BackgroundProcessor {
  private scheduler: AggregationScheduler
  private isProcessing = false

  async start(): Promise<void> {
    if (this.isProcessing) return
    
    this.isProcessing = true
    
    // Process pending changes every 30 seconds
    setInterval(async () => {
      await this.processPendingChanges()
    }, 30000)

    // Clean expired aggregations every hour
    setInterval(async () => {
      await this.cleanExpiredAggregations()
    }, 3600000)
  }

  private async processPendingChanges(): Promise<void> {
    const pendingChanges = await this.getPendingChanges()
    
    for (const change of pendingChanges) {
      await this.scheduler.scheduleIncrementalUpdate(change.userId, change.changeType)
      await this.markChangeProcessed(change.id)
    }
  }
}
```

### Phase 5: API Layer (Week 5-6)

#### 5.1 Convex Functions
```typescript
// convex/aggregations.ts
export const getPrecomputedAggregation = query({
  args: {
    userId: v.string(),
    aggregationType: v.string(),
    filterHash: v.string()
  },
  handler: async (ctx, { userId, aggregationType, filterHash }) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity?.subject || identity.subject !== userId) {
      throw new Error('UNAUTHORIZED')
    }

    const result = await ctx.db
      .query('precomputed_aggregations')
      .withIndex('by_user_type', q => 
        q.eq('userId', userId).eq('aggregationType', aggregationType)
      )
      .filter(q => q.eq(q.field('filterHash'), filterHash))
      .first()

    if (!result || new Date(result.expiresAt) < new Date()) {
      return null
    }

    return result
  }
})

export const storePrecomputedAggregation = mutation({
  args: {
    userId: v.string(),
    aggregationType: v.string(),
    filterHash: v.string(),
    data: v.any(),
    computedAt: v.string(),
    expiresAt: v.string(),
    version: v.number(),
    metadata: v.optional(v.any())
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('precomputed_aggregations', args)
  }
})
```

#### 5.2 Frontend Integration
```typescript
// hooks/usePrecomputedAggregation.ts
export function usePrecomputedAggregation<T>(
  type: AggregationType,
  filters: FilterOptions
): {
  data: T | null
  loading: boolean
  error: string | null
  lastUpdated: Date | null
} {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const filterHash = useMemo(() => hashFilters(filters), [filters])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const result = await convex.query('getPrecomputedAggregation', {
          userId: getCurrentUserId(),
          aggregationType: type,
          filterHash
        })

        if (result) {
          setData(result.data)
          setLastUpdated(new Date(result.computedAt))
        } else {
          // Fallback to client-side computation
          const computed = await computeAggregationClientSide(type, filters)
          setData(computed)
          setLastUpdated(new Date())
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [type, filterHash])

  return { data, loading, error, lastUpdated }
}
```

## Migration Strategy

### Phase 1: Parallel Implementation
- Implement pre-computation service alongside existing client-side code
- Add feature flag to switch between client-side and pre-computed aggregations
- Gradually migrate components to use pre-computed data

### Phase 2: Data Migration
- Backfill pre-computed aggregations for existing data
- Implement data validation to ensure consistency
- Monitor performance improvements

### Phase 3: Client-side Cleanup
- Remove client-side aggregation functions
- Update components to use pre-computed data only
- Remove unused code and dependencies

## Performance Expectations

### Before (Current)
- Dashboard load: 2-5 seconds
- Filter changes: 500ms-2s
- Memory usage: 50-100MB
- CPU usage: High during computation

### After (Target)
- Dashboard load: 200-500ms
- Filter changes: 50-100ms
- Memory usage: 10-20MB
- CPU usage: Minimal

### Scalability
- Support for 100k+ watch records
- Sub-second response times
- Efficient memory usage
- Horizontal scaling capability

## Monitoring and Maintenance

### Metrics to Track
- Aggregation computation time
- Cache hit/miss rates
- Memory usage
- API response times
- Data freshness

### Maintenance Tasks
- Regular cleanup of expired aggregations
- Performance monitoring and optimization
- Data consistency validation
- Cache invalidation strategies

## Implementation Timeline

- **Week 1-2**: Core infrastructure and database schema
- **Week 3-4**: Aggregation engine and caching
- **Week 5-6**: API layer and frontend integration
- **Week 7-8**: Testing and optimization
- **Week 9-10**: Migration and cleanup

## Risk Mitigation

### Technical Risks
- **Data consistency**: Implement validation and reconciliation
- **Performance degradation**: Monitor and optimize continuously
- **Memory leaks**: Implement proper cleanup and monitoring
- **Cache invalidation**: Design robust invalidation strategies

### Business Risks
- **Service downtime**: Implement fallback to client-side computation
- **Data loss**: Implement backup and recovery procedures
- **Performance regression**: Continuous monitoring and alerting

## Success Criteria

1. **Performance**: 80% reduction in dashboard load time
2. **Scalability**: Support for 100k+ records with sub-second response
3. **Reliability**: 99.9% uptime for aggregation service
4. **Maintainability**: Clean, well-documented codebase
5. **User Experience**: Smooth, responsive interface
