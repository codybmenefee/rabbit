import type { FilterOptions } from '@/lib/types'
import type { AggregationService } from '@/services/aggregation-service'
import type { AggregationType } from '@/services/types'
import { createFilterHash } from '@/services/types'

export interface MigrationValidationConfig {
  service: AggregationService
  userId: string
  aggregationTypes: AggregationType[]
  filters: FilterOptions[]
  onIssue?: (issue: MigrationValidationIssue) => void
}

export interface MigrationValidationIssue {
  type: 'missing' | 'stale'
  userId: string
  aggregationType: AggregationType
  filterHash: string
  message: string
}

export interface MigrationValidationResult {
  success: boolean
  issues: MigrationValidationIssue[]
}

export async function validatePrecomputationMigration(
  config: MigrationValidationConfig,
): Promise<MigrationValidationResult> {
  const { service, userId, aggregationTypes, filters, onIssue } = config
  const issues: MigrationValidationIssue[] = []

  for (const filter of filters) {
    for (const aggregationType of aggregationTypes) {
      try {
        const response = await service.getAggregation({
          userId,
          type: aggregationType,
          filters: filter,
        })

        if (response.expiresAt.getTime() <= Date.now()) {
          const issue: MigrationValidationIssue = {
            type: 'stale',
            userId,
            aggregationType,
            filterHash: createFilterHash(filter),
            message: 'Aggregation is expired and should be recomputed',
          }

          issues.push(issue)
          onIssue?.(issue)
        }
      } catch (error) {
        const issue: MigrationValidationIssue = {
          type: 'missing',
          userId,
          aggregationType,
          filterHash: createFilterHash(filter),
          message: error instanceof Error ? error.message : 'Unknown error',
        }

        issues.push(issue)
        onIssue?.(issue)
      }
    }
  }

  return {
    success: issues.length === 0,
    issues,
  }
}
