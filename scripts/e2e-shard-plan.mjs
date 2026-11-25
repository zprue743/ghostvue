#!/usr/bin/env node
/**
 * Writes a duration-balanced Playwright `--test-list` for one CI
 * `browser-shard` job, or refreshes the committed timing table (GHO-254).
 *
 *   node scripts/e2e-shard-plan.mjs --shard=1/3 --out=<file> -- <playwright filters>
 *   node scripts/e2e-shard-plan.mjs --write-timings=<playwright-results.json>
 *
 * Planning lists the tests that `playwright test --list <filters>` selects,
 * so the union of all shards is exactly that selection. See
 * scripts/lib/e2e-shards.js for the balancing rules and
 * docs/contributing/ci.md for when to refresh the timings.
 */
import { execFileSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import {
  buildTimingTable,
  buildUnits,
  collectReportTests,
  formatTestList,
  parseShardArg,
  planShards,
} from './lib/e2e-shards.js'

const TIMINGS_PATH = resolve(process.cwd(), 'scripts/e2e-shard-timings.json')

const separator = process.argv.indexOf('--')
const ownArgs =
  separator === -1 ? process.argv.slice(2) : process.argv.slice(2, separator)
const playwrightArgs = separator === -1 ? [] : process.argv.slice(separator + 1)

/** @param {string} name */
function option(name) {
  const prefix = `--${name}=`
  return ownArgs.find((arg) => arg.startsWith(prefix))?.slice(prefix.length)
}

const writeTimingsFrom = option('write-timings')
if (writeTimingsFrom) {
  const report = JSON.parse(readFileSync(resolve(writeTimingsFrom), 'utf8'))
  const table = buildTimingTable(report)
  writeFileSync(TIMINGS_PATH, `${JSON.stringify(table, null, 2)}\n`)
  console.log(
    `Wrote ${Object.keys(table).length} shard timings to scripts/e2e-shard-timings.json`,
  )
  process.exit(0)
}

const shardArg = option('shard')
const out = option('out')
if (!shardArg || !out) {
  throw new Error(
    'Usage: node scripts/e2e-shard-plan.mjs --shard=<current>/<total> --out=<file> -- <playwright filters>\n' +
      '   or: node scripts/e2e-shard-plan.mjs --write-timings=<playwright-results.json>',
  )
}
const { current, total } = parseShardArg(shardArg)

// Read the list from a file rather than stdout so nothing else a wrapper
// prints can corrupt the JSON.
const listDir = mkdtempSync(join(tmpdir(), 'e2e-shard-plan-'))
const listFile = join(listDir, 'list.json')
try {
  const cli = createRequire(import.meta.url).resolve('@playwright/test/cli')
  execFileSync(
    process.execPath,
    [cli, 'test', '--list', '--reporter=json', ...playwrightArgs],
    {
      env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_FILE: listFile },
      stdio: ['ignore', 'ignore', 'inherit'],
    },
  )
  const listed = collectReportTests(JSON.parse(readFileSync(listFile, 'utf8')))
  const timings = JSON.parse(readFileSync(TIMINGS_PATH, 'utf8'))
  const shards = planShards(buildUnits(listed, timings), total)

  for (const [index, shard] of shards.entries()) {
    console.log(
      `${index + 1 === current ? '>' : ' '} shard ${index + 1}/${total}: ` +
        `${shard.tests} tests in ${shard.units.length} units, ` +
        `~${Math.round(shard.estimatedMs / 1000)}s of worker time`,
    )
  }

  const shard = shards[current - 1]
  mkdirSync(dirname(resolve(out)), { recursive: true })
  writeFileSync(resolve(out), formatTestList(shard))
} finally {
  rmSync(listDir, { recursive: true, force: true })
}
