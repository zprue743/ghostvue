export interface BundleSizePackage {
  directory: string
  name: string
  components: boolean
}

export const BUNDLE_SIZE_PACKAGES: readonly BundleSizePackage[]
export const ALLOWED_EXTERNALS: readonly string[]
export const BUDGET_HEADROOM: number
export const BUDGET_ROUNDING_BYTES: number

export interface PackageEntry {
  specifier: string
  file: string
  kind: 'js' | 'css'
}

export interface SizeFixture {
  id: string
  group: 'entry' | 'component'
  source: string
}

export interface BundleMeasurement {
  js: string
  css: string
  minifiedBytes: number
  gzipBytes: number
  exports: string[]
  externalImports: string[]
  bundledModules: string[]
}

export interface SizeResult {
  id: string
  group: string
  minifiedBytes: number
  gzipBytes: number
  problems: string[]
}

export type BudgetStatus = 'ok' | 'over' | 'missing' | 'invalid'

export interface BudgetRow extends SizeResult {
  budget: number | undefined
  status: BudgetStatus
}

export interface BudgetEvaluation {
  rows: BudgetRow[]
  stale: string[]
  failed: boolean
}

export function proposeBudget(measuredGzipBytes: number): number

export function readPackageEntries(
  repositoryRoot: string,
  pkg: { directory: string; name: string },
): Promise<PackageEntry[]>

export function readComponentNames(
  repositoryRoot: string,
  pkg: { directory: string },
): Promise<string[]>

export function collectFixtures(
  repositoryRoot: string,
  packages?: readonly BundleSizePackage[],
): Promise<{ aliases: Record<string, string>; fixtures: SizeFixture[] }>

export function bundleFixture(options: {
  source: string
  aliases: Record<string, string>
  external?: readonly string[]
}): Promise<BundleMeasurement>

export function findExternalViolations(
  measurement: Pick<BundleMeasurement, 'externalImports' | 'bundledModules'>,
  allowedExternals?: readonly string[],
): string[]

export function evaluateBudgets(
  results: SizeResult[],
  budgets: Record<string, number>,
): BudgetEvaluation

export function proposeBudgets(
  results: { id: string; gzipBytes: number }[],
): Record<string, number>

export function formatBytes(bytes: number): string

export function renderMarkdownReport(evaluation: BudgetEvaluation): string
