import { createFilterHash, defaultClock } from './types'
import type {
  AggregationEnvelope,
  AggregationKey,
  Clock,
  StorageLayerAdapter,
  StoredAggregationRecord,
} from './types'

export interface StorageLayerOptions<TData = unknown> {
  adapter: StorageLayerAdapter<TData>
  clock?: Clock
}

export class StorageLayer<TData = unknown> {
  private readonly adapter: StorageLayerAdapter<TData>
  private readonly clock: Clock

  constructor(options: StorageLayerOptions<TData>) {
    this.adapter = options.adapter
    this.clock = options.clock ?? defaultClock
  }

  async storeAggregation(key: AggregationKey, envelope: AggregationEnvelope<TData>): Promise<void> {
    const record: StoredAggregationRecord<TData> = {
      userId: key.userId,
      aggregationType: key.aggregationType,
      filterHash: key.filterHash,
      data: envelope.data,
      computedAt: envelope.computedAt.toISOString(),
      expiresAt: envelope.expiresAt.toISOString(),
      version: envelope.version,
      metadata: envelope.metadata,
    }

    await this.adapter.store(record)
  }

  async getAggregation(key: AggregationKey): Promise<AggregationEnvelope<TData> | null> {
    const stored = await this.adapter.fetch(key)

    if (!stored) {
      return null
    }

    return this.fromStoredRecord(stored)
  }

  async removeAggregation(key: AggregationKey): Promise<void> {
    if (!this.adapter.remove) {
      return
    }

    await this.adapter.remove(key)
  }

  async listExpired(referenceDate = new Date(this.clock.now())): Promise<AggregationKey[]> {
    if (!this.adapter.fetchExpired) {
      return []
    }

    const expired = await this.adapter.fetchExpired(referenceDate.toISOString())

    return expired.map((record) => ({
      userId: record.userId,
      aggregationType: record.aggregationType,
      filterHash: record.filterHash,
    }))
  }

  createKey(userId: string, aggregationType: AggregationKey['aggregationType'], filters: Parameters<typeof createFilterHash>[0]): AggregationKey {
    return {
      userId,
      aggregationType,
      filterHash: createFilterHash(filters),
    }
  }

  private fromStoredRecord(record: StoredAggregationRecord<TData>): AggregationEnvelope<TData> {
    return {
      data: record.data,
      computedAt: new Date(record.computedAt),
      expiresAt: new Date(record.expiresAt),
      version: record.version,
      metadata: record.metadata,
      source: 'storage',
    }
  }
}
