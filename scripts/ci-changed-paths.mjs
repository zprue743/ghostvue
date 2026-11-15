#!/usr/bin/env node
/**
 * Classifies CI diffs so prose-only docs and agent-adapter pull requests can
 * skip heavy jobs while required checks keep reporting success. Executable
 * Markdown pages (containing live `<script>`, `<style>`, `<GhostExample />`,
 * etc.) still trigger full verification.
 */
import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync } from 'node:fs'

import { classifyChangedPaths } from './lib/ci-changed-paths.js'

const eventPath = process.env.GITHUB_EVENT_PATH
if (!eventPath) {
  throw new Error('ci-changed-paths.mjs requires GITHUB_EVENT_PATH')
}

const event = JSON.parse(readFileSync(eventPath, 'utf8'))
const eventName = process.env.GITHUB_EVENT_NAME ?? 'unknown'

function resolveBaseHead() {
  if (event.pull_request) {
    return { base: event.pull_request.base.sha, head: 'HEAD' }
  }
  if (event.merge_group) {
    return {
      base: event.merge_group.base_sha,
      head: event.merge_group.head_sha,
    }
  }
  const before = event.before
  if (typeof before === 'string' && before !== '0'.repeat(40)) {
    return { base: before, head: event.after ?? 'HEAD' }
  }
  const base = execFileSync('git', ['merge-base', 'HEAD', 'origin/master'], {
    encoding: 'utf8',
  }).trim()
  return { base, head: 'HEAD' }
}

/**
 * @param {string} ref
 * @param {string} file
 * @returns {string | null}
 */
function readFileAtRef(ref, file) {
  try {
    return execFileSync('git', ['show', `${ref}:${file}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
  } catch {
    return null
  }
}

const { base, head } = resolveBaseHead()
const diff = execFileSync(
  'git',
  ['diff', '--name-only', '--no-renames', base, head],
  {
    encoding: 'utf8',
  },
).trim()
const files = diff ? diff.split('\n').filter(Boolean) : []

const { skipHeavy } = classifyChangedPaths({
  eventName,
  files,
  readAtBase: (file) => readFileAtRef(base, file),
  readAtHead: (file) => readFileAtRef(head, file),
})

const summary = skipHeavy
  ? `Skipping heavy CI for ${files.length} eligible path-only file(s).`
  : files.length === 0
    ? 'No changed files in diff; running full CI.'
    : `Running full CI (${files.length} changed file(s), including non-eligible paths).`

const outputPath = process.env.GITHUB_OUTPUT
if (!outputPath) {
  throw new Error('ci-changed-paths.mjs requires GITHUB_OUTPUT')
}
appendFileSync(outputPath, `skip_heavy=${skipHeavy}\n`)
console.log(summary)
if (files.length > 0 && files.length <= 30) {
  console.log('Changed files:\n' + files.map((f) => `  - ${f}`).join('\n'))
}
