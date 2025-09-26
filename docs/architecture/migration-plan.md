# Migration Plan for Pre-computation Service

> **Status:** Archived. The dedicated pre-computation service described here is not part of the current Convex-first architecture; these notes remain for future research only.

## Overview

This document outlines the comprehensive migration plan for transitioning from client-side aggregation computation to a dedicated pre-computation service. The migration is designed to be gradual, safe, and reversible to minimize risk and ensure system stability.

## Migration Strategy

### Phase 1: Parallel Implementation (Weeks 1-4)
- Implement pre-computation service alongside existing client-side code
- Add feature flags to control which system is used
- Maintain data consistency between both systems
- Gradual rollout to subset of users

### Phase 2: Data Migration (Weeks 5-6)
- Backfill pre-computed aggregations for existing data
- Implement data validation and reconciliation
- Monitor performance and accuracy

### Phase 3: Client Migration (Weeks 7-8)
- Migrate components to use pre-computed data
- Remove client-side aggregation functions
- Clean up unused code and dependencies

### Phase 4: Optimization (Weeks 9-10)
- Performance tuning and optimization
- Monitoring and alerting setup
- Documentation and training

## Detailed Migration Steps

### Step 1: Infrastructure Setup

#### 1.1 Database Schema Migration
```sql
-- Create new tables for pre-computation service
CREATE TABLE precomputed_aggregations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  aggregation_type VARCHAR NOT NULL,
  filter_hash VARCHAR NOT NULL,
  data JSONB NOT NULL,
  computed_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  version INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_precomputed_user_type ON precomputed_aggregations(user_id, aggregation_type);
CREATE INDEX idx_precomputed_filter_hash ON precomputed_aggregations(filter_hash);
CREATE INDEX idx_precomputed_expires ON precomputed_aggregations(expires_at);

-- Create data change log table
CREATE TABLE data_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  change_type VARCHAR NOT NULL,
  record_count INTEGER NOT NULL,
  changed_at TIMESTAMP NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_data_change_log_user_processed ON data_change_log(user_id, processed);
CREATE INDEX idx_data_change_log_changed_at ON data_change_log(changed_at);
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

### Step 2: Service Implementation

#### 2.1 Core Service Files
```typescript
// services/aggregation-service.ts
export class AggregationService {
  private cache: CacheManager
  private processor: DataProcessor
  private storage: StorageLayer
  private featureFlags: FeatureFlagManager

  async getAggregation(
    userId: string,
    type: AggregationType,
    filters: FilterOptions
  ): Promise<AggregationResult> {
    // Check feature flag
    if (this.featureFlags.isEnabled('use_precomputed_aggregations', userId)) {
      return await this.getPrecomputedAggregation(userId, type, filters)
    } else {
      return await this.getClientSideAggregation(userId, type, filters)
    }
  }

  private async getPrecomputedAggregation(
    userId: string,
    type: AggregationType,
    filters: FilterOptions
  ): Promise<AggregationResult> {
    // Implementation for pre-computed aggregations
  }

  private async getClientSideAggregation(
    userId: string,
    type: AggregationType,
    filters: FilterOptions
  ): Promise<AggregationResult> {
    // Fallback to existing client-side computation
  }
}
```

#### 2.2 Feature Flag System
```typescript
// services/feature-flags.ts
export class FeatureFlagManager {
  private flags: Map<string, boolean> = new Map()

  isEnabled(flag: string, userId: string): boolean {
    // Check user-specific flags
    const userFlag = this.getUserFlag(flag, userId)
    if (userFlag !== null) return userFlag

    // Check global flags
    return this.getGlobalFlag(flag)
  }

  private getUserFlag(flag: string, userId: string): boolean | null {
    // Implementation for user-specific feature flags
    return null
  }

  private getGlobalFlag(flag: string): boolean {
    return this.flags.get(flag) || false
  }
}
```

### Step 3: Component Migration

#### 3.1 Create Migration Hooks
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
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<'precomputed' | 'client-side'>('client-side')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const result = await aggregationService.getAggregation(
          getCurrentUserId(),
          type,
          filters
        )

        setData(result.data)
        setSource(result.source)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [type, filters])

  return { data, loading, error, source }
}
```

#### 3.2 Migrate Dashboard Components
```typescript
// components/dashboard/main-dashboard.tsx
export function MainDashboard({ data }: MainDashboardProps) {
  const [filters, setFilters] = useState<FilterOptions>({
    timeframe: 'All',
    product: 'All',
    topics: [],
    channels: []
  })

  // Use new aggregation hook
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

### Step 4: Data Migration

#### 4.1 Backfill Script
```typescript
// scripts/backfill-aggregations.ts
export class AggregationBackfill {
  async backfillUserData(userId: string): Promise<void> {
    console.log(`Starting backfill for user ${userId}`)

    // Get all watch records for user
    const records = await this.getUserRecords(userId)
    
    // Get all filter combinations
    const filterCombinations = await this.getFilterCombinations(userId)
    
    // Compute aggregations for each combination
    for (const filters of filterCombinations) {
      await this.computeAndStoreAggregations(userId, records, filters)
    }

    console.log(`Completed backfill for user ${userId}`)
  }

  private async computeAndStoreAggregations(
    userId: string,
    records: WatchRecord[],
    filters: FilterOptions
  ): Promise<void> {
    const aggregationTypes = [
      'kpi',
      'monthly_trend',
      'top_channels',
      'day_time_heatmap',
      'topics_leaderboard',
      'session_analysis',
      'viewing_patterns',
      'enhanced_channel_metrics',
      'channel_relationships',
      'topic_evolution'
    ]

    for (const type of aggregationTypes) {
      try {
        const data = await this.computeAggregation(type, records, filters)
        await this.storeAggregation(userId, type, filters, data)
      } catch (error) {
        console.error(`Error computing ${type} for user ${userId}:`, error)
      }
    }
  }
}
```

#### 4.2 Data Validation
```typescript
// scripts/validate-migration.ts
export class MigrationValidator {
  async validateUserData(userId: string): Promise<ValidationResult> {
    const results: ValidationResult[] = []

    // Compare pre-computed vs client-side results
    const filterCombinations = await this.getFilterCombinations(userId)
    
    for (const filters of filterCombinations) {
      const precomputed = await this.getPrecomputedData(userId, filters)
      const clientSide = await this.getClientSideData(userId, filters)
      
      const comparison = this.compareResults(precomputed, clientSide)
      results.push(comparison)
    }

    return this.aggregateResults(results)
  }

  private compareResults(
    precomputed: any,
    clientSide: any
  ): ValidationResult {
    // Implementation for comparing results
    return {
      valid: true,
      differences: [],
      warnings: []
    }
  }
}
```

### Step 5: Gradual Rollout

#### 5.1 User Segmentation
```typescript
// services/rollout-manager.ts
export class RolloutManager {
  async shouldUsePrecomputed(userId: string): Promise<boolean> {
    // Check if user is in beta group
    if (await this.isBetaUser(userId)) {
      return true
    }

    // Check if user has sufficient data
    if (await this.hasSufficientData(userId)) {
      return true
    }

    // Check if user is in gradual rollout
    if (await this.isInRollout(userId)) {
      return true
    }

    return false
  }

  private async isBetaUser(userId: string): Promise<boolean> {
    // Check if user is in beta testing group
    return false
  }

  private async hasSufficientData(userId: string): Promise<boolean> {
    // Check if user has enough data for meaningful aggregations
    const recordCount = await this.getUserRecordCount(userId)
    return recordCount >= 1000
  }

  private async isInRollout(userId: string): Promise<boolean> {
    // Check if user is in gradual rollout percentage
    const hash = this.hashUserId(userId)
    const percentage = await this.getRolloutPercentage()
    return hash % 100 < percentage
  }
}
```

#### 5.2 Monitoring and Rollback
```typescript
// services/monitoring.ts
export class MigrationMonitor {
  async monitorPerformance(): Promise<void> {
    const metrics = await this.collectMetrics()
    
    // Check for performance regressions
    if (metrics.averageResponseTime > this.thresholds.responseTime) {
      await this.alertPerformanceRegression(metrics)
    }

    // Check for error rate increases
    if (metrics.errorRate > this.thresholds.errorRate) {
      await this.alertErrorRateIncrease(metrics)
    }

    // Check for data consistency issues
    if (metrics.consistencyScore < this.thresholds.consistency) {
      await this.alertDataConsistencyIssue(metrics)
    }
  }

  async rollbackUser(userId: string): Promise<void> {
    // Disable pre-computed aggregations for user
    await this.disablePrecomputedForUser(userId)
    
    // Log rollback
    await this.logRollback(userId, 'performance_issue')
  }
}
```

## Code Migration Checklist

### Files to Create
- [ ] `services/aggregation-service.ts`
- [ ] `services/cache-manager.ts`
- [ ] `services/data-processor.ts`
- [ ] `services/storage-layer.ts`
- [ ] `services/feature-flags.ts`
- [ ] `services/rollout-manager.ts`
- [ ] `services/migration-monitor.ts`
- [ ] `hooks/useAggregation.ts`
- [ ] `hooks/usePrecomputedData.ts`
- [ ] `scripts/backfill-aggregations.ts`
- [ ] `scripts/validate-migration.ts`
- [ ] `scripts/rollout-control.ts`

### Files to Modify
- [ ] `convex/schema.ts` - Add new tables
- [ ] `convex/aggregations.ts` - Add new queries/mutations
- [ ] `components/dashboard/main-dashboard.tsx` - Use new hooks
- [ ] `components/analytics/analytics-dashboard.tsx` - Use new hooks
- [ ] `components/history/history-insights.tsx` - Use new hooks
- [ ] `components/channels/*.tsx` - Use new hooks
- [ ] `components/topics/*.tsx` - Use new hooks
- [ ] `lib/aggregations.ts` - Mark as deprecated
- [ ] `lib/channel-aggregations.ts` - Mark as deprecated
- [ ] `lib/topic-aggregations.ts` - Mark as deprecated

### Files to Remove (After Migration)
- [ ] `lib/aggregations.ts` - Move to services
- [ ] `lib/channel-aggregations.ts` - Move to services
- [ ] `lib/topic-aggregations.ts` - Move to services
- [ ] Client-side aggregation utilities
- [ ] Unused aggregation types

## Testing Strategy

### Unit Tests
- [ ] Test aggregation service methods
- [ ] Test cache manager functionality
- [ ] Test data processor accuracy
- [ ] Test storage layer operations
- [ ] Test feature flag system
- [ ] Test migration scripts

### Integration Tests
- [ ] Test end-to-end aggregation flow
- [ ] Test data consistency between systems
- [ ] Test performance under load
- [ ] Test error handling and recovery
- [ ] Test rollback procedures

### Performance Tests
- [ ] Load testing with large datasets
- [ ] Memory usage testing
- [ ] Response time benchmarking
- [ ] Cache performance testing
- [ ] Database query optimization

### User Acceptance Tests
- [ ] Dashboard load time testing
- [ ] Filter change responsiveness
- [ ] Data accuracy validation
- [ ] User experience testing
- [ ] Error handling testing

## Risk Mitigation

### Technical Risks
1. **Data Inconsistency**
   - Mitigation: Implement validation and reconciliation
   - Monitoring: Continuous data consistency checks
   - Rollback: Automatic fallback to client-side computation

2. **Performance Regression**
   - Mitigation: Gradual rollout with monitoring
   - Monitoring: Real-time performance metrics
   - Rollback: Automatic rollback on performance issues

3. **Memory Leaks**
   - Mitigation: Proper cleanup and monitoring
   - Monitoring: Memory usage tracking
   - Rollback: Restart service if memory usage exceeds threshold

4. **Cache Invalidation Issues**
   - Mitigation: Robust invalidation strategies
   - Monitoring: Cache hit/miss rate tracking
   - Rollback: Clear cache and recompute

### Business Risks
1. **Service Downtime**
   - Mitigation: Fallback to client-side computation
   - Monitoring: Service health checks
   - Rollback: Automatic failover

2. **Data Loss**
   - Mitigation: Backup and recovery procedures
   - Monitoring: Data integrity checks
   - Rollback: Restore from backup

3. **User Experience Degradation**
   - Mitigation: Gradual rollout with user feedback
   - Monitoring: User experience metrics
   - Rollback: Rollback to previous version

## Success Criteria

### Performance Metrics
- [ ] Dashboard load time < 500ms (target: 80% reduction)
- [ ] Filter change response < 100ms (target: 90% reduction)
- [ ] Memory usage < 20MB (target: 80% reduction)
- [ ] CPU usage < 10% during normal operation

### Reliability Metrics
- [ ] Service uptime > 99.9%
- [ ] Data consistency > 99.99%
- [ ] Error rate < 0.1%
- [ ] Cache hit rate > 95%

### User Experience Metrics
- [ ] User satisfaction score > 4.5/5
- [ ] Support ticket reduction > 50%
- [ ] User adoption rate > 90%
- [ ] Performance complaint reduction > 80%

## Rollback Plan

### Immediate Rollback (0-5 minutes)
1. Disable feature flag for all users
2. Revert to client-side computation
3. Monitor system stability
4. Investigate root cause

### Partial Rollback (5-30 minutes)
1. Rollback specific user segments
2. Identify affected components
3. Fix issues in pre-computation service
4. Re-enable for fixed segments

### Full Rollback (30+ minutes)
1. Complete system rollback
2. Restore from backup if necessary
3. Full investigation and fix
4. Re-plan migration approach

## Post-Migration Tasks

### Cleanup
- [ ] Remove deprecated code
- [ ] Clean up unused dependencies
- [ ] Update documentation
- [ ] Archive old data

### Optimization
- [ ] Performance tuning
- [ ] Cache optimization
- [ ] Database optimization
- [ ] Monitoring improvements

### Monitoring
- [ ] Set up alerts
- [ ] Create dashboards
- [ ] Establish SLAs
- [ ] Regular health checks

This comprehensive migration plan ensures a safe, gradual transition to the pre-computation service while maintaining system stability and user experience.
