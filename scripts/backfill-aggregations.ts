import type { FilterOptions } from '@/lib/types'
import type { AggregationService } from '@/services/aggregation-service'
import type { AggregationType } from '@/services/types'

export interface BackfillJobConfig {
  service: AggregationService
  userId: string
  aggregationTypes: AggregationType[]
  filters: FilterOptions[]
  batchSize?: number
  onProgress?: (info: BackfillProgressEvent) => void
}

export interface BackfillProgressEvent {
  userId: string
  aggregationType: AggregationType
  filterIndex: number
  totalFilters: number
}

export async function backfillPrecomputedAggregations(config: BackfillJobConfig): Promise<void> {
  const { service, userId, aggregationTypes, filters, batchSize = 10, onProgress } = config

  if (!filters.length || !aggregationTypes.length) {
    return
  }

  let processed = 0

  for (const filterChunk of chunk(filters, batchSize)) {
    for (const type of aggregationTypes) {
      for (const filter of filterChunk) {
        await service.refreshAggregation({
          userId,
          type,
          filters: filter,
        })

        processed += 1
        onProgress?.({
          userId,
          aggregationType: type,
          filterIndex: processed,
          totalFilters: filters.length * aggregationTypes.length,
        })
      }
    }
  }
}

export function chunk<T>(items: T[], size: number): T[][] {
  const safeSize = Math.max(1, size)
  const result: T[][] = []
  for (let index = 0; index < items.length; index += safeSize) {
    result.push(items.slice(index, index + safeSize))
  }
  return result
}
