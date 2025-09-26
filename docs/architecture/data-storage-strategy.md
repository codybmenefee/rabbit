# Data Storage Strategy for Pre-computed Aggregations

> **Status:** Archived. The dedicated pre-computation service described here is not part of the current Convex-first architecture; these notes remain for future research only.

## Overview

This document outlines the comprehensive data storage strategy for the pre-computation service, including data models, storage patterns, indexing strategies, and data lifecycle management.

## Storage Architecture

### Multi-layer Storage Design

```
┌─────────────────────────────────────────────────────────────┐
│                    Storage Layers                          │
├─────────────────────────────────────────────────────────────┤
│  L1: Memory Cache (Redis)     - Hot data, fast access      │
│  L2: Convex Database          - Persistent storage         │
│  L3: File System Cache        - Large aggregations         │
│  L4: Archive Storage          - Historical data            │
└─────────────────────────────────────────────────────────────┘
```

## Data Models

### 1. Pre-computed Aggregations

```typescript
interface PrecomputedAggregation {
  id: string                    // UUID
  userId: string               // User identifier
  aggregationType: AggregationType
  filterHash: string           // Hash of filter combination
  data: any                    // Pre-computed result
  computedAt: string           // ISO timestamp
  expiresAt: string            // ISO timestamp
  version: number              // Schema version
  metadata: {
    filterCount: number        // Number of active filters
    recordCount: number        // Number of records processed
    computationTime: number    // Time taken to compute (ms)
    dataSize: number          // Size of data in bytes
    dependencies: string[]    // Dependent aggregation types
  }
  tags: string[]              // For categorization and cleanup
}
```

### 2. Filter Combinations

```typescript
interface FilterCombination {
  id: string
  userId: string
  filterHash: string
  filters: FilterOptions
  isActive: boolean           // Whether this combination is still used
  lastUsed: string           // Last time this combination was accessed
  usageCount: number         // How many times this combination was used
  createdAt: string
}
```

### 3. Data Change Log

```typescript
interface DataChangeLog {
  id: string
  userId: string
  changeType: 'insert' | 'update' | 'delete' | 'bulk_insert'
  recordCount: number
  affectedFields: string[]    // Fields that changed
  changedAt: string
  processed: boolean
  processingStartedAt?: string
  processingCompletedAt?: string
  errorMessage?: string
  retryCount: number
}
```

### 4. Aggregation Dependencies

```typescript
interface AggregationDependency {
  id: string
  parentType: AggregationType
  childType: AggregationType
  dependencyType: 'strong' | 'weak' | 'conditional'
  conditions?: Record<string, any>
  createdAt: string
}
```

## Storage Patterns

### 1. Time-based Partitioning

```sql
-- Partition by month for better query performance
CREATE TABLE precomputed_aggregations_2024_01 PARTITION OF precomputed_aggregations
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE precomputed_aggregations_2024_02 PARTITION OF precomputed_aggregations
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
```

### 2. User-based Sharding

```typescript
// Shard by user ID for better distribution
const getShardKey = (userId: string): string => {
  const hash = crypto.createHash('md5').update(userId).digest('hex')
  return `shard_${parseInt(hash.substring(0, 8), 16) % 16}`
}
```

### 3. Aggregation Type Grouping

```typescript
// Group by aggregation type for efficient queries
const getAggregationGroup = (type: AggregationType): string => {
  const groups = {
    'kpi': 'basic_metrics',
    'monthly_trend': 'basic_metrics',
    'top_channels': 'channel_metrics',
    'enhanced_channel_metrics': 'channel_metrics',
    'channel_relationships': 'channel_metrics',
    'topics_leaderboard': 'topic_metrics',
    'topic_evolution': 'topic_metrics',
    'day_time_heatmap': 'temporal_metrics',
    'viewing_patterns': 'temporal_metrics',
    'session_analysis': 'temporal_metrics'
  }
  return groups[type] || 'other'
}
```

## Indexing Strategy

### 1. Primary Indexes

```sql
-- User and type combination (most common query)
CREATE INDEX idx_precomputed_user_type ON precomputed_aggregations(user_id, aggregation_type);

-- Filter hash for exact matches
CREATE INDEX idx_precomputed_filter_hash ON precomputed_aggregations(filter_hash);

-- Expiration for cleanup
CREATE INDEX idx_precomputed_expires ON precomputed_aggregations(expires_at);

-- User and expiration for user-specific cleanup
CREATE INDEX idx_precomputed_user_expires ON precomputed_aggregations(user_id, expires_at);
```

### 2. Composite Indexes

```sql
-- User, type, and expiration for efficient queries
CREATE INDEX idx_precomputed_user_type_expires ON precomputed_aggregations(user_id, aggregation_type, expires_at);

-- Type and expiration for type-specific cleanup
CREATE INDEX idx_precomputed_type_expires ON precomputed_aggregations(aggregation_type, expires_at);

-- User, type, and computed time for freshness checks
CREATE INDEX idx_precomputed_user_type_computed ON precomputed_aggregations(user_id, aggregation_type, computed_at);
```

### 3. Partial Indexes

```sql
-- Only index active aggregations
CREATE INDEX idx_precomputed_active ON precomputed_aggregations(user_id, aggregation_type) 
WHERE expires_at > NOW();

-- Only index recent changes
CREATE INDEX idx_precomputed_recent ON precomputed_aggregations(computed_at) 
WHERE computed_at > NOW() - INTERVAL '7 days';
```

## Data Lifecycle Management

### 1. Expiration Strategy

```typescript
interface ExpirationConfig {
  aggregationType: AggregationType
  ttl: number              // Time to live in seconds
  maxAge: number           // Maximum age in seconds
  refreshThreshold: number // Refresh when this close to expiration
}

const EXPIRATION_CONFIGS: Record<AggregationType, ExpirationConfig> = {
  'kpi': { ttl: 3600, maxAge: 7200, refreshThreshold: 600 },           // 1 hour TTL, 2 hour max
  'monthly_trend': { ttl: 7200, maxAge: 14400, refreshThreshold: 1200 }, // 2 hour TTL, 4 hour max
  'top_channels': { ttl: 1800, maxAge: 3600, refreshThreshold: 300 },   // 30 min TTL, 1 hour max
  'day_time_heatmap': { ttl: 3600, maxAge: 7200, refreshThreshold: 600 },
  'topics_leaderboard': { ttl: 1800, maxAge: 3600, refreshThreshold: 300 },
  'session_analysis': { ttl: 7200, maxAge: 14400, refreshThreshold: 1200 },
  'viewing_patterns': { ttl: 3600, maxAge: 7200, refreshThreshold: 600 },
  'enhanced_channel_metrics': { ttl: 3600, maxAge: 7200, refreshThreshold: 600 },
  'channel_relationships': { ttl: 7200, maxAge: 14400, refreshThreshold: 1200 },
  'topic_evolution': { ttl: 7200, maxAge: 14400, refreshThreshold: 1200 }
}
```

### 2. Cleanup Policies

```typescript
class DataLifecycleManager {
  async cleanupExpiredAggregations(): Promise<void> {
    const expired = await this.getExpiredAggregations()
    
    for (const aggregation of expired) {
      await this.deleteAggregation(aggregation.id)
      await this.logCleanup(aggregation)
    }
  }

  async cleanupUnusedFilterCombinations(): Promise<void> {
    const unused = await this.getUnusedFilterCombinations()
    
    for (const combination of unused) {
      await this.deleteFilterCombination(combination.id)
    }
  }

  async archiveOldData(): Promise<void> {
    const oldData = await this.getOldData()
    
    for (const data of oldData) {
      await this.archiveToColdStorage(data)
      await this.deleteFromHotStorage(data.id)
    }
  }
}
```

### 3. Data Retention Policies

```typescript
interface RetentionPolicy {
  hotStorage: number      // Days to keep in hot storage
  warmStorage: number     // Days to keep in warm storage
  coldStorage: number     // Days to keep in cold storage
  archiveStorage: number  // Days to keep in archive
}

const RETENTION_POLICIES: Record<AggregationType, RetentionPolicy> = {
  'kpi': { hotStorage: 7, warmStorage: 30, coldStorage: 90, archiveStorage: 365 },
  'monthly_trend': { hotStorage: 30, warmStorage: 90, coldStorage: 365, archiveStorage: 1095 },
  'top_channels': { hotStorage: 7, warmStorage: 30, coldStorage: 90, archiveStorage: 365 },
  'day_time_heatmap': { hotStorage: 7, warmStorage: 30, coldStorage: 90, archiveStorage: 365 },
  'topics_leaderboard': { hotStorage: 7, warmStorage: 30, coldStorage: 90, archiveStorage: 365 },
  'session_analysis': { hotStorage: 30, warmStorage: 90, coldStorage: 365, archiveStorage: 1095 },
  'viewing_patterns': { hotStorage: 30, warmStorage: 90, coldStorage: 365, archiveStorage: 1095 },
  'enhanced_channel_metrics': { hotStorage: 7, warmStorage: 30, coldStorage: 90, archiveStorage: 365 },
  'channel_relationships': { hotStorage: 30, warmStorage: 90, coldStorage: 365, archiveStorage: 1095 },
  'topic_evolution': { hotStorage: 30, warmStorage: 90, coldStorage: 365, archiveStorage: 1095 }
}
```

## Caching Strategy

### 1. Multi-level Caching

```typescript
class CacheManager {
  private l1Cache: Map<string, CachedItem> = new Map()  // Memory cache
  private l2Cache: Redis                                 // Redis cache
  private l3Cache: ConvexDatabase                       // Convex database
  private l4Cache: FileSystemCache                      // File system cache

  async get(key: string): Promise<any> {
    // L1: Memory cache (fastest)
    if (this.l1Cache.has(key)) {
      const item = this.l1Cache.get(key)!
      if (!this.isExpired(item)) {
        return item.data
      }
      this.l1Cache.delete(key)
    }

    // L2: Redis cache (fast)
    const redisData = await this.l2Cache.get(key)
    if (redisData) {
      const item = JSON.parse(redisData)
      if (!this.isExpired(item)) {
        this.l1Cache.set(key, item)
        return item.data
      }
    }

    // L3: Convex database (persistent)
    const dbData = await this.l3Cache.get(key)
    if (dbData) {
      this.setL1Cache(key, dbData)
      this.setL2Cache(key, dbData)
      return dbData.data
    }

    // L4: File system cache (large data)
    const fileData = await this.l4Cache.get(key)
    if (fileData) {
      this.setL1Cache(key, fileData)
      this.setL2Cache(key, fileData)
      return fileData.data
    }

    return null
  }
}
```

### 2. Cache Invalidation

```typescript
class CacheInvalidationManager {
  async invalidateByUser(userId: string): Promise<void> {
    // Invalidate all aggregations for a user
    const keys = await this.getUserCacheKeys(userId)
    await this.invalidateKeys(keys)
  }

  async invalidateByType(userId: string, type: AggregationType): Promise<void> {
    // Invalidate specific aggregation type for a user
    const keys = await this.getUserTypeCacheKeys(userId, type)
    await this.invalidateKeys(keys)
  }

  async invalidateByDependency(parentType: AggregationType): Promise<void> {
    // Invalidate dependent aggregations
    const dependencies = await this.getDependencies(parentType)
    for (const dep of dependencies) {
      await this.invalidateByType(dep.userId, dep.childType)
    }
  }
}
```

## Data Consistency

### 1. Consistency Checks

```typescript
class DataConsistencyManager {
  async validateAggregation(aggregation: PrecomputedAggregation): Promise<boolean> {
    // Check data integrity
    if (!aggregation.data || typeof aggregation.data !== 'object') {
      return false
    }

    // Check timestamp validity
    if (new Date(aggregation.computedAt) > new Date()) {
      return false
    }

    // Check expiration
    if (new Date(aggregation.expiresAt) <= new Date()) {
      return false
    }

    // Check version compatibility
    if (!this.isVersionCompatible(aggregation.version)) {
      return false
    }

    return true
  }

  async reconcileData(userId: string): Promise<void> {
    // Find inconsistencies
    const inconsistencies = await this.findInconsistencies(userId)
    
    // Fix inconsistencies
    for (const inconsistency of inconsistencies) {
      await this.fixInconsistency(inconsistency)
    }
  }
}
```

### 2. Data Validation

```typescript
class DataValidator {
  validateAggregationData(type: AggregationType, data: any): ValidationResult {
    const schema = this.getSchema(type)
    const result = schema.validate(data)
    
    if (!result.valid) {
      return {
        valid: false,
        errors: result.errors,
        warnings: result.warnings
      }
    }

    return { valid: true, errors: [], warnings: [] }
  }

  private getSchema(type: AggregationType): JSONSchema {
    const schemas = {
      'kpi': this.getKPISchema(),
      'monthly_trend': this.getMonthlyTrendSchema(),
      'top_channels': this.getTopChannelsSchema(),
      // ... other schemas
    }
    
    return schemas[type]
  }
}
```

## Performance Optimization

### 1. Query Optimization

```typescript
class QueryOptimizer {
  async getAggregation(userId: string, type: AggregationType, filters: FilterOptions): Promise<any> {
    const filterHash = this.hashFilters(filters)
    
    // Use the most efficient query path
    if (this.isCommonFilterCombination(filters)) {
      return await this.getFromCommonCache(userId, type, filterHash)
    }
    
    if (this.isRecentComputation(userId, type, filterHash)) {
      return await this.getFromRecentCache(userId, type, filterHash)
    }
    
    return await this.getFromDatabase(userId, type, filterHash)
  }
}
```

### 2. Batch Operations

```typescript
class BatchProcessor {
  async batchComputeAggregations(requests: AggregationRequest[]): Promise<AggregationResult[]> {
    // Group by user and type for efficient processing
    const grouped = this.groupRequests(requests)
    
    const results: AggregationResult[] = []
    
    for (const [key, group] of grouped) {
      const batchResults = await this.processBatch(key, group)
      results.push(...batchResults)
    }
    
    return results
  }
}
```

## Monitoring and Metrics

### 1. Storage Metrics

```typescript
interface StorageMetrics {
  totalAggregations: number
  activeAggregations: number
  expiredAggregations: number
  averageDataSize: number
  cacheHitRate: number
  queryLatency: number
  storageUtilization: number
  errorRate: number
}
```

### 2. Performance Monitoring

```typescript
class StorageMonitor {
  async collectMetrics(): Promise<StorageMetrics> {
    return {
      totalAggregations: await this.getTotalAggregations(),
      activeAggregations: await this.getActiveAggregations(),
      expiredAggregations: await this.getExpiredAggregations(),
      averageDataSize: await this.getAverageDataSize(),
      cacheHitRate: await this.getCacheHitRate(),
      queryLatency: await this.getAverageQueryLatency(),
      storageUtilization: await this.getStorageUtilization(),
      errorRate: await this.getErrorRate()
    }
  }
}
```

## Security and Privacy

### 1. Data Encryption

```typescript
class DataEncryption {
  async encryptAggregation(aggregation: PrecomputedAggregation): Promise<EncryptedAggregation> {
    const encryptedData = await this.encrypt(aggregation.data)
    
    return {
      ...aggregation,
      data: encryptedData,
      encryptionKey: this.getEncryptionKey(aggregation.userId)
    }
  }

  async decryptAggregation(encrypted: EncryptedAggregation): Promise<PrecomputedAggregation> {
    const decryptedData = await this.decrypt(encrypted.data, encrypted.encryptionKey)
    
    return {
      ...encrypted,
      data: decryptedData
    }
  }
}
```

### 2. Access Control

```typescript
class AccessControl {
  async canAccessAggregation(userId: string, aggregationId: string): Promise<boolean> {
    const aggregation = await this.getAggregation(aggregationId)
    return aggregation.userId === userId
  }

  async auditAccess(userId: string, aggregationId: string, action: string): Promise<void> {
    await this.logAccess({
      userId,
      aggregationId,
      action,
      timestamp: new Date().toISOString(),
      ipAddress: this.getClientIP(),
      userAgent: this.getUserAgent()
    })
  }
}
```

## Backup and Recovery

### 1. Backup Strategy

```typescript
class BackupManager {
  async createBackup(): Promise<BackupInfo> {
    const timestamp = new Date().toISOString()
    const backupId = `backup_${timestamp}`
    
    // Create full backup
    await this.createFullBackup(backupId)
    
    // Create incremental backup
    await this.createIncrementalBackup(backupId)
    
    return {
      backupId,
      timestamp,
      size: await this.getBackupSize(backupId),
      status: 'completed'
    }
  }
}
```

### 2. Recovery Procedures

```typescript
class RecoveryManager {
  async recoverFromBackup(backupId: string): Promise<void> {
    // Validate backup
    await this.validateBackup(backupId)
    
    // Restore data
    await this.restoreData(backupId)
    
    // Verify integrity
    await this.verifyDataIntegrity()
    
    // Update indexes
    await this.rebuildIndexes()
  }
}
```

This comprehensive data storage strategy ensures efficient, scalable, and reliable storage of pre-computed aggregations while maintaining data consistency and performance.
