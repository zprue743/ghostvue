/**
 * Logic behind the opt-in "Update visual baselines" workflow (GHO-204).
 *
 * The workflow regenerates only the Playwright visual snapshots that fail on a
 * pull request, confirms them with a second run, and commits nothing but
 * snapshot files. Everything here is pure or takes injected runners so the
 * decisions (which tests to regenerate, which paths may be committed, what the
 * commit says) are unit-tested without Docker or GitHub.
 */

/**
 * The only paths the workflow may commit: Linux Chromium baselines that sit
 * directly in a `tests/e2e/<spec>.spec.ts-snapshots/` directory. Requiring the
 * `-chromium-linux.png` suffix keeps host-rendered or other-browser snapshots
 * out, and the flat directory shape rules out `..` traversal.
 */
const SNAPSHOT_PATH =
  /^tests\/e2e\/[\w.-]+\.spec\.ts-snapshots\/[^/\\]+-chromium-linux\.png$/

/**
 * Error messages Playwright produces when a screenshot assertion fails because
 * the baseline differs or does not exist yet. Any other failure (timeouts,
 * functional assertions, crashes) cannot be fixed by regenerating baselines.
 */
const SNAPSHOT_ERROR =
  /toHaveScreenshot|toMatchSnapshot|Screenshot comparison failed|A snapshot doesn't exist/

// eslint-disable-next-line no-control-regex -- ANSI color escapes start with ESC.
const ANSI_ESCAPE = /\u001b\[[0-9;]*m/g

/** Comments list at most this many tests or files to stay readable. */
const LIST_LIMIT = 30

/**
 * @param {string} path
 * @returns {boolean}
 */
export function isBaselineSnapshotPath(path) {
  return SNAPSHOT_PATH.test(path)
}

/**
 * @param {string} message
 * @returns {string}
 */
function stripAnsi(message) {
  return message.replace(ANSI_ESCAPE, '')
}

/**
 * @param {string} from
 * @param {string} to
 * @returns {string}
 */
function relativePosix(from, to) {
  const fromParts = from.split(/[\\/]/).filter(Boolean)
  const toParts = to.split(/[\\/]/).filter(Boolean)
  let shared = 0
  while (
    shared < fromParts.length &&
    shared < toParts.length &&
    fromParts[shared] === toParts[shared]
  ) {
    shared += 1
  }
  return [
    ...fromParts.slice(shared).map(() => '..'),
    ...toParts.slice(shared),
  ].join('/')
}

/**
 * @typedef {{
 *   file: string
 *   line: number
 *   title: string
 *   project: string
 *   messages: string[]
 * }} VisualTestFailure
 */

/**
 * Walks a Playwright JSON reporter report and splits failing tests into
 * screenshot failures (fixable by regenerating baselines) and other failures.
 *
 * `file` is returned relative to `cwd` (normally the repository root) so it can
 * be passed back to `playwright test` as a `file:line` location filter.
 *
 * @param {unknown} report Parsed Playwright JSON report.
 * @param {{ cwd: string }} options
 * @returns {{
 *   snapshotFailures: VisualTestFailure[]
 *   otherFailures: VisualTestFailure[]
 *   globalErrors: string[]
 * }}
 */
export function collectVisualFailures(report, { cwd }) {
  if (!report || typeof report !== 'object' || !('suites' in report)) {
    throw new Error('Not a Playwright JSON report (no `suites`).')
  }
  /** @type {any} */
  const data = report
  const rootDir =
    typeof data.config?.rootDir === 'string' ? data.config.rootDir : cwd
  const testDir = relativePosix(cwd, rootDir)

  /** @type {VisualTestFailure[]} */
  const snapshotFailures = []
  /** @type {VisualTestFailure[]} */
  const otherFailures = []

  /**
   * @param {any} suite
   * @param {string[] | null} titlePath Null for the top-level file suite,
   *   whose title is the file name.
   */
  function visit(suite, titlePath) {
    const nextPath =
      titlePath === null
        ? []
        : suite.title
          ? [...titlePath, suite.title]
          : titlePath
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        if (test.status !== 'unexpected') continue
        const messages = (test.results ?? [])
          .filter((/** @type {any} */ result) => result.status !== 'passed')
          .flatMap((/** @type {any} */ result) =>
            (result.errors?.length ? result.errors : [result.error])
              .filter(Boolean)
              .map((/** @type {any} */ error) =>
                stripAnsi(String(error.message ?? error.value ?? '')),
              ),
          )
        const failure = {
          file: testDir ? `${testDir}/${spec.file}` : spec.file,
          line: spec.line,
          title: [...nextPath, spec.title].join(' › '),
          project: test.projectName ?? '',
          messages,
        }
        const fixable =
          messages.length > 0 &&
          messages.every((message) => SNAPSHOT_ERROR.test(message))
        ;(fixable ? snapshotFailures : otherFailures).push(failure)
      }
    }
    for (const child of suite.suites ?? []) visit(child, nextPath)
  }

  for (const suite of data.suites) visit(suite, null)

  const globalErrors = (Array.isArray(data.errors) ? data.errors : []).map(
    (/** @type {any} */ error) =>
      stripAnsi(String(error?.message ?? error?.value ?? error)),
  )
  return { snapshotFailures, otherFailures, globalErrors }
}

/**
 * Unique, sorted `file:line` filters for the given failures. Tests generated in
 * a loop share one line, so a location can select passing siblings too; the
 * update run therefore uses `--update-snapshots=changed`, which rewrites only
 * baselines that actually mismatch.
 *
 * @param {VisualTestFailure[]} failures
 * @returns {string[]}
 */
export function failureLocations(failures) {
  return [
    ...new Set(failures.map(({ file, line }) => `${file}:${String(line)}`)),
  ].sort()
}

/**
 * Parses `git status --porcelain=v1 -z --untracked-files=all` output.
 *
 * @param {string} output
 * @returns {{ status: string, path: string, from?: string }[]}
 */
export function parsePorcelainStatus(output) {
  const fields = output.split('\0')
  /** @type {{ status: string, path: string, from?: string }[]} */
  const entries = []
  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index]
    if (!field) continue
    const status = field.slice(0, 2)
    const path = field.slice(3)
    // Renames and copies carry the source path as the next NUL field.
    if (status.includes('R') || status.includes('C')) {
      entries.push({ status, path, from: fields[index + 1] ?? '' })
      index += 1
    } else {
      entries.push({ status, path })
    }
  }
  return entries
}

/**
 * Splits working-tree changes into committable baselines and offenders. Only
 * modified or new snapshot files are allowed: a deletion, rename, or any other
 * path means something besides baseline regeneration touched the checkout.
 *
 * @param {{ status: string, path: string, from?: string }[]} entries
 * @returns {{ snapshotFiles: string[], offenders: string[] }}
 */
export function checkSnapshotOnlyChanges(entries) {
  /** @type {string[]} */
  const snapshotFiles = []
  /** @type {string[]} */
  const offenders = []
  for (const { status, path, from } of entries) {
    const allowedStatus = status === '??' || /^[ MA][ M]$/.test(status)
    if (allowedStatus && isBaselineSnapshotPath(path)) {
      snapshotFiles.push(path)
    } else {
      offenders.push(
        from ? `${status} ${from} -> ${path}` : `${status} ${path}`,
      )
    }
  }
  return { snapshotFiles: snapshotFiles.sort(), offenders: offenders.sort() }
}

/**
 * Finds the Linear key (`GHO-123`) in the pull request title, falling back to
 * the branch name (`agent/gho-123-short-name`). Returns null when neither has
 * one.
 *
 * @param {{ title?: string | null, branch?: string | null }} pullRequest
 * @returns {string | null}
 */
export function deriveGhoKey({ title, branch }) {
  for (const source of [title, branch]) {
    const match = /\bGHO-(\d+)\b/i.exec(source ?? '')
    if (match) return `GHO-${String(match[1])}`
  }
  return null
}

/**
 * Commit message for a regenerated-baselines commit. Without a GHO key the
 * pull request number identifies what the commit belongs to.
 *
 * @param {{ title?: string | null, branch?: string | null, prNumber: number | string }} pullRequest
 * @returns {string}
 */
export function baselineCommitMessage({ title, branch, prNumber }) {
  const key = deriveGhoKey({ title, branch }) ?? `#${String(prNumber)}`
  return `test(visual): regenerate baselines (${key})`
}

/**
 * @typedef {{
 *   locations?: string[]
 *   updateSnapshots: 'none' | 'changed'
 * }} PlaywrightRunRequest
 */

/**
 * @typedef {{
 *   outcome: 'noop' | 'changes' | 'failed'
 *   summary: string
 *   details: string[]
 *   files: string[]
 * }} RegenerationResult
 */

/**
 * @param {string} heading
 * @param {string[]} items
 * @returns {string[]}
 */
function list(heading, items) {
  if (items.length === 0) return []
  const shown = items.slice(0, LIST_LIMIT).map((item) => `- ${item}`)
  if (items.length > LIST_LIMIT) {
    shown.push(`- … and ${String(items.length - LIST_LIMIT)} more`)
  }
  return [heading, '', ...shown, '']
}

/**
 * @param {VisualTestFailure} failure
 * @returns {string}
 */
function describeFailure({ file, line, title, messages }) {
  const firstLine = messages[0]?.split('\n').find((text) => text.trim()) ?? ''
  const reason = firstLine ? `: ${firstLine.trim().slice(0, 200)}` : ''
  return `\`${file}:${String(line)}\` ${title}${reason}`
}

/**
 * Runs the regeneration flow:
 *
 * 1. run every visual test without updating snapshots;
 * 2. stop with no changes when nothing fails, or with a failure when any test
 *    fails for a reason other than a screenshot mismatch;
 * 3. rerun only the failing locations with `--update-snapshots=changed`;
 * 4. rerun them again without updating to confirm they now pass;
 * 5. require the working tree to contain only snapshot changes.
 *
 * `runPlaywright` resolves to the parsed JSON report of one run (it must not
 * throw on test failures). `readStatus` returns porcelain `-z` git status.
 *
 * @param {{
 *   runPlaywright: (request: PlaywrightRunRequest) => Promise<unknown>
 *   readStatus: () => Promise<string>
 *   cwd: string
 *   locations?: string[]
 * }} options
 * @returns {Promise<RegenerationResult>}
 */
export async function regenerateBaselines({
  runPlaywright,
  readStatus,
  cwd,
  locations = [],
}) {
  const initial = collectVisualFailures(
    await runPlaywright({ locations, updateSnapshots: 'none' }),
    { cwd },
  )
  if (initial.globalErrors.length > 0) {
    return failed('The visual suite could not run.', [
      ...list('Errors:', initial.globalErrors.map(firstLineOf)),
    ])
  }
  if (initial.otherFailures.length > 0) {
    return failed(
      'Some visual tests fail for reasons other than a screenshot mismatch, so regenerating baselines would not fix them.',
      [
        ...list(
          'Non-screenshot failures:',
          initial.otherFailures.map(describeFailure),
        ),
        ...list(
          'Screenshot failures (not regenerated):',
          initial.snapshotFailures.map(describeFailure),
        ),
      ],
    )
  }
  if (initial.snapshotFailures.length === 0) {
    return {
      outcome: 'noop',
      summary: 'Every visual test already passes; no baselines were changed.',
      details: [],
      files: [],
    }
  }

  const targets = failureLocations(initial.snapshotFailures)
  const failingTitles = initial.snapshotFailures.map(describeFailure)

  const update = collectVisualFailures(
    await runPlaywright({ locations: targets, updateSnapshots: 'changed' }),
    { cwd },
  )
  const updateFailures = [...update.otherFailures, ...update.snapshotFailures]
  if (update.globalErrors.length > 0 || updateFailures.length > 0) {
    return failed('Regenerating the failing baselines failed.', [
      ...list('Errors:', update.globalErrors.map(firstLineOf)),
      ...list(
        'Failures during the update run:',
        updateFailures.map(describeFailure),
      ),
    ])
  }

  const confirm = collectVisualFailures(
    await runPlaywright({ locations: targets, updateSnapshots: 'none' }),
    { cwd },
  )
  const confirmFailures = [
    ...confirm.otherFailures,
    ...confirm.snapshotFailures,
  ]
  if (confirm.globalErrors.length > 0 || confirmFailures.length > 0) {
    return failed(
      'Some visual tests still fail after their baselines were regenerated (likely nondeterministic rendering).',
      [
        ...list('Errors:', confirm.globalErrors.map(firstLineOf)),
        ...list('Still failing:', confirmFailures.map(describeFailure)),
      ],
    )
  }

  const { snapshotFiles, offenders } = checkSnapshotOnlyChanges(
    parsePorcelainStatus(await readStatus()),
  )
  if (offenders.length > 0) {
    return failed(
      'The checkout changed outside the Playwright snapshot directories, so nothing was committed.',
      [
        ...list(
          'Unexpected changes:',
          offenders.map((entry) => `\`${entry}\``),
        ),
      ],
    )
  }
  if (snapshotFiles.length === 0) {
    return failed(
      'Visual tests failed at first but passed after the update run without any baseline changing. The failures look flaky; nothing was committed.',
      [...list('Initially failing:', failingTitles)],
    )
  }
  return {
    outcome: 'changes',
    summary: `Regenerated ${String(snapshotFiles.length)} baseline file(s) for ${String(initial.snapshotFailures.length)} failing visual test(s).`,
    details: [
      ...list('Regenerated tests:', failingTitles),
      ...list(
        'Changed files:',
        snapshotFiles.map((file) => `\`${file}\``),
      ),
    ],
    files: snapshotFiles,
  }
}

/**
 * @param {string} message
 * @returns {string}
 */
function firstLineOf(message) {
  return (
    message
      .split('\n')
      .find((text) => text.trim())
      ?.trim() ?? message
  )
}

/**
 * @param {string} summary
 * @param {string[]} details
 * @returns {RegenerationResult}
 */
function failed(summary, details) {
  return { outcome: 'failed', summary, details, files: [] }
}

/**
 * Markdown body (without the push status) describing a regeneration result.
 *
 * @param {RegenerationResult} result
 * @returns {string}
 */
export function formatResultMarkdown(result) {
  return [result.summary, '', ...result.details].join('\n').trimEnd() + '\n'
}
