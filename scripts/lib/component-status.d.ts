import type { ManifestEntry } from './accessibility-verification.js'

export type ComponentStatus = 'experimental' | 'beta' | 'stable' | 'deprecated'

export const COMPONENT_STATUSES: readonly ComponentStatus[]

export function usagePageForSpec(specPath: string): string
export function validateStatusContract(
  manifest: Record<string, unknown>,
  options: { file: string; docExists: (path: string) => boolean },
): string[]
export function validateRepositoryStatus(
  repositoryRoot: string,
  entries: readonly ManifestEntry[],
): string[]
