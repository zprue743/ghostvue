import { setTimeout as wait } from 'node:timers/promises'
import { pathToFileURL } from 'node:url'
import { readFileSync, appendFileSync } from 'node:fs'
import { claimable, evaluate, repository } from './lib/release-scope.mjs'
import {
  api,
  board,
  openIssues,
  pullRequests,
} from './lib/release-scope-github.mjs'

const policy = JSON.parse(
  readFileSync(new URL('../.github/release-scope.json', import.meta.url)),
)
const [command = 'report', argument, ...extra] = process.argv.slice(2)
const endpoint = `repos/${repository}`
const workflow = 'release-scope.yml'

function report(result, active) {
  const lines = [
    `### Release scope for ${active}`,
    '',
    `Scanned ${result.queue.length} open issues and ${result.pulls.length} open PRs to master.`,
    '',
    'Ready queue (current or proposed):',
  ]
  const changes = result.queue.filter((issue) => issue.ready || issue.eligible)
  for (const issue of changes)
    lines.push(
      `- #${issue.number}: ${issue.action} agent:ready (${issue.reason})`,
    )
  if (!changes.length) lines.push('- Empty')
  lines.push('', 'Open PR checks:')
  for (const pr of result.pulls)
    lines.push(`- #${pr.number}: ${pr.pass ? 'pass' : 'hold'} — ${pr.reason}`)
  return lines.join('\n')
}

function publishStatus(sha, state, description) {
  const context = 'release-scope'
  const current = api(
    `${endpoint}/commits/${sha}/status?per_page=100`,
  ).statuses.find((status) => status.context === context)
  description = description.slice(0, 140)
  if (current?.state === state && current.description === description) return
  api(`${endpoint}/statuses/${sha}`, {
    context,
    state,
    description,
    target_url: `https://github.com/${repository}/actions/runs/${process.env.GITHUB_RUN_ID}`,
  })
}

function openHeads() {
  const heads = []
  for (let page = 1; ; page++) {
    const pulls = api(
      `${endpoint}/pulls?state=open&base=master&per_page=100&page=${page}`,
    )
    heads.push(...pulls.map((pr) => pr.head.sha))
    if (pulls.length < 100) return heads
  }
}

export async function dispatchClaim(number) {
  if (!/^[1-9]\d*$/.test(number ?? ''))
    throw new Error('Supply an issue number')
  const dispatch = api(`${endpoint}/actions/workflows/${workflow}/dispatches`, {
    ref: 'master',
    inputs: { claim: number },
    return_run_details: true,
  })
  if (!Number.isSafeInteger(dispatch?.workflow_run_id))
    throw new Error(
      'Could not identify dispatched claim run. Inspect Actions before retrying.',
    )
  console.log(dispatch.html_url)
  const path = `${endpoint}/actions/runs/${dispatch.workflow_run_id}`
  // Reading the Actions run directly also works for fine-grained runner tokens.
  for (;;) {
    const run = api(path)
    if (run.status === 'completed') {
      if (
        run.conclusion !== 'success' ||
        !api(`${path}/jobs`).jobs.some(
          (job) => job.name === 'reconcile' && job.conclusion === 'success',
        )
      )
        throw new Error(`Claim denied for #${number}. See ${dispatch.html_url}`)
      return
    }
    await wait(5000)
  }
}

export function sweep(command, argument, policy) {
  const apply = command === 'workflow' && policy.mode === 'enforce'
  const claim = command === 'workflow' && process.env.CLAIM_ISSUE
  if (
    command === 'workflow' &&
    (process.env.GITHUB_ACTIONS !== 'true' ||
      process.env.GITHUB_REPOSITORY !== repository)
  )
    throw new Error('Run workflow mode from the trusted repository workflow')
  if (claim && (!apply || !/^[1-9]\d*$/.test(claim)))
    throw new Error(
      'Claim denied: enforcement disabled or invalid issue number',
    )
  const active = argument ?? policy.activeRelease
  // Fetch the PR heads separately so a failed project query can revoke a prior green status.
  let prs
  let snapshot
  try {
    prs = pullRequests()
    const cards = board(active)
    const issues = openIssues()
    snapshot = { cards, issues, prs }
  } catch (error) {
    if (apply) {
      // A failure reading linked issues can also invalidate greens. In that case
      // enumerate just the open heads using the independent repository REST API.
      const heads = prs ? prs.map((pr) => pr.headRefOid) : openHeads()
      for (const sha of new Set(heads)) {
        try {
          publishStatus(
            sha,
            'error',
            'Cannot verify release scope. See workflow run.',
          )
        } catch (statusError) {
          console.error(`Could not invalidate ${sha}: ${statusError.message}`)
        }
      }
    }
    throw error
  }
  const result = evaluate(snapshot, active)
  if (claim) {
    const number = Number(claim)
    claimable(result.queue, number)
    const owner = process.env.GITHUB_ACTOR
    const issuePath = `${endpoint}/issues/${number}`
    // The durable lock also works for app accounts that GitHub cannot assign.
    // A failed later write keeps other workers out until the claim is recovered.
    api(`${issuePath}/labels`, { labels: ['in-progress'] })
    api(`${issuePath}/comments`, {
      body: `Claimed by ${owner} for ${active} in [release-scope run ${process.env.GITHUB_RUN_ID}](https://github.com/${repository}/actions/runs/${process.env.GITHUB_RUN_ID}).`,
    })
    api(`${issuePath}/labels/agent%3Aready`, null, { method: 'DELETE' })
    console.log(`Claimed #${number} for ${owner} in ${active}`)
    return
  }
  let summary = report(result, active)
  if (argument) {
    // Rollover uses one inventory for both previews, including unfinished work that needs an explicit carryover decision.
    const before = evaluate(snapshot, policy.activeRelease)
    const unfinished = before.queue
      .filter((issue) => issue.target === policy.activeRelease)
      .map((issue) => `#${issue.number}`)
    summary =
      report(before, policy.activeRelease) +
      `\n\nUnfinished in ${policy.activeRelease}: ${unfinished.join(', ') || 'none'}\n\n` +
      summary
  }
  console.log(summary)
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + '\n')
  if (!apply) return
  // Commit statuses are per SHA. PRs sharing a head all need to pass.
  for (const sha of new Set(result.pulls.map((pr) => pr.sha))) {
    const checks = result.pulls.filter((pr) => pr.sha === sha)
    const held = checks.find((pr) => !pr.pass)
    publishStatus(
      sha,
      held ? 'failure' : 'success',
      `${active}: ${held?.reason ?? checks[0].reason}`,
    )
  }
  for (const issue of result.queue) {
    const path = `${endpoint}/issues/${issue.number}/labels`
    if (issue.action === 'add') api(path, { labels: ['agent:ready'] })
    if (issue.action === 'remove')
      api(path + '/agent%3Aready', null, { method: 'DELETE' })
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    if (
      extra.length ||
      !['report', 'claim', 'workflow'].includes(command) ||
      (command === 'workflow' && argument)
    )
      throw new Error(
        'Usage: release-scope.mjs report [next-release] | claim <issue>',
      )
    if (!['report', 'enforce'].includes(policy.mode))
      throw new Error('Unknown release-scope mode')
    if (command === 'claim') await dispatchClaim(argument)
    else sweep(command, argument, policy)
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
