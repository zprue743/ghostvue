export interface ChangedFileEntry {
  path: string
  status?: string
}

export interface PublishableInputMatch {
  directory: string
  packageName: string
  path: string
}

export interface PrChangesetEvaluation {
  status: 'skip' | 'pass' | 'fail'
  reason: string
  changedPublishableFiles: string[]
  affectedPackages: string[]
  addedOrModifiedChangesets: string[]
}

export function isAddedOrModifiedChangeset(entry: {
  path: string
  status: string
}): boolean

export function matchPublishablePackageInput(
  filePath: string,
  options?: {
    isDependabotDependenciesPr?: boolean
    readAtBase?: (file: string) => string | null
    readAtHead?: (file: string) => string | null
  },
): PublishableInputMatch | null

export function evaluatePrChangeset(params: {
  eventName: string
  files: readonly (string | ChangedFileEntry)[]
  labels?: readonly string[]
  authorLogin?: string
  readAtBase?: (file: string) => string | null
  readAtHead?: (file: string) => string | null
}): PrChangesetEvaluation

export function formatPrChangesetFailure(result: {
  changedPublishableFiles: readonly string[]
  affectedPackages: readonly string[]
}): string
