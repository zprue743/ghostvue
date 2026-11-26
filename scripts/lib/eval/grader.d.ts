import type { Browser } from '@playwright/test'

import type { EvalTaskDefinition, TrialGradingResult } from './types.d.ts'

export interface GradeTrialOptions {
  readonly repositoryRoot: string
  readonly task: EvalTaskDefinition
  readonly sfcSource: string | null
  readonly artifactDir: string
  readonly artifactRelativeBase: string
  readonly skipTypecheck?: boolean
  readonly skipBrowser?: boolean
  readonly browser?: Browser
}

export function evaluateTaskConstraints(
  task: EvalTaskDefinition,
  sfcSource: string | null,
): TrialGradingResult['constraints']

export function lintGeneratedSfc(
  repositoryRoot: string,
  sfcSource: string,
): Promise<TrialGradingResult['eslint']>

export function typecheckGeneratedSfc(
  repositoryRoot: string,
  sfcSource: string,
): Promise<TrialGradingResult['typecheck']>

export function buildGeneratedSfc(
  repositoryRoot: string,
  sfcSource: string,
  outDir: string,
): Promise<TrialGradingResult['build']>

export function gradeTrialOutput(
  options: GradeTrialOptions,
): Promise<TrialGradingResult>
