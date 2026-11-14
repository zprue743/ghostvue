export type VerificationStatus = 'pass' | 'fail' | 'skip'

export interface ComponentCheck {
  name: string
  status: VerificationStatus
  durationMs: number
  errors: string[]
}

/** Version 1 of the machine-readable component verification report. */
export interface ComponentVerificationReport {
  schemaVersion: 1
  component: string
  status: 'pass' | 'fail'
  durationMs: number
  checks: ComponentCheck[]
}

export interface ComponentSelection {
  name: string
  slug: string
  names: string[]
  files: string[]
  sources: string[]
  manifests: string[]
  examples: string[]
  tests: string[]
}

export interface CommandResult {
  ok: boolean
  output: string
}

export function firstErrorLines(output: string): string[]
export function executeCommand(
  command: string[],
  repositoryRoot: string,
): Promise<CommandResult>
export function discoverComponent(
  repositoryRoot: string,
  name: string,
): Promise<ComponentSelection>
export function verifyComponent(options: {
  repositoryRoot: string
  name: string
  reportPath?: string
  /** Internal test seam; the CLI always uses the real subprocess executor. */
  execute?: (
    command: string[],
    repositoryRoot: string,
  ) => Promise<CommandResult>
}): Promise<{ report: ComponentVerificationReport; reportPath: string }>
