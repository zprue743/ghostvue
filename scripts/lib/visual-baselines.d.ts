export interface VisualTestFailure {
  file: string
  line: number
  title: string
  project: string
  messages: string[]
}

export interface PorcelainEntry {
  status: string
  path: string
  from?: string
}

export interface PlaywrightRunRequest {
  locations?: string[]
  updateSnapshots: 'none' | 'changed'
}

export interface RegenerationResult {
  outcome: 'noop' | 'changes' | 'failed'
  summary: string
  details: string[]
  files: string[]
}

export function isBaselineSnapshotPath(path: string): boolean

export function collectVisualFailures(
  report: unknown,
  options: { cwd: string },
): {
  snapshotFailures: VisualTestFailure[]
  otherFailures: VisualTestFailure[]
  globalErrors: string[]
}

export function failureLocations(failures: VisualTestFailure[]): string[]

export function parsePorcelainStatus(output: string): PorcelainEntry[]

export function checkSnapshotOnlyChanges(entries: PorcelainEntry[]): {
  snapshotFiles: string[]
  offenders: string[]
}

export function deriveGhoKey(pullRequest: {
  title?: string | null
  branch?: string | null
}): string | null

export function deriveTrackingKey(pullRequest: {
  title?: string | null
  branch?: string | null
  body?: string | null
}): string | null

export function baselineCommitMessage(pullRequest: {
  title?: string | null
  branch?: string | null
  body?: string | null
  prNumber: number | string
}): string

export function regenerateBaselines(options: {
  runPlaywright: (request: PlaywrightRunRequest) => Promise<unknown>
  readStatus: () => Promise<string>
  cwd: string
  locations?: string[]
}): Promise<RegenerationResult>

export function formatResultMarkdown(result: RegenerationResult): string
