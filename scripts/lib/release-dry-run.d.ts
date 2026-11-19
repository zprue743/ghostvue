export const DRY_RUN_REGISTRY: string
export const REPOSITORY_URL: string
export const DEFAULT_EVIDENCE_DIRECTORY: string

export class ReleaseSafetyError extends Error {
  constructor(message: string)
}

export interface ReleaseDryRunCliOptions {
  outDir: string
  expectVersion: string | null
  verifyEvidence: string | null
}

export function parseReleaseDryRunArgs(argv: string[]): ReleaseDryRunCliOptions

export function assertSafeNpmArgs(args: string[]): void

export function createIsolatedNpmEnv(
  baseEnv: NodeJS.ProcessEnv,
  userconfigPath: string,
  globalconfigPath: string,
): NodeJS.ProcessEnv

export function sourceManifestProblems(
  manifest: Record<string, unknown>,
  directory: string,
): string[]

export function stagePublishManifest(
  packedManifest: Record<string, unknown>,
  plannedVersions: Map<string, string>,
): Record<string, unknown>

export interface ReleasePlanEntry {
  directory: string
  before: string
  after: string
  changelog: string | null
}

export function planReleaseVersions(
  root: string,
  scratch: string,
): Promise<Map<string, ReleasePlanEntry>>

export interface ReleasePackage {
  directory: string
  name: string
}

export interface ReleaseDryRunSummary {
  dryRun: true
  published: false
  registry: string
  expectVersion: string | null
  generatedAt: string
  commit: string | null
  packages: Record<string, unknown>[]
}

export function runReleaseDryRun(options: {
  root: string
  packages: readonly ReleasePackage[]
  outDir: string
  expectVersion?: string | null
  log?: (message: string) => void
}): Promise<ReleaseDryRunSummary>

export function verifyReleaseEvidence(options: {
  evidenceDir: string
  packages: readonly ReleasePackage[]
  expectVersion?: string | null
}): Promise<string[]>
