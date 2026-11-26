import type { EvalTaskDefinition, MockProfile } from './types.d.ts'

export function getReferenceSolutionSfc(
  taskId: EvalTaskDefinition['id'],
): string

export function getMockDocsOnlyBaselineSfc(
  taskId: EvalTaskDefinition['id'],
  profile: MockProfile,
): string
