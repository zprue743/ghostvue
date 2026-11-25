#!/usr/bin/env node
/**
 * Steps of the opt-in "Update visual baselines" workflow (GHO-204). See
 * docs/standards/testing.md#regenerating-baselines-in-ci.
 *
 *   node scripts/update-visual-baselines.mjs regenerate --out <dir> [-- <file:line>...]
 *   node scripts/update-visual-baselines.mjs apply --from <dir>
 *   PR_TITLE=… PR_HEAD_REF=… PR_NUMBER=… node scripts/update-visual-baselines.mjs commit-message
 *
 * `regenerate` runs inside the pinned Playwright image after the playground and
 * docs are built. It never commits; it writes `result.json`, `comment.md`, and
 * the regenerated snapshots under `<dir>/files/` for the publish job.
 *
 * `apply` runs in the publish job, which holds the push token but never runs
 * `pnpm install` or Playwright. It copies only files whose paths are baseline
 * snapshots out of that directory and then re-checks that the working tree has
 * nothing but snapshot changes, so a compromised regenerate job cannot smuggle
 * other files (or `.git/` hooks) into the commit.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import {
  appendFileSync,
  copyFileSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'

import {
  baselineCommitMessage,
  checkSnapshotOnlyChanges,
  formatResultMarkdown,
  isBaselineSnapshotPath,
  parsePorcelainStatus,
  regenerateBaselines,
} from './lib/visual-baselines.js'

const cwd = process.cwd()

/**
 * @param {string[]} argv
 * @param {string} name
 * @returns {string}
 */
function requiredOption(argv, name) {
  const index = argv.indexOf(name)
  const value = index === -1 ? undefined : argv[index + 1]
  if (!value || value.startsWith('--')) {
    throw new Error(`Missing required option ${name} <dir>.`)
  }
  return resolve(value)
}

/**
 * @param {Record<string, string>} outputs
 */
function writeOutputs(outputs) {
  const outputPath = process.env.GITHUB_OUTPUT
  if (!outputPath) return
  appendFileSync(
    outputPath,
    Object.entries(outputs)
      .map(([key, value]) => `${key}=${value}\n`)
      .join(''),
  )
}

function readStatus() {
  return execFileSync(
    'git',
    ['status', '--porcelain=v1', '-z', '--untracked-files=all'],
    { cwd, encoding: 'utf8' },
  )
}

/**
 * Runs the Chromium visual project once and returns its JSON report. Test
 * failures are expected here, so the exit code is ignored; a missing or
 * unreadable report is the error signal instead.
 *
 * @param {string} reportsDir
 */
function createPlaywrightRunner(reportsDir) {
  let run = 0
  /**
   * @param {{ locations?: string[], updateSnapshots: 'none' | 'changed' }} request
   */
  return async ({ locations = [], updateSnapshots }) => {
    run += 1
    const reportPath = join(reportsDir, `run-${String(run)}.json`)
    const args = [
      'exec',
      'playwright',
      'test',
      '--project=chromium',
      `--update-snapshots=${updateSnapshots}`,
      // The CLI reporter replaces the config's CI reporters (blob/html).
      '--reporter=line,json',
      ...locations,
    ]
    console.log(`\n$ pnpm ${args.join(' ')}`)
    spawnSync('pnpm', args, {
      cwd,
      stdio: 'inherit',
      env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_FILE: reportPath },
    })
    try {
      return /** @type {unknown} */ (
        JSON.parse(readFileSync(reportPath, 'utf8'))
      )
    } catch (error) {
      throw new Error(
        `Playwright did not write a JSON report (${error instanceof Error ? error.message : String(error)}).`,
        { cause: error },
      )
    }
  }
}

/**
 * @param {string[]} argv
 */
async function regenerate(argv) {
  const separator = argv.indexOf('--')
  const options = separator === -1 ? argv : argv.slice(0, separator)
  const locations = separator === -1 ? [] : argv.slice(separator + 1)
  const outDir = requiredOption(options, '--out')
  rmSync(outDir, { recursive: true, force: true })
  const reportsDir = join(outDir, 'reports')
  mkdirSync(reportsDir, { recursive: true })

  /** @type {import('./lib/visual-baselines.js').RegenerationResult} */
  let result
  try {
    result = await regenerateBaselines({
      runPlaywright: createPlaywrightRunner(reportsDir),
      readStatus: () => Promise.resolve(readStatus()),
      cwd,
      locations,
    })
  } catch (error) {
    result = {
      outcome: 'failed',
      summary: 'Baseline regeneration crashed before it could finish.',
      details: [
        '```text',
        error instanceof Error ? error.message : String(error),
        '```',
      ],
      files: [],
    }
  }

  for (const file of result.files) {
    const target = join(outDir, 'files', file)
    mkdirSync(dirname(target), { recursive: true })
    copyFileSync(join(cwd, file), target)
  }
  writeFileSync(
    join(outDir, 'result.json'),
    `${JSON.stringify(result, null, 2)}\n`,
  )
  writeFileSync(join(outDir, 'comment.md'), formatResultMarkdown(result))
  writeOutputs({ outcome: result.outcome })
  console.log(`\n${result.outcome}: ${result.summary}`)
}

/**
 * @param {string} directory
 * @returns {string[]}
 */
function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return listFiles(path)
    return [path]
  })
}

/**
 * @param {string[]} argv
 */
function apply(argv) {
  const filesDir = join(requiredOption(argv, '--from'), 'files')
  const sources = listFiles(filesDir)
  const rejected = []
  for (const source of sources) {
    const path = relative(filesDir, source).split(sep).join('/')
    // Symlinks could point the copy outside the snapshot directories.
    if (!lstatSync(source).isFile() || !isBaselineSnapshotPath(path)) {
      rejected.push(path)
    }
  }
  if (rejected.length > 0) {
    throw new Error(
      `Refusing to apply non-snapshot files:\n- ${rejected.join('\n- ')}`,
    )
  }
  for (const source of sources) {
    const target = join(cwd, relative(filesDir, source))
    mkdirSync(dirname(target), { recursive: true })
    copyFileSync(source, target)
  }

  const { snapshotFiles, offenders } = checkSnapshotOnlyChanges(
    parsePorcelainStatus(readStatus()),
  )
  if (offenders.length > 0) {
    throw new Error(
      `The working tree has non-snapshot changes:\n- ${offenders.join('\n- ')}`,
    )
  }
  if (snapshotFiles.length === 0) {
    throw new Error('No snapshot files changed; nothing to commit.')
  }
  writeOutputs({ count: String(snapshotFiles.length) })
  console.log(`Applied ${String(snapshotFiles.length)} snapshot file(s).`)
}

function commitMessage() {
  const prNumber = process.env.PR_NUMBER
  if (!prNumber) throw new Error('commit-message requires PR_NUMBER.')
  console.log(
    baselineCommitMessage({
      title: process.env.PR_TITLE ?? null,
      branch: process.env.PR_HEAD_REF ?? null,
      body: process.env.PR_BODY ?? null,
      prNumber,
    }),
  )
}

const [command, ...rest] = process.argv.slice(2)
try {
  if (command === 'regenerate') await regenerate(rest)
  else if (command === 'apply') apply(rest)
  else if (command === 'commit-message') commitMessage()
  else {
    throw new Error(
      'Usage: update-visual-baselines.mjs <regenerate|apply|commit-message> [options]',
    )
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
