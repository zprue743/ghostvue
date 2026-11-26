import { publishableWorkspacePackages } from '../workspace-packages.mjs'

const PUBLISHABLE_BY_DIRECTORY = new Map(
  publishableWorkspacePackages.map((pkg) => [pkg.directory, pkg.name]),
)

const TEST_FILE_PATTERN = /\.(?:test|spec)\.[^/]+$/u
const SCHEMA_FILE_PATTERN = /\.schema\.json$/u
const PUBLISHED_DEPENDENCY_FIELDS = [
  'dependencies',
  'peerDependencies',
  'optionalDependencies',
]

/**
 * Normalize a repository-relative path to forward slashes.
 *
 * @param {string} filePath
 * @returns {string}
 */
function normalizePath(filePath) {
  return filePath.replaceAll('\\', '/').replace(/^\.\//u, '')
}

/**
 * Normalize changed file entries from either plain strings or `{ path, status }`
 * records.
 *
 * @param {readonly (string | { path: string; status?: string })[]} entries
 * @returns {{ path: string; status: string }[]}
 */
function normalizeChangedEntries(entries) {
  return entries.map((entry) =>
    typeof entry === 'string'
      ? { path: normalizePath(entry), status: 'M' }
      : { path: normalizePath(entry.path), status: entry.status ?? 'M' },
  )
}

/**
 * True when a changed entry adds or modifies a Changeset markdown file.
 * Excludes `.changeset/README.md` and deleted entries.
 *
 * @param {{ path: string; status: string }} entry
 * @returns {boolean}
 */
export function isAddedOrModifiedChangeset(entry) {
  if (entry.status.startsWith('D')) return false
  return (
    /^\.changeset\/[^/]+\.md$/u.test(entry.path) &&
    entry.path !== '.changeset/README.md'
  )
}

/**
 * Parse JSON safely, returning null on invalid or missing input.
 *
 * @param {string | null | undefined} content
 * @returns {Record<string, unknown> | null}
 */
function tryParseJson(content) {
  if (!content) return null
  try {
    const parsed = JSON.parse(content)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

/**
 * Return a stable JSON string for the published dependency groups of a package
 * manifest so devDependency-only edits can be distinguished from runtime/peer
 * dependency changes.
 *
 * @param {Record<string, unknown>} manifest
 * @returns {string}
 */
function serializePublishedDependencies(manifest) {
  const normalized = {}
  for (const field of PUBLISHED_DEPENDENCY_FIELDS) {
    const group = manifest[field]
    if (!group || typeof group !== 'object' || Array.isArray(group)) {
      normalized[field] = {}
      continue
    }
    const sorted = {}
    for (const key of Object.keys(group).sort()) {
      sorted[key] = group[key]
    }
    normalized[field] = sorted
  }
  return JSON.stringify(normalized)
}

/**
 * True when a `package.json` edit only touches non-published fields (such as
 * `devDependencies`) without changing `dependencies`, `peerDependencies`, or
 * `optionalDependencies`.
 *
 * @param {string} filePath
 * @param {{
 *   readAtBase?: (file: string) => string | null
 *   readAtHead?: (file: string) => string | null
 * }} options
 * @returns {boolean}
 */
function isDevDependencyOnlyManifestEdit(filePath, options) {
  const baseManifest = tryParseJson(options.readAtBase?.(filePath))
  const headManifest = tryParseJson(options.readAtHead?.(filePath))
  if (!baseManifest || !headManifest) return false
  return (
    serializePublishedDependencies(baseManifest) ===
    serializePublishedDependencies(headManifest)
  )
}

/**
 * Classify whether a changed file touches publishable runtime, type, CSS, or
 * schema inputs of a package marked `publishable: true` in
 * `scripts/workspace-packages.mjs`.
 *
 * @param {string} filePath
 * @param {{
 *   isDependabotDependenciesPr?: boolean
 *   readAtBase?: (file: string) => string | null
 *   readAtHead?: (file: string) => string | null
 * }} [options]
 * @returns {{ directory: string; packageName: string; path: string } | null}
 */
export function matchPublishablePackageInput(filePath, options = {}) {
  const normalized = normalizePath(filePath)
  const match = /^packages\/([^/]+)\/(.+)$/u.exec(normalized)
  if (!match) return null

  const [, directory = '', relativePath = ''] = match
  const packageName = PUBLISHABLE_BY_DIRECTORY.get(directory)
  if (!packageName) return null

  if (relativePath === 'AGENTS.md') return null
  if (relativePath.startsWith('manifests/')) return null
  if (TEST_FILE_PATTERN.test(relativePath)) return null

  if (relativePath === 'package.json') {
    if (
      options.isDependabotDependenciesPr &&
      isDevDependencyOnlyManifestEdit(normalized, options)
    ) {
      return null
    }
    return { directory, packageName, path: normalized }
  }

  if (
    relativePath.startsWith('src/') ||
    relativePath.startsWith('tokens/') ||
    relativePath.startsWith('schemas/') ||
    SCHEMA_FILE_PATTERN.test(relativePath)
  ) {
    return { directory, packageName, path: normalized }
  }

  return null
}

/**
 * Evaluate whether a CI event satisfies the PR Changeset policy.
 *
 * @param {{
 *   eventName: string
 *   files: readonly (string | { path: string; status?: string })[]
 *   labels?: readonly string[]
 *   authorLogin?: string
 *   readAtBase?: (file: string) => string | null
 *   readAtHead?: (file: string) => string | null
 * }} params
 * @returns {{
 *   status: 'skip' | 'pass' | 'fail'
 *   reason: string
 *   changedPublishableFiles: string[]
 *   affectedPackages: string[]
 *   addedOrModifiedChangesets: string[]
 * }}
 */
export function evaluatePrChangeset({
  eventName,
  files,
  labels = [],
  authorLogin = '',
  readAtBase,
  readAtHead,
}) {
  if (eventName !== 'pull_request') {
    return {
      status: 'skip',
      reason: `Event '${eventName}' does not require PR Changeset enforcement.`,
      changedPublishableFiles: [],
      affectedPackages: [],
      addedOrModifiedChangesets: [],
    }
  }

  const entries = normalizeChangedEntries(files)
  const addedOrModifiedChangesets = entries
    .filter(isAddedOrModifiedChangeset)
    .map((entry) => entry.path)

  const isDependabotDependenciesPr =
    authorLogin === 'dependabot[bot]' && labels.includes('dependencies')

  const matchedInputs = entries
    .map((entry) =>
      matchPublishablePackageInput(entry.path, {
        isDependabotDependenciesPr,
        readAtBase,
        readAtHead,
      }),
    )
    .filter((item) => item !== null)

  const changedPublishableFiles = matchedInputs.map((item) => item.path)
  const affectedPackages = [
    ...new Set(matchedInputs.map((item) => item.packageName)),
  ]

  if (changedPublishableFiles.length === 0) {
    return {
      status: 'pass',
      reason: isDependabotDependenciesPr
        ? 'Dependabot devDependency-only bump or no publishable inputs changed.'
        : 'No publishable package inputs changed.',
      changedPublishableFiles,
      affectedPackages,
      addedOrModifiedChangesets,
    }
  }

  if (addedOrModifiedChangesets.length > 0) {
    return {
      status: 'pass',
      reason: `Found Changeset entry: ${addedOrModifiedChangesets.join(', ')}.`,
      changedPublishableFiles,
      affectedPackages,
      addedOrModifiedChangesets,
    }
  }

  if (labels.includes('no-changeset')) {
    return {
      status: 'pass',
      reason: "PR carries the 'no-changeset' opt-out label.",
      changedPublishableFiles,
      affectedPackages,
      addedOrModifiedChangesets,
    }
  }

  return {
    status: 'fail',
    reason:
      'Publishable package inputs changed without a Changeset entry or opt-out label.',
    changedPublishableFiles,
    affectedPackages,
    addedOrModifiedChangesets,
  }
}

/**
 * Format an actionable failure message listing the changed publishable paths
 * and how to resolve the check.
 *
 * @param {{
 *   changedPublishableFiles: readonly string[]
 *   affectedPackages: readonly string[]
 * }} result
 * @returns {string}
 */
export function formatPrChangesetFailure(result) {
  const packageList = result.affectedPackages.join(', ')
  const fileLines = result.changedPublishableFiles
    .map((file) => `  - ${file}`)
    .join('\n')

  return [
    `Missing Changeset for publishable package changes (${packageList}).`,
    'Changed publishable paths:',
    fileLines,
    '',
    'To fix this:',
    '  1. Run `pnpm changeset` (or add `.changeset/<slug>.md`) if consumer-visible behavior, types, styles, or dependencies changed.',
    '  2. Or apply the `no-changeset` label to this PR if no consumer-visible behavior changed.',
  ].join('\n')
}

/**
 * Extract label names from GitHub label objects or strings.
 *
 * @param {readonly unknown[] | undefined} labels
 * @returns {string[]}
 */
export function extractLabelNames(labels) {
  if (!Array.isArray(labels)) return []
  return labels
    .map((label) =>
      typeof label === 'string'
        ? label
        : label && typeof label === 'object' && 'name' in label
          ? label.name
          : undefined,
    )
    .filter((name) => typeof name === 'string')
}

/**
 * Resolve current PR labels via the GitHub API when credentials and PR metadata
 * are available, falling back to the event payload labels so manual re-runs see
 * label updates made after the original webhook delivery.
 *
 * @param {{
 *   payloadLabels?: readonly unknown[]
 *   repository?: string
 *   prNumber?: number
 *   token?: string
 *   apiUrl?: string
 *   fetchImpl?: typeof fetch
 *   onWarning?: (message: string) => void
 * }} params
 * @returns {Promise<string[]>}
 */
export async function resolvePrLabels({
  payloadLabels,
  repository,
  prNumber,
  token,
  apiUrl = 'https://api.github.com',
  fetchImpl = globalThis.fetch,
  onWarning = (message) => console.warn(message),
}) {
  const fallback = extractLabelNames(payloadLabels)
  if (
    !token ||
    !repository ||
    typeof prNumber !== 'number' ||
    !Number.isFinite(prNumber) ||
    typeof fetchImpl !== 'function'
  ) {
    return fallback
  }

  const baseUrl = apiUrl.replace(/\/+$/u, '')
  const url = `${baseUrl}/repos/${repository}/issues/${prNumber}/labels?per_page=100`

  try {
    const response = await fetchImpl(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'User-Agent': 'ghostvue-pr-changeset-check',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })
    if (!response.ok) {
      onWarning(
        `Failed to fetch live PR labels (${response.status}); falling back to event payload labels.`,
      )
      return fallback
    }
    const data = await response.json()
    if (!Array.isArray(data)) {
      onWarning(
        'Unexpected GitHub API response when fetching PR labels; falling back to event payload labels.',
      )
      return fallback
    }
    return extractLabelNames(data)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    onWarning(
      `Failed to fetch live PR labels (${detail}); falling back to event payload labels.`,
    )
    return fallback
  }
}
