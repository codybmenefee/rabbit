import type { FilterOptions } from '@/lib/types'
import type { AggregationType } from '@/services/types'
import type { UsePrecomputedDataOptions, UsePrecomputedDataResult } from './usePrecomputedData'
import { usePrecomputedData } from './usePrecomputedData'

export interface UseAggregationParams<TData> {
  userId: string | null | undefined
  type: AggregationType
  filters: FilterOptions
  options?: UsePrecomputedDataOptions<TData>
}

export function useAggregation<TData>(
  params: UseAggregationParams<TData>,
): UsePrecomputedDataResult<TData> {
  const { userId, type, filters, options } = params
  return usePrecomputedData<TData>(userId, type, filters, options ?? {})
}
