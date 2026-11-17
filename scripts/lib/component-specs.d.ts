export const CURRENT_SPEC_SCHEMA_VERSION: string
export const SPEC_STATUSES: readonly string[]
export const REQUIRED_SECTION_KEYS: readonly string[]
export const SECTION_HEADING_ALIASES: Record<string, readonly string[]>

export interface SpecValidationResult {
  violations: string[]
  frontmatter: Record<string, unknown> | null
}

export interface SpecCheckResult {
  ok: boolean
  violations: string[]
  specCount: number
  approvedCount: number
  exportedCount: number
}

export interface ApprovedSpecReference {
  path: string
  status: 'approved'
  evidence: string
}

export function parseSimpleYaml(source: string): Record<string, unknown>
export function extractFrontmatter(
  markdown: string,
): { frontmatter: Record<string, unknown>; body: string } | null
export function extractH2Sections(body: string): Map<string, string>
export function validateSpecDocument(options: {
  repositoryRoot: string
  relativePath: string
  content: string
}): Promise<SpecValidationResult>
export function checkComponentSpecs(
  repositoryRoot: string,
): Promise<SpecCheckResult>
export function loadApprovedSpecMetadata(
  repositoryRoot: string,
): Promise<Map<string, ApprovedSpecReference>>
