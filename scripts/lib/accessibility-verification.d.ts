export const KEYBOARD_EVIDENCE_PROJECT: 'chromium-e2e'
export const KEYBOARD_EVIDENCE_TEST_DIR: 'tests/e2e'
export const VERIFICATION_SCHEMA_VERSION: string
export const VERIFICATION_CATEGORIES: readonly [
  'automatedKeyboard',
  'manual',
  'assistiveTechnology',
]
export const TITLE_SEPARATOR: ' › '

export type VerificationStatus = 'passed' | 'failed' | 'not-reviewed'

export interface KeyboardTestReference {
  spec: string
  title: string
  package: string
}

export interface ReviewEvidence {
  component: string
  package: string
  revision: string
  date: string
  reviewer: string
  environment: {
    assistiveTechnology?: string
    browser: string
    platform: string
  }
  reference: string
  summary: string
}

export interface ResolvedVerification {
  /** False when the manifest has no accessibility.verification object. */
  recorded: boolean
  automatedKeyboard: {
    status: VerificationStatus
    keys: Record<string, KeyboardTestReference[]>
  }
  manual: { status: VerificationStatus; evidence: ReviewEvidence[] }
  assistiveTechnology: {
    status: VerificationStatus
    evidence: ReviewEvidence[]
  }
}

export interface ManifestEntry {
  file: string
  manifest: Record<string, unknown>
}

export function resolveVerification(
  manifest: Record<string, unknown>,
): ResolvedVerification
export function validateVerificationContract(
  manifest: Record<string, unknown>,
  options: { file: string; specExists: (spec: string) => boolean },
): string[]
export function loadRepositoryManifests(
  repositoryRoot: string,
  packages?: readonly { directory: string }[],
): Promise<ManifestEntry[]>
export function validateRepositoryVerification(
  repositoryRoot: string,
  entries: readonly ManifestEntry[],
): string[]
export interface ReportTest {
  projectName?: string
  expectedStatus?: string
  status?: string
  results?: { status?: string }[]
}
export function indexPlaywrightReport(
  report: unknown,
): Map<string, ReportTest[]>
export function checkKeyboardEvidence(
  entries: readonly ManifestEntry[],
  report: unknown,
  options: { mode: 'list' | 'results' },
): string[]
