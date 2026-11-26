#!/usr/bin/env node
/**
 * Credential-free release dry run (GHO-57). Never publishes.
 *
 *   pnpm release:dry-run                     # after `pnpm build`
 *   node scripts/release-dry-run.mjs --dry-run --expect-version 0.1.0
 *   node scripts/release-dry-run.mjs --dry-run --verify-evidence <dir>
 *
 * `--dry-run` is mandatory so the command line always states intent; flags
 * that request a real publication are refused. See
 * docs/contributing/releases.md for the release checklist.
 */
import { appendFileSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  ReleaseSafetyError,
  parseReleaseDryRunArgs,
  runReleaseDryRun,
  verifyReleaseEvidence,
} from './lib/release-dry-run.js'
import { publishableWorkspacePackages } from './workspace-packages.mjs'

// Only the release train is dry-run. `@ghostvue/core` and `@ghostvue/shared`
// are internal (`publishable: false`) and never released.
const releasePackages = publishableWorkspacePackages

const root = fileURLToPath(new URL('..', import.meta.url))

try {
  const options = parseReleaseDryRunArgs(process.argv.slice(2))

  if (options.verifyEvidence) {
    const problems = await verifyReleaseEvidence({
      evidenceDir: options.verifyEvidence,
      packages: releasePackages,
      expectVersion: options.expectVersion,
    })
    if (problems.length) {
      throw new Error(
        `Release evidence is invalid:\n- ${problems.join('\n- ')}`,
      )
    }
    console.log(
      `Release evidence verified for ${releasePackages.length} packages. Nothing was published.`,
    )
  } else {
    for (const { directory, name } of releasePackages) {
      try {
        readFileSync(join(root, 'packages', directory, 'dist', 'index.d.ts'))
      } catch {
        throw new Error(`${name} is not built. Run \`pnpm build\` first.`)
      }
    }
    await runReleaseDryRun({
      root,
      packages: releasePackages,
      outDir: options.outDir,
      expectVersion: options.expectVersion,
      log: (message) => console.log(message),
    })
    const summaryPath = process.env.GITHUB_STEP_SUMMARY
    if (summaryPath) {
      appendFileSync(
        summaryPath,
        readFileSync(resolve(root, options.outDir, 'summary.md'), 'utf8'),
      )
    }
    console.log('Release dry run passed. Nothing was published.')
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(error instanceof ReleaseSafetyError ? 2 : 1)
}
