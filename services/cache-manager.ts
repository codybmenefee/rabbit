import { DEFAULT_CACHE_TTL_MS, defaultClock } from './types'
import type {
  AggregationEnvelope,
  AggregationKey,
  AggregationSource,
  CacheRetrievalResult,
  CachedAggregationEntry,
  Clock,
} from './types'
import type { StorageLayer } from './storage-layer'

export interface RedisClientLike {
  get(key: string): Promise<string | null>
  set(key: string, value: string, options?: { px?: number; ex?: number }): Promise<void>
  del?(key: string): Promise<void>
}

export interface CacheManagerOptions {
  clock?: Clock
  redis?: RedisClientLike
  storage?: StorageLayer<unknown>
  defaultTtlMs?: number
}

export interface CacheGetOptions {
  allowStale?: boolean
}

export interface CacheSetOptions {
  persistToRedis?: boolean
  persistToStorage?: boolean
}

export class CacheManager {
  private readonly memoryCache = new Map<string, CachedAggregationEntry<unknown>>()
  private readonly clock: Clock
  private readonly redis?: RedisClientLike
  private readonly storage?: StorageLayer<unknown>
  private readonly defaultTtlMs: number

  constructor(options: CacheManagerOptions = {}) {
    this.clock = options.clock ?? defaultClock
    this.redis = options.redis
    this.storage = options.storage
    this.defaultTtlMs = options.defaultTtlMs ?? DEFAULT_CACHE_TTL_MS
  }

  async get<TData = unknown>(
    key: AggregationKey,
    options: CacheGetOptions = {},
  ): Promise<CacheRetrievalResult<TData> | null> {
    const cacheKey = this.toCacheKey(key)
    const now = this.clock.now()

    const memoryEntry = this.memoryCache.get(cacheKey) as CachedAggregationEntry<TData> | undefined
    if (memoryEntry && (options.allowStale || memoryEntry.expiresAt > now)) {
      return {
        entry: this.toEnvelope(memoryEntry, 'memory'),
        hitLayer: 'memory',
      }
    }

    if (memoryEntry && memoryEntry.expiresAt <= now) {
      this.memoryCache.delete(cacheKey)
    }

    if (this.redis) {
      const redisEntry = await this.getFromRedis<TData>(cacheKey, now, options.allowStale ?? false)
      if (redisEntry) {
        this.memoryCache.set(cacheKey, { ...redisEntry, source: 'memory' })
        return {
          entry: this.toEnvelope(redisEntry, 'redis'),
          hitLayer: 'redis',
        }
      }
    }

    if (this.storage) {
      const stored = await this.storage.getAggregation(key)
      if (stored && (options.allowStale || stored.expiresAt.getTime() > now)) {
        const entry = this.fromEnvelope(stored)
        this.memoryCache.set(cacheKey, { ...entry, source: 'memory' })
        return {
          entry: stored as AggregationEnvelope<TData>,
          hitLayer: 'storage',
        }
      }
    }

    return null
  }

  async set<TData = unknown>(
    key: AggregationKey,
    envelope: AggregationEnvelope<TData>,
    options: CacheSetOptions = {},
  ): Promise<void> {
    const cacheKey = this.toCacheKey(key)
    const entry = this.fromEnvelope(envelope)
    entry.source = 'memory'
    this.memoryCache.set(cacheKey, entry)

    const ttlMs = Math.max(envelope.expiresAt.getTime() - this.clock.now(), 0)
    const persistToRedis = options.persistToRedis ?? Boolean(this.redis)
    const persistToStorage = options.persistToStorage ?? Boolean(this.storage)

    if (persistToRedis && this.redis) {
      await this.redis.set(cacheKey, JSON.stringify({ ...entry, source: 'redis' }), {
        px: ttlMs || this.defaultTtlMs,
      })
    }

    if (persistToStorage && this.storage) {
      await this.storage.storeAggregation(key, envelope)
    }
  }

  async delete(key: AggregationKey): Promise<void> {
    const cacheKey = this.toCacheKey(key)
    this.memoryCache.delete(cacheKey)

    if (this.redis?.del) {
      await this.redis.del(cacheKey)
    }

    if (this.storage) {
      await this.storage.removeAggregation(key)
    }
  }

  purgeExpired(): void {
    const now = this.clock.now()
    for (const [key, value] of this.memoryCache.entries()) {
      if (value.expiresAt <= now) {
        this.memoryCache.delete(key)
      }
    }
  }

  private async getFromRedis<TData>(
    cacheKey: string,
    now: number,
    allowStale: boolean,
  ): Promise<CachedAggregationEntry<TData> | null> {
    if (!this.redis) {
      return null
    }

    const raw = await this.redis.get(cacheKey)
    if (!raw) {
      return null
    }

    try {
      const parsed = JSON.parse(raw) as CachedAggregationEntry<TData>
      if (allowStale || parsed.expiresAt > now) {
        return { ...parsed, source: 'redis' }
      }

      if (this.redis.del) {
        await this.redis.del(cacheKey)
      }
    } catch (error) {
      console.warn('[cache-manager] Failed to parse redis cache entry', error)
      if (this.redis.del) {
        await this.redis.del(cacheKey)
      }
    }

    return null
  }

  private toEnvelope<TData>(entry: CachedAggregationEntry<TData>, source: AggregationSource): AggregationEnvelope<TData> {
    return {
      data: entry.value,
      computedAt: new Date(entry.computedAt),
      expiresAt: new Date(entry.expiresAt),
      version: entry.version,
      metadata: entry.metadata,
      source,
    }
  }

  private fromEnvelope<TData>(envelope: AggregationEnvelope<TData>): CachedAggregationEntry<TData> {
    return {
      value: envelope.data,
      computedAt: envelope.computedAt.getTime(),
      expiresAt: envelope.expiresAt.getTime(),
      version: envelope.version,
      metadata: envelope.metadata,
      source: envelope.source,
    }
  }

  private toCacheKey(key: AggregationKey): string {
    return `${key.userId}:${key.aggregationType}:${key.filterHash}`
  }
}
