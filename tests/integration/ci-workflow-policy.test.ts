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
    expect(jobBlock(workflow, 'browser-shard')).toContain(`image: ${image}`)
    expect(readRepoFile('scripts/lib/test-visual-docker.js')).toContain(image)
    expect(workflow).not.toMatch(/run:.*playwright install/)
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
      /needs:\s*\[changes,\s*verify-build,\s*browser-shard\]/,
    )
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
