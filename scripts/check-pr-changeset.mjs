#!/usr/bin/env node
/**
 * Enforces that pull requests touching publishable package inputs include at
 * least one `.changeset/*.md` entry or carry the `no-changeset` opt-out label.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

import {
  evaluatePrChangeset,
  formatPrChangesetFailure,
} from './lib/pr-changeset-check.js'

const eventName = process.env.GITHUB_EVENT_NAME ?? 'unknown'

if (eventName !== 'pull_request') {
  console.log(
    `Skipping PR Changeset check on '${eventName}' event (pull_request only).`,
  )
  process.exit(0)
}

const eventPath = process.env.GITHUB_EVENT_PATH
if (!eventPath) {
  throw new Error('check-pr-changeset.mjs requires GITHUB_EVENT_PATH')
}

const event = JSON.parse(readFileSync(eventPath, 'utf8'))
const pullRequest = event.pull_request
if (!pullRequest?.base?.sha) {
  throw new Error(
    'check-pr-changeset.mjs expected pull_request.base.sha in GITHUB_EVENT_PATH',
  )
}

const baseSha = pullRequest.base.sha
const headSha = pullRequest.head?.sha ?? 'HEAD'

const rawDiff = execFileSync(
  'git',
  ['diff', '--name-status', '--no-renames', `${baseSha}...${headSha}`],
  { encoding: 'utf8' },
).trim()

const files = rawDiff
  ? rawDiff
      .split(/\r?\n/u)
      .filter(Boolean)
      .map((line) => {
        const [status = 'M', ...rest] = line.split('\t')
        return { status, path: rest.join('\t') }
      })
  : []

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

const labels = (pullRequest.labels ?? [])
  .map((label) => (typeof label === 'string' ? label : label?.name))
  .filter((name) => typeof name === 'string')

const authorLogin =
  typeof pullRequest.user?.login === 'string' ? pullRequest.user.login : ''

const result = evaluatePrChangeset({
  eventName,
  files,
  labels,
  authorLogin,
  readAtBase: (file) => readFileAtRef(baseSha, file),
  readAtHead: (file) => readFileAtRef(headSha, file),
})

if (result.status === 'fail') {
  console.error(formatPrChangesetFailure(result))
  process.exit(1)
}

console.log(`PR Changeset check passed: ${result.reason}`)
