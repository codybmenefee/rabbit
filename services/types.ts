import type { FilterOptions, WatchRecord } from '@/lib/types'

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
  | (string & {})

export type AggregationVersion = number

export type AggregationSource = 'memory' | 'redis' | 'storage' | 'computed'

export interface NormalizedFilterOptions {
  timeframe: FilterOptions['timeframe']
  product: FilterOptions['product']
  topics: string[]
  channels: string[]
}

export interface AggregationKey {
  userId: string
  aggregationType: AggregationType
  filterHash: string
}

export interface CachedAggregationEntry<TData = unknown> {
  value: TData
  computedAt: number
  expiresAt: number
  version: AggregationVersion
  metadata?: Record<string, unknown>
  source: AggregationSource
}

export interface AggregationEnvelope<TData = unknown> {
  data: TData
  computedAt: Date
  expiresAt: Date
  version: AggregationVersion
  metadata?: Record<string, unknown>
  source: AggregationSource
}

export interface StoredAggregationRecord<TData = unknown> {
  id?: string
  userId: string
  aggregationType: AggregationType
  filterHash: string
  data: TData
  computedAt: string
  expiresAt: string
  version: AggregationVersion
  metadata?: Record<string, unknown>
}

export interface AggregationComputeContext {
  filters: FilterOptions
  records: WatchRecord[]
}

export type AggregationComputeFn<TData = unknown> = (
  context: AggregationComputeContext,
) => Promise<TData> | TData

export type AggregationValidationFn<TData = unknown> = (
  result: TData,
  context: AggregationComputeContext,
) => Promise<void> | void

export interface AggregationRegistration<TData = unknown> {
  type: AggregationType
  compute: AggregationComputeFn<TData>
  validate?: AggregationValidationFn<TData>
}

export interface Clock {
  now(): number
}

export const defaultClock: Clock = {
  now: () => Date.now(),
}

export type FeatureFlagName =
  | 'precomputationService'
  | 'precomputationBackfill'
  | 'precomputationFallbacks'

export interface FeatureFlagState {
  enabled: boolean
  lastUpdated: number
  source: 'default' | 'env' | 'runtime'
}

export interface AggregationServiceRequest<TData = unknown> {
  userId: string
  type: AggregationType
  filters: FilterOptions
  forceRefresh?: boolean
  fallbackCompute?: () => Promise<TData>
}

export interface CacheRetrievalResult<TData = unknown> {
  entry: AggregationEnvelope<TData>
  hitLayer: AggregationSource
}

export interface StorageLayerAdapter<TData = unknown> {
  store(record: StoredAggregationRecord<TData>): Promise<void>
  fetch(
    key: AggregationKey,
  ): Promise<StoredAggregationRecord<TData> | null>
  remove?(key: AggregationKey): Promise<void>
  fetchExpired?(beforeIso: string): Promise<StoredAggregationRecord<TData>[]>
}

export const DEFAULT_CACHE_TTL_MS = 1000 * 60 * 15 // 15 minutes

export function normalizeFilters(filters: FilterOptions): NormalizedFilterOptions {
  return {
    timeframe: filters.timeframe,
    product: filters.product,
    topics: [...(filters.topics ?? [])].sort(),
    channels: [...(filters.channels ?? [])].sort(),
  }
}

export function createFilterHash(filters: FilterOptions): string {
  const normalized = normalizeFilters(filters)
  return JSON.stringify(normalized)
}

export function cloneFilters(filters: FilterOptions): FilterOptions {
  return {
    timeframe: filters.timeframe,
    product: filters.product,
    topics: filters.topics ? [...filters.topics] : undefined,
    channels: filters.channels ? [...filters.channels] : undefined,
  }
}
