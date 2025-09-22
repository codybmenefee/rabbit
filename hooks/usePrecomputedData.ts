import { useEffect, useMemo, useState } from 'react'
import type { AggregationService } from '@/services/aggregation-service'
import type {
  AggregationServiceRequest,
  AggregationSource,
  AggregationType,
} from '@/services/types'
import { createFilterHash } from '@/services/types'
import type { FilterOptions } from '@/lib/types'

export interface UsePrecomputedDataOptions<TData> {
  service?: AggregationService
  fallbackCompute?: AggregationServiceRequest<TData>['fallbackCompute']
  forceRefresh?: boolean
}

export interface UsePrecomputedDataResult<TData> {
  data: TData | null
  loading: boolean
  error: string | null
  lastUpdated: Date | null
  source: AggregationSource | null
  metadata?: Record<string, unknown>
  refresh: () => Promise<void>
}

let sharedService: AggregationService | null = null

export function setSharedAggregationService(service: AggregationService | null): void {
  sharedService = service
}

export function getSharedAggregationService(): AggregationService | null {
  return sharedService
}

export function usePrecomputedData<TData>(
  userId: string | null | undefined,
  type: AggregationType,
  filters: FilterOptions,
  options: UsePrecomputedDataOptions<TData> = {},
): UsePrecomputedDataResult<TData> {
  const service = options.service ?? sharedService
  const [data, setData] = useState<TData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [source, setSource] = useState<AggregationSource | null>(null)
  const [metadata, setMetadata] = useState<Record<string, unknown> | undefined>(undefined)

  const filterSignature = useMemo(() => createFilterHash(filters), [
    filters.timeframe,
    filters.product,
    (filters.topics ?? []).join('|'),
    (filters.channels ?? []).join('|'),
  ])

  useEffect(() => {
    if (!userId) {
      setError('User ID is required to fetch pre-computed aggregations')
      setLoading(false)
      return
    }

    if (!service) {
      setError('Aggregation service is not configured')
      setLoading(false)
      return
    }

    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await service.getAggregation<TData>({
          userId,
          type,
          filters,
          forceRefresh: options.forceRefresh,
          fallbackCompute: options.fallbackCompute,
        })

        if (cancelled) {
          return
        }

        setData(response.data)
        setLastUpdated(response.computedAt)
        setSource(response.source)
        setMetadata(response.metadata)
      } catch (err) {
        if (cancelled) {
          return
        }

        const message = err instanceof Error ? err.message : 'Unknown error'
        setError(message)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [
    userId,
    type,
    filterSignature,
    service,
    options.forceRefresh,
    options.fallbackCompute,
  ])

  const refresh = async () => {
    if (!userId || !service) {
      return
    }
    setLoading(true)

    try {
      const response = await service.refreshAggregation<TData>({
        userId,
        type,
        filters,
        fallbackCompute: options.fallbackCompute,
      })

      setData(response.data)
      setLastUpdated(response.computedAt)
      setSource(response.source)
      setMetadata(response.metadata)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return {
    data,
    loading,
    error,
    lastUpdated,
    source,
    metadata,
    refresh,
  }
}
