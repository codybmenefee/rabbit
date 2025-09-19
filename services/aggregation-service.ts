import { isFeatureEnabled } from './feature-flags'
import { CacheManager } from './cache-manager'
import { DataProcessor } from './data-processor'
import { createFilterHash, defaultClock } from './types'
import type {
  AggregationEnvelope,
  AggregationKey,
  AggregationServiceRequest,
  AggregationType,
  Clock,
} from './types'

export type AggregationMetadataFactory = <TData>(
  result: TData,
  request: AggregationServiceRequest<TData>,
) => Record<string, unknown> | undefined

export interface AggregationServiceOptions {
  cacheManager: CacheManager
  dataProcessor: DataProcessor
  clock?: Clock
  defaultExpirationMs?: number
  expirationOverrides?: Partial<Record<AggregationType, number>>
  schemaVersion?: number
  metadataFactory?: AggregationMetadataFactory
}

const DEFAULT_EXPIRATION_MS = 1000 * 60 * 15 // 15 minutes

export class AggregationService {
  private readonly cacheManager: CacheManager
  private readonly dataProcessor: DataProcessor
  private readonly clock: Clock
  private readonly defaultExpirationMs: number
  private readonly expirationOverrides: Partial<Record<AggregationType, number>>
  private readonly schemaVersion: number
  private readonly metadataFactory?: AggregationMetadataFactory

  constructor(options: AggregationServiceOptions) {
    this.cacheManager = options.cacheManager
    this.dataProcessor = options.dataProcessor
    this.clock = options.clock ?? defaultClock
    this.defaultExpirationMs = options.defaultExpirationMs ?? DEFAULT_EXPIRATION_MS
    this.expirationOverrides = options.expirationOverrides ?? {}
    this.schemaVersion = options.schemaVersion ?? 1
    this.metadataFactory = options.metadataFactory
  }

  async getAggregation<TData>(request: AggregationServiceRequest<TData>): Promise<AggregationEnvelope<TData>> {
    if (!isFeatureEnabled('precomputationService')) {
      return this.computeViaFallback(request)
    }

    const key = this.toKey(request)

    if (!request.forceRefresh) {
      const cached = await this.cacheManager.get<TData>(key)
      if (cached) {
        return cached.entry
      }
    }

    return this.computeAndPersist(request, key)
  }

  async refreshAggregation<TData>(request: AggregationServiceRequest<TData>): Promise<AggregationEnvelope<TData>> {
    const key = this.toKey(request)
    return this.computeAndPersist(request, key)
  }

  async clearAggregation(request: AggregationServiceRequest<unknown>): Promise<void> {
    const key = this.toKey(request)
    await this.cacheManager.delete(key)
  }

  private async computeAndPersist<TData>(
    request: AggregationServiceRequest<TData>,
    key: AggregationKey,
  ): Promise<AggregationEnvelope<TData>> {
    try {
      const data = await this.dataProcessor.compute<TData>(request.type, request.filters)
      const envelope = this.buildEnvelope(data, request)
      await this.cacheManager.set(key, envelope)
      return envelope
    } catch (error) {
      if (request.fallbackCompute && isFeatureEnabled('precomputationFallbacks')) {
        return this.computeViaFallback(request, error)
      }

      throw error
    }
  }

  private async computeViaFallback<TData>(
    request: AggregationServiceRequest<TData>,
    reason?: unknown,
  ): Promise<AggregationEnvelope<TData>> {
    if (!request.fallbackCompute) {
      throw new Error('Pre-computation fallback unavailable for this aggregation request')
    }

    const result = await request.fallbackCompute()
    const envelope = this.buildEnvelope(result, request)
    const baseMetadata = envelope.metadata ?? {}
    const reasonValue =
      reason instanceof Error ? reason.message : reason === undefined ? undefined : String(reason)

    return {
      ...envelope,
      metadata: {
        ...baseMetadata,
        fallback: true,
        ...(reasonValue ? { reason: reasonValue } : {}),
      },
    }
  }

  private buildEnvelope<TData>(
    result: TData,
    request: AggregationServiceRequest<TData>,
  ): AggregationEnvelope<TData> {
    const computedAt = new Date(this.clock.now())
    const expiresAt = new Date(computedAt.getTime() + this.resolveExpirationMs(request.type))
    const metadata = this.metadataFactory?.(result, request)

    return {
      data: result,
      computedAt,
      expiresAt,
      version: this.schemaVersion,
      metadata,
      source: 'computed',
    }
  }

  private resolveExpirationMs(type: AggregationType): number {
    return this.expirationOverrides[type] ?? this.defaultExpirationMs
  }

  private toKey<TData>(request: AggregationServiceRequest<TData>): AggregationKey {
    return {
      userId: request.userId,
      aggregationType: request.type,
      filterHash: createFilterHash(request.filters),
    }
  }
}
