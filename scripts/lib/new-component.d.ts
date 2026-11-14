export interface ComponentIdentity {
  name: string
  suffix: string
  slug: string
}

export interface ScaffoldResult {
  name: string
  created: string[]
  updated: string[]
  dryRun: boolean
}

export function componentIdentity(input: string): ComponentIdentity
export function scaffoldComponent(
  repositoryRoot: string,
  input: string,
  options?: { dryRun?: boolean },
): Promise<ScaffoldResult>
