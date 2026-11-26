/** @vitest-environment node */

/**
 * Guards the CI supply-chain policy in docs/contributing/ci.md (GHO-53).
 *
 * Workflows are read as text rather than parsed as YAML so the guard needs no
 * extra development dependency. The assertions rely only on this repository's
 * Prettier-formatted layout: two-space indentation and one `uses:` per line.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
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
    expect(workflow).toMatch(
      /^ {2}push:\n {4}branches: \[master\]\n {4}paths:\n(?: {6}- .+\n)+/m,
    )
    expect(workflow).toMatch(
      /^ {2}pull_request:\n {4}branches: \[master\]\n {4}paths:\n(?: {6}- .+\n)+/m,
    )
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

  it('runs static and coverage unit checks on Node 22 and unit compatibility on Node 24', () => {
    const engines = (
      JSON.parse(readRepoFile('package.json')) as { engines: { node: string } }
    ).engines.node
    // The floor must match the declared engines floor.
    expect(engines).toBe('>=22.0.0')

    for (const jobId of ['verify-static', 'verify-unit']) {
      const block = jobBlock(workflow, jobId)
      expect(block, jobId).toMatch(/node-version: 22/)
    }

    const node24 = jobBlock(workflow, 'verify-unit-node24')
    expect(node24).toMatch(/node-version: 24/)
    expect(node24).toContain('--reporter=default')
    expect(node24).not.toContain('--coverage')
  })

  it('makes the aggregate verify check depend on every verify partition', () => {
    const needs = /needs:\s*\[([^\]]+)\]/.exec(jobBlock(workflow, 'verify'))
    expect(needs?.[1].split(',').map((need) => need.trim())).toEqual(
      expect.arrayContaining([
        'verify-static',
        'verify-unit',
        'verify-unit-node24',
      ]),
    )
  })

  it('keeps unit and integration Vitest blobs from overwriting each other', () => {
    // `verify` downloads every `vitest-blob-*` artifact into one directory.
    // An unsharded run writes `.vitest-reports/blob.json` by default, so a
    // second unsharded job without its own name would silently replace the
    // first job's coverage before the thresholds are enforced.
    const unit = jobBlock(workflow, 'verify-unit')
    expect(unit).toContain('--outputFile.blob=.vitest-reports/blob-unit.json')
    expect(unit).not.toMatch(/--shard=/)
    expect(unit).toContain('name: vitest-blob-unit\n')

    const integration = jobBlock(workflow, 'verify-integration')
    expect(integration).not.toMatch(/--outputFile\.blob=\S*blob-unit\.json/)
    expect(integration).toContain('name: vitest-blob-integration')
    expect(jobBlock(workflow, 'verify')).toContain('pattern: vitest-blob-*')
  })

  it('prints failing Vitest tests in the job log alongside the blob report', () => {
    // A blob-only run writes the artifact but logs nothing about which test
    // failed, so each Vitest job also keeps the `default` reporter (GHO-218).
    for (const jobId of ['verify-unit', 'verify-integration']) {
      const run =
        /run: pnpm exec vitest run .*$/m.exec(jobBlock(workflow, jobId))?.[0] ??
        ''
      expect(run, jobId).toContain('--reporter=default')
      expect(run, jobId).toContain('--reporter=blob')
    }
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

  it('runs Chromium shards and consolidated Firefox/WebKit checks behind the browser check', () => {
    const shard = jobBlock(workflow, 'browser-shard')
    expect(shard).toMatch(
      /run: pnpm test:e2e:prebuilt --project=chromium --project=chromium-e2e /,
    )

    const cross = jobBlock(workflow, 'browser-cross')
    expect(cross).toMatch(/needs:\s*\[changes,\s*verify-build\]/)
    expect(cross).not.toMatch(/\bmatrix:/)
    expect(cross).toContain(
      'run: pnpm test:e2e:prebuilt --project=firefox-e2e --project=webkit-e2e',
    )
    // Blob name must not collide with the Chromium shard reports when the
    // `browser` job merges every `playwright-blob-*` artifact.
    expect(cross).toContain('PLAYWRIGHT_BLOB_OUTPUT_NAME: report-cross.zip')
    expect(cross).toContain('name: playwright-blob-cross')

    const aggregate = jobBlock(workflow, 'browser')
    expect(aggregate).toContain('needs.browser-cross.result')
    expect(aggregate).toContain('pattern: playwright-blob-*')
  })

  it('runs duration-balanced Chromium shards that the plan and blob names agree on', () => {
    const shard = jobBlock(workflow, 'browser-shard')
    const matrix = /shard: \[([^\]]+)\]/.exec(shard)
    const shards = matrix?.[1].split(',').map((value) => value.trim()) ?? []
    expect(shards.length).toBeGreaterThan(0)

    // Every plan step must split into exactly as many shards as the matrix
    // runs, or some planned tests would never execute.
    const plans = [
      ...shard.matchAll(
        /scripts\/e2e-shard-plan\.mjs --shard=\$\{\{ matrix\.shard \}\}\/(\d+) /g,
      ),
    ]
    expect(plans.length).toBe(2)
    for (const plan of plans) expect(Number(plan[1])).toBe(shards.length)

    expect(shard).toContain('--test-list .artifacts/e2e-shard-tests.txt')
    // Playwright's own count-based --shard must not be layered on top.
    expect(shard).not.toMatch(/test:e2e:prebuilt[^\n]*--shard=/)
    // Distinct blob names so merge-multiple never overwrites a shard's report.
    expect(shard).toContain(
      'PLAYWRIGHT_BLOB_OUTPUT_NAME: report-chromium-${{ matrix.shard }}.zip',
    )
    expect(shard).toMatch(/timeout-minutes: \d+/)
  })

  it('checks mapped keyboard evidence against the merged browser results', () => {
    const aggregate = jobBlock(workflow, 'browser')
    expect(aggregate).toContain(
      'PLAYWRIGHT_JSON_OUTPUT_FILE: .artifacts/playwright/results.json',
    )
    expect(aggregate).toContain(
      'run: pnpm exec playwright merge-reports --reporter=html,github,json ./all-blob-reports',
    )
    const merge = aggregate.indexOf('merge-reports')
    const check = aggregate.indexOf(
      'run: node scripts/check-keyboard-evidence.mjs --report .artifacts/playwright/results.json',
    )
    expect(check).toBeGreaterThan(merge)
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

describe('Dependabot configuration', () => {
  const dependabotConfig = readRepoFile('.github/dependabot.yml')

  function ecosystemBlock(ecosystem: 'npm' | 'github-actions'): string {
    const marker = `  - package-ecosystem: ${ecosystem}`
    const start = dependabotConfig.indexOf(marker)
    if (start === -1) throw new Error(`Ecosystem ${ecosystem} not found`)
    const rest = dependabotConfig.slice(start + marker.length)
    const next = rest.indexOf('\n  - package-ecosystem:')
    return next === -1 ? rest : rest.slice(0, next)
  }

  it('replaces Renovate with a checked-in Dependabot v2 config', () => {
    expect(existsSync(resolve(repositoryRoot, 'renovate.json'))).toBe(false)
    expect(dependabotConfig).toMatch(/^version: 2$/m)
  })

  it('schedules weekly Monday UTC updates with PR limits and labels', () => {
    const npm = ecosystemBlock('npm')
    expect(npm).toContain('directory: /')
    expect(npm).toContain('interval: weekly')
    expect(npm).toContain('day: monday')
    expect(npm).toContain("time: '05:00'")
    expect(npm).toContain('timezone: UTC')
    expect(npm).toContain('open-pull-requests-limit: 5')
    expect(npm).toContain('- dependencies')

    const actions = ecosystemBlock('github-actions')
    expect(actions).toContain('directory: /')
    expect(actions).toContain('interval: weekly')
    expect(actions).toContain('day: monday')
    expect(actions).toContain("time: '05:00'")
    expect(actions).toContain('timezone: UTC')
    expect(actions).toContain('open-pull-requests-limit: 2')
    expect(actions).toContain('- dependencies')
  })

  it('enforces a 3-day release cooldown, exact versioning, and grouping', () => {
    const npm = ecosystemBlock('npm')
    expect(npm).toContain('versioning-strategy: increase')
    expect(npm).toMatch(/cooldown:\n\s+default-days: 3/)
    expect(npm).toMatch(/playwright:\n\s+patterns:/)
    expect(npm).toContain("'@playwright/test'")
    expect(npm).toContain('- playwright\n')
    expect(npm).toContain('- playwright-core\n')
    for (const dep of ['node', "'@types/node'", 'pnpm']) {
      expect(npm).toContain(`dependency-name: ${dep}`)
    }

    const actions = ecosystemBlock('github-actions')
    expect(actions).toMatch(/github-actions:\n\s+patterns:\n\s+- '\*'/)
  })
})

describe('Update visual baselines workflow', () => {
  const workflow = readRepoFile('.github/workflows/update-baselines.yml')

  it('is opt-in and never runs fork code with write access', () => {
    expect(workflow).toMatch(/^ {2}pull_request:\n {4}types: \[labeled\]$/m)
    // A dispatched run executes PR code in the default branch's context and
    // cache scope (CodeQL cache poisoning), so the label is the only trigger.
    expect(workflow).not.toMatch(/^\s*workflow_dispatch:|\binputs\./m)
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
    // Only `publish` (no install, no Playwright) may hold the push secret.
    expect(jobBlock(workflow, 'prepare')).not.toContain('secrets.')
    expect(jobBlock(workflow, 'regenerate')).not.toContain('secrets.')
    expect(jobBlock(workflow, 'report')).not.toContain('secrets.')
    expect(jobBlock(workflow, 'publish')).not.toMatch(/pnpm|playwright/)
    expect(jobBlock(workflow, 'regenerate')).toContain(
      'persist-credentials: false',
    )
  })

  it('gates the push token behind the protected baseline-push environment', () => {
    // Labelled runs use the workflow file from the PR branch, so the token is
    // an environment secret that needs a maintainer's approval to release.
    expect(jobBlock(workflow, 'publish')).toMatch(
      /^ {4}environment: baseline-push$/m,
    )
    for (const job of ['prepare', 'regenerate', 'report']) {
      expect(jobBlock(workflow, job)).not.toMatch(/^\s+environment:/m)
    }
  })

  it('keeps the regenerate job out of every shared cache', () => {
    // The job installs and runs PR code, so it must not write any cache that
    // later runs could restore.
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

    // The secret value enters exactly one step: the push, through its env.
    // The token check step only sees whether it is set.
    const secretSteps = steps.filter((step) =>
      step.includes('${{ secrets.BASELINES_PUSH_TOKEN }}'),
    )
    expect(secretSteps).toHaveLength(1)
    const push = secretSteps[0] ?? ''
    expect(push).toContain('id: push')
    expect(publish.match(/secrets\./g)).toHaveLength(2)
    const check = steps.find((step) => step.includes('id: token')) ?? ''
    expect(check).toContain(
      "HAS_PUSH_TOKEN: ${{ secrets.BASELINES_PUSH_TOKEN != '' }}",
    )
    expect(steps.indexOf(check)).toBe(0)
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
