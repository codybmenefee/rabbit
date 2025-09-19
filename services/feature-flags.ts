import { defaultClock } from './types'
import type { Clock, FeatureFlagName, FeatureFlagState } from './types'

const ENV_FLAG_KEY = 'NEXT_PUBLIC_PRECOMPUTATION_FLAGS'

const DEFAULT_FLAG_VALUES: Record<FeatureFlagName, boolean> = {
  precomputationService: false,
  precomputationBackfill: false,
  precomputationFallbacks: true,
}

function parseEnvFlags(): Partial<Record<FeatureFlagName, FeatureFlagState>> {
  const raw =
    typeof process !== 'undefined'
      ? process.env[ENV_FLAG_KEY] ?? process.env[ENV_FLAG_KEY.replace('NEXT_PUBLIC_', '')]
      : undefined

  if (!raw) {
    return {}
  }

  try {
    const parsed = JSON.parse(raw) as Partial<Record<FeatureFlagName, boolean>>
    const now = Date.now()

    return Object.entries(parsed).reduce<Partial<Record<FeatureFlagName, FeatureFlagState>>>(
      (acc, [key, value]) => {
        if (value === undefined) {
          return acc
        }

        const flagName = key as FeatureFlagName
        acc[flagName] = {
          enabled: Boolean(value),
          lastUpdated: now,
          source: 'env',
        }
        return acc
      },
      {},
    )
  } catch (error) {
    console.warn('[feature-flags] Failed to parse env flags:', error)
    return {}
  }
}

const envOverrides = parseEnvFlags()
const runtimeOverrides = new Map<FeatureFlagName, FeatureFlagState>()

function buildDefaultState(flag: FeatureFlagName, clock: Clock): FeatureFlagState {
  return {
    enabled: DEFAULT_FLAG_VALUES[flag],
    lastUpdated: clock.now(),
    source: 'default',
  }
}

export function getFeatureFlagState(
  flag: FeatureFlagName,
  clock: Clock = defaultClock,
): FeatureFlagState {
  if (runtimeOverrides.has(flag)) {
    return runtimeOverrides.get(flag)!
  }

  if (envOverrides[flag]) {
    return envOverrides[flag]!
  }

  return buildDefaultState(flag, clock)
}

export function isFeatureEnabled(flag: FeatureFlagName): boolean {
  return getFeatureFlagState(flag).enabled
}

export function setRuntimeFeatureFlag(
  flag: FeatureFlagName,
  enabled: boolean,
  clock: Clock = defaultClock,
): void {
  runtimeOverrides.set(flag, {
    enabled,
    lastUpdated: clock.now(),
    source: 'runtime',
  })
}

export function resetRuntimeFeatureFlags(): void {
  runtimeOverrides.clear()
}

export function getAllFeatureFlags(clock: Clock = defaultClock): Record<FeatureFlagName, FeatureFlagState> {
  return (['precomputationService', 'precomputationBackfill', 'precomputationFallbacks'] as const).reduce<
    Record<FeatureFlagName, FeatureFlagState>
  >((acc, flag) => {
    acc[flag] = getFeatureFlagState(flag, clock)
    return acc
  }, {} as Record<FeatureFlagName, FeatureFlagState>)
}
