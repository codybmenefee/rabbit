import { getAllFeatureFlags, isFeatureEnabled, resetRuntimeFeatureFlags, setRuntimeFeatureFlag } from '@/services/feature-flags'
import type { FeatureFlagName } from '@/services/types'

export interface RolloutInstruction {
  flag: FeatureFlagName
  enable: boolean
  note?: string
}

export interface RolloutSummaryEntry {
  flag: FeatureFlagName
  enabled: boolean
  source: string
  note?: string
}

export interface RolloutSummary {
  applied: RolloutSummaryEntry[]
}

export function applyRolloutPlan(plan: RolloutInstruction[]): RolloutSummary {
  const applied: RolloutSummaryEntry[] = []

  for (const instruction of plan) {
    setRuntimeFeatureFlag(instruction.flag, instruction.enable)
    const state = getAllFeatureFlags()[instruction.flag]

    applied.push({
      flag: instruction.flag,
      enabled: state.enabled,
      source: state.source,
      note: instruction.note,
    })
  }

  return { applied }
}

export function resetRolloutState(): void {
  resetRuntimeFeatureFlags()
}

export function describeFlagState(flag: FeatureFlagName): RolloutSummaryEntry {
  const state = getAllFeatureFlags()[flag]
  return {
    flag,
    enabled: state.enabled,
    source: state.source,
  }
}

export function hasFlagChanged(flag: FeatureFlagName, expected: boolean): boolean {
  return isFeatureEnabled(flag) === expected
}
