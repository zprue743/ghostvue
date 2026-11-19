/** @vitest-environment node */

/**
 * Guards the CI supply-chain policy in docs/contributing/ci.md (GHO-53).
 *
 * Workflows are read as text rather than parsed as YAML so the guard needs no
 * extra development dependency. The assertions rely only on this repository's
 * Prettier-formatted layout: two-space indentation and one `uses:` per line.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const repositoryRoot = process.cwd()
const workflowsDir = resolve(repositoryRoot, '.github/workflows')

function readRepoFile(relativePath: string): string {
  return readFileSync(resolve(repositoryRoot, relativePath), 'utf8')
}

const workflowFiles = readdirSync(workflowsDir)
  .filter((file) => /\.ya?ml$/.test(file))
  .sort()

/** Returns the lines of one top-level job (`  <id>:`) under `jobs:`. */
function jobBlock(workflow: string, jobId: string): string {
  const lines = workflow.split('\n')
  const start = lines.indexOf(`  ${jobId}:`)
  if (start === -1) throw new Error(`Job ${jobId} not found`)
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((line) => /^ {2}\S/.test(line) || /^\S/.test(line))
  return rest.slice(0, end === -1 ? undefined : end).join('\n')
}

/** Splits a job block into its steps (each starting at `      - `). */
function jobSteps(block: string): string[] {
  const lines = block.split('\n')
  const start = lines.indexOf('    steps:')
  if (start === -1) throw new Error('steps block not found')
  const steps: string[][] = []
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('      - ')) steps.push([line])
    else steps.at(-1)?.push(line)
  }
  return steps.map((step) => step.join('\n'))
}

/** Returns `key: value` pairs nested directly under a `permissions:` line. */
function permissionsUnder(
  block: string,
  indent: string,
): Record<string, string> {
  const lines = block.split('\n')
  const start = lines.indexOf(`${indent}permissions:`)
  if (start === -1) throw new Error('permissions block not found')
  const entries: Record<string, string> = {}
  for (const line of lines.slice(start + 1)) {
    const match = new RegExp(`^${indent}  ([a-z-]+): ([a-z]+)$`).exec(line)
    if (match) {
      entries[match[1]] = match[2]
      continue
    }
    // Comments inside the block document why each scope is granted.
    if (new RegExp(`^${indent}  #`).test(line)) continue
    break
  }
  return entries
}

interface ActionRef {
  file: string
  action: string
  ref: string
  comment: string | undefined
}

const actionRefs: ActionRef[] = workflowFiles.flatMap((file) =>
  readRepoFile(`.github/workflows/${file}`)
    .split('\n')
    .flatMap((line) => {
      const match = /^\s*(?:- )?uses:\s*([^@\s]+)@(\S+)(?:\s+#\s*(.*))?$/.exec(
        line,
      )
      return match
        ? [{ file, action: match[1], ref: match[2], comment: match[3] }]
        : []
    }),
)

describe('GitHub Actions pinning', () => {
  it('finds workflow action references to check', () => {
    expect(workflowFiles).toEqual(
      expect.arrayContaining(['ci.yml', 'codeql.yml']),
    )
    expect(actionRefs.length).toBeGreaterThan(0)
  })

  it('pins every action to a full commit SHA with an exact version comment', () => {
    const offenders = actionRefs
      .filter(
        ({ ref, comment }) =>
          !/^[0-9a-f]{40}$/.test(ref) ||
          !/^v\d+\.\d+\.\d+$/.test(comment ?? ''),
      )
      .map(
        ({ file, action, ref, comment }) =>
          `${file}: ${action}@${ref} # ${comment ?? '(missing)'}`,
      )
    expect(offenders).toEqual([])
  })

  it('uses one SHA and version per action repository across workflows', () => {
    const byRepository = new Map<string, Set<string>>()
    for (const { action, ref, comment } of actionRefs) {
      // github/codeql-action/init and /analyze must share one release.
      const repository = action.split('/').slice(0, 2).join('/')
      const pins = byRepository.get(repository) ?? new Set<string>()
      pins.add(`${ref} # ${comment ?? ''}`)
      byRepository.set(repository, pins)
    }
    const inconsistent = [...byRepository]
      .filter(([, pins]) => pins.size > 1)
      .map(([repository, pins]) => `${repository}: ${[...pins].join(', ')}`)
    expect(inconsistent).toEqual([])
  })
})

describe('CodeQL workflow', () => {
  const workflow = readRepoFile('.github/workflows/codeql.yml')
  const analyze = jobBlock(workflow, 'analyze')

  it('scans master pushes, pull requests to master, and a weekly schedule', () => {
    expect(workflow).toMatch(/^ {2}push:\n {4}branches: \[master\]$/m)
    expect(workflow).toMatch(/^ {2}pull_request:\n {4}branches: \[master\]$/m)
    expect(workflow).toMatch(
      /^ {2}schedule:\n(?: {4}#.*\n)* {4}- cron: '[^']+'$/m,
    )
  })

  it('grants no workflow-level token scopes and least privilege to the job', () => {
    expect(workflow).toMatch(/^permissions: \{\}$/m)
    expect(permissionsUnder(analyze, '    ')).toEqual({
      actions: 'read',
      contents: 'read',
      'security-events': 'write',
    })
  })

  it('analyzes JavaScript/TypeScript without a build', () => {
    expect(analyze).toMatch(
      /language: \[[^\]]*\bjavascript-typescript\b[^\]]*\]/,
    )
    expect(analyze).toMatch(/build-mode: none/)
  })
})

describe('CI workflow', () => {
  const workflow = readRepoFile('.github/workflows/ci.yml')

  it('keeps the default token read-only', () => {
    expect(workflow).toMatch(/^permissions:\n {2}contents: read$/m)
  })

  it('runs the fast verify partitions on Node 22 and 24', () => {
    const engines = (
      JSON.parse(readRepoFile('package.json')) as { engines: { node: string } }
    ).engines.node
    // The matrix floor must be the declared engines floor.
    expect(engines).toBe('>=22.0.0')

    for (const jobId of ['verify-static', 'verify-unit']) {
      const block = jobBlock(workflow, jobId)
      expect(block, jobId).toMatch(/^ {8}node: \[22, 24\]$/m)
      expect(block, jobId).toMatch(/node-version: \$\{\{ matrix\.node \}\}/)
    }
  })

  it('makes the aggregate verify check depend on every matrix partition', () => {
    const needs = /needs:\s*\[([^\]]+)\]/.exec(jobBlock(workflow, 'verify'))
    expect(needs?.[1].split(',').map((need) => need.trim())).toEqual(
      expect.arrayContaining(['verify-static', 'verify-unit']),
    )
  })

  it('runs browsers from the Playwright image matching @playwright/test', () => {
    const playwrightVersion =
      (
        JSON.parse(readRepoFile('package.json')) as {
          devDependencies: Record<string, string>
        }
      ).devDependencies['@playwright/test'] ?? ''
    expect(playwrightVersion).toMatch(/^\d+\.\d+\.\d+$/)
    const image = `mcr.microsoft.com/playwright:v${playwrightVersion}-noble`

    // The image doubles as the browser cache (Chromium preinstalled), so a
    // mismatched tag would silently run a different browser than the runner.
    for (const jobId of ['browser-shard', 'browser-cross', 'nuxt-fixture']) {
      expect(jobBlock(workflow, jobId), jobId).toContain(`image: ${image}`)
    }
    expect(readRepoFile('scripts/lib/test-visual-docker.js')).toContain(image)
    expect(workflow).not.toMatch(/run:.*playwright install/)
  })

  it('gates the aggregate verify check on the Nuxt SSR fixture', () => {
    const fixture = jobBlock(workflow, 'nuxt-fixture')
    expect(fixture).toContain('run: pnpm test:nuxt')
    expect(fixture).toMatch(/timeout-minutes: \d+/)
    const verify = jobBlock(workflow, 'verify')
    const needs = /needs:\s*\[([^\]]+)\]/.exec(verify)
    expect(needs?.[1].split(',').map((need) => need.trim())).toContain(
      'nuxt-fixture',
    )
    expect(verify).toContain('${{ needs.nuxt-fixture.result }}')
  })

  it('builds docs and playground once in verify-build and shares the dist with browser-shard', () => {
    expect(workflow).not.toMatch(/^ {2}browser-prebuild:/m)
    expect(jobBlock(workflow, 'verify-build')).toContain(
      'name: e2e-prebuilt-dist',
    )
    expect(jobBlock(workflow, 'browser-shard')).toMatch(
      /needs:\s*\[changes,\s*verify-build\]/,
    )
    expect(jobBlock(workflow, 'browser')).toMatch(
      /needs:\s*\[changes,\s*verify-build,\s*browser-shard,\s*browser-cross\]/,
    )
  })

  it('runs Chromium shards and a Firefox/WebKit cross-browser matrix behind the browser check', () => {
    const shard = jobBlock(workflow, 'browser-shard')
    expect(shard).toMatch(
      /run: pnpm test:e2e:prebuilt --project=chromium --project=chromium-e2e /,
    )

    const cross = jobBlock(workflow, 'browser-cross')
    expect(cross).toMatch(/needs:\s*\[changes,\s*verify-build\]/)
    expect(cross).toMatch(/^ {8}browser: \[firefox, webkit\]$/m)
    expect(cross).toContain(
      'run: pnpm test:e2e:prebuilt --project=${{ matrix.browser }}-e2e',
    )
    // Blob names must not collide with the Chromium shard reports when the
    // `browser` job merges every `playwright-blob-*` artifact.
    expect(cross).toContain(
      'PLAYWRIGHT_BLOB_OUTPUT_NAME: report-${{ matrix.browser }}.zip',
    )
    expect(cross).toContain('name: playwright-blob-${{ matrix.browser }}')

    const aggregate = jobBlock(workflow, 'browser')
    expect(aggregate).toContain('needs.browser-cross.result')
    expect(aggregate).toContain('pattern: playwright-blob-*')
  })

  it('limits Firefox and WebKit projects to functional @cross-browser specs', () => {
    const config = readRepoFile('playwright.config.ts')
    for (const project of ['firefox-e2e', 'webkit-e2e']) {
      const block = new RegExp(
        `name: '${project}',\\n\\s+grep: CROSS_BROWSER_TAG,\\n\\s+grepInvert: VISUAL_TAG,`,
      )
      expect(config, project).toMatch(block)
    }
    expect(config).toMatch(/const CROSS_BROWSER_TAG = \/@cross-browser\//)
    // Visual baselines stay on the single Chromium project.
    expect(config.match(/grep: VISUAL_TAG/g)).toHaveLength(1)
  })
})

describe('Renovate configuration', () => {
  const config = JSON.parse(readRepoFile('renovate.json')) as {
    extends: string[]
    rangeStrategy: string
    lockFileMaintenance: { enabled: boolean }
  }

  it('pins npm versions and GitHub Action digests', () => {
    expect(config.extends).toContain('helpers:pinGitHubActionDigests')
    expect(config.rangeStrategy).toBe('pin')
    expect(config.lockFileMaintenance.enabled).toBe(true)
  })

  it('never enables automerge', () => {
    // Every update PR goes through the normal CI gate and human review.
    expect(readRepoFile('renovate.json')).not.toMatch(
      /"(?:platform)?automerge"\s*:\s*true/i,
    )
  })
})

describe('Update visual baselines workflow', () => {
  const workflow = readRepoFile('.github/workflows/update-baselines.yml')

  it('is opt-in and never runs fork code with write access', () => {
    expect(workflow).toMatch(/^ {2}pull_request:\n {4}types: \[labeled\]$/m)
    expect(workflow).toMatch(/^ {2}workflow_dispatch:$/m)
    expect(workflow).not.toMatch(/^\s*pull_request_target:/m)
    expect(workflow).not.toMatch(/workflow_run|^ {2}push:/m)
    expect(jobBlock(workflow, 'prepare')).toContain(
      "github.event.label.name == 'update-baselines'",
    )
    expect(jobBlock(workflow, 'prepare')).toContain(
      'github.event.pull_request.head.repo.full_name == github.repository',
    )
  })

  it('grants least privilege and keeps the push token out of the test job', () => {
    expect(workflow).toMatch(/^permissions: \{\}$/m)
    expect(permissionsUnder(jobBlock(workflow, 'prepare'), '    ')).toEqual({
      'pull-requests': 'read',
    })
    expect(permissionsUnder(jobBlock(workflow, 'regenerate'), '    ')).toEqual({
      contents: 'read',
    })
    expect(permissionsUnder(jobBlock(workflow, 'publish'), '    ')).toEqual({
      contents: 'read',
    })
    expect(permissionsUnder(jobBlock(workflow, 'report'), '    ')).toEqual({
      'pull-requests': 'write',
    })
    // Only `publish` (no install, no Playwright) may hold the push secret;
    // `prepare` only checks that it is set.
    expect(jobBlock(workflow, 'regenerate')).not.toContain('secrets.')
    expect(jobBlock(workflow, 'report')).not.toContain('secrets.')
    expect(jobBlock(workflow, 'publish')).not.toMatch(/pnpm|playwright/)
    expect(jobBlock(workflow, 'regenerate')).toContain(
      'persist-credentials: false',
    )
  })

  it('keeps the regenerate job out of every shared cache', () => {
    // A workflow_dispatch run uses the default branch's cache scope, so a
    // cache written after installing PR code could poison master CI.
    const regenerate = jobBlock(workflow, 'regenerate')
    expect(regenerate).not.toMatch(/^\s+cache(?:-dependency-path)?:/m)
    expect(regenerate).not.toMatch(/actions\/cache|store-path|STORE_PATH/)
  })

  it('runs only trusted code in publish and limits the push token to git push', () => {
    const publish = jobBlock(workflow, 'publish')
    const steps = jobSteps(publish)
    const checkouts = steps.filter((step) =>
      step.includes('uses: actions/checkout@'),
    )
    expect(checkouts).toHaveLength(2)
    const [base, head] = checkouts as [string, string]

    expect(base).toContain('ref: ${{ github.event.repository.default_branch }}')
    expect(base).toContain('path: base')
    expect(base).toContain('persist-credentials: false')
    expect(base).not.toMatch(/token:/)
    expect(head).toContain('ref: ${{ needs.prepare.outputs.head_sha }}')
    expect(head).toContain('path: head')
    expect(head).toContain('persist-credentials: false')
    expect(head).not.toMatch(/token:/)

    // The helper script comes from the default-branch checkout, never the PR.
    expect(publish).toContain(
      'BASELINES_SCRIPT: ${{ github.workspace }}/base/scripts/update-visual-baselines.mjs',
    )
    const scriptRuns = publish.match(/node [^\n]*/g) ?? []
    expect(scriptRuns.length).toBeGreaterThan(0)
    expect(
      scriptRuns.filter((run) => !run.startsWith('node "$BASELINES_SCRIPT" ')),
    ).toEqual([])

    // The secret enters exactly one step: the push, through its env.
    const secretSteps = steps.filter((step) =>
      step.includes('BASELINES_PUSH_TOKEN'),
    )
    expect(secretSteps).toHaveLength(1)
    const push = secretSteps[0] ?? ''
    expect(push).toContain('id: push')
    expect(publish.match(/secrets\./g)).toHaveLength(1)
    expect(push).toMatch(
      /^ {10}BASELINES_PUSH_TOKEN: \$\{\{ secrets\.BASELINES_PUSH_TOKEN \}\}$/m,
    )
    // Never persisted: no `git config` and no remote rewrite with the token.
    expect(push).not.toMatch(/git config|remote set-url|credential/)
    expect(push).toContain('::add-mask::')
    // No PR hooks run with the token in reach.
    const gitWrites = steps.filter(
      (step) => /\bgit\b/.test(step) && /\b(?:commit|push)\b/.test(step),
    )
    expect(gitWrites).toHaveLength(2)
    for (const step of gitWrites) {
      expect(step).toContain('core.hooksPath=/dev/null')
      expect(step).toContain('--no-verify')
    }
  })

  it('regenerates in the Playwright image CI uses', () => {
    const version = (
      JSON.parse(readRepoFile('package.json')) as {
        devDependencies: Record<string, string>
      }
    ).devDependencies['@playwright/test']
    expect(jobBlock(workflow, 'regenerate')).toContain(
      `image: mcr.microsoft.com/playwright:v${String(version)}-noble`,
    )
  })

  it('never expands untrusted pull request fields inside run scripts', () => {
    // Script injection: titles and branch names reach shells only via env.
    const runScripts = workflow
      .split('\n')
      .reduce<{ lines: string[]; indent: number | null }>(
        (state, line) => {
          const run = /^(\s*)(?:- )?run: ?(.*)$/.exec(line)
          if (run) {
            state.lines.push(run[2] ?? '')
            state.indent = (run[1] ?? '').length
          } else if (
            state.indent !== null &&
            (line.trim() === '' ||
              line.length - line.trimStart().length > state.indent)
          ) {
            state.lines.push(line)
          } else {
            state.indent = null
          }
          return state
        },
        { lines: [], indent: null },
      ).lines
    expect(runScripts.length).toBeGreaterThan(0)
    expect(runScripts.filter((line) => line.includes('${{'))).toEqual([])
  })
})
