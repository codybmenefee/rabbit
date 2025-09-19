import type { FilterOptions, WatchRecord } from '@/lib/types'
import { cloneFilters } from './types'
import type {
  AggregationComputeFn,
  AggregationRegistration,
  AggregationType,
} from './types'

export type FilterPreprocessor = (
  filters: FilterOptions,
) => Promise<FilterOptions> | FilterOptions

export interface DataProcessorOptions {
  loadRecords: (filters: FilterOptions) => Promise<WatchRecord[]>
  preprocessors?: FilterPreprocessor[]
}

export class DataProcessor {
  private readonly loadRecords: DataProcessorOptions['loadRecords']
  private readonly preprocessors: FilterPreprocessor[]
  private readonly registry = new Map<AggregationType, AggregationRegistration<unknown>>()

  constructor(options: DataProcessorOptions) {
    this.loadRecords = options.loadRecords
    this.preprocessors = options.preprocessors ?? []
  }

  register<TData>(registration: AggregationRegistration<TData>): void {
    this.registry.set(registration.type, registration as AggregationRegistration<unknown>)
  }

  registerMany(registrations: AggregationRegistration<unknown>[]): void {
    registrations.forEach((registration) => this.registry.set(registration.type, registration))
  }

  hasAggregation(type: AggregationType): boolean {
    return this.registry.has(type)
  }

  listAggregations(): AggregationType[] {
    return [...this.registry.keys()]
  }

  async compute<TData>(type: AggregationType, filters: FilterOptions): Promise<TData> {
    const registration = this.registry.get(type)

    if (!registration) {
      throw new Error(`No aggregation registered for type "${type}"`)
    }

    const preparedFilters = await this.runPreprocessors(filters)
    const records = await this.loadRecords(preparedFilters)

    const result = await (registration.compute as AggregationComputeFn<TData>)({
      filters: preparedFilters,
      records,
    })

    if (registration.validate) {
      await registration.validate(result, {
        filters: preparedFilters,
        records,
      })
    }

    return result
  }

  private async runPreprocessors(filters: FilterOptions): Promise<FilterOptions> {
    let current = cloneFilters(filters)

    for (const preprocessor of this.preprocessors) {
      current = await preprocessor(current)
    }

    return current
  }
}
