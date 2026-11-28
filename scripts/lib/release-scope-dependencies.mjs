import { readFileSync } from 'node:fs'
import { extractFrontmatter } from './component-specs.js'
import { api, closingPulls } from './release-scope-github.mjs'
import { bodyBlockers, repository } from './release-scope.mjs'

const endpoint = `repos/${repository}`

function approvedSpec(markdown) {
  const spec = extractFrontmatter(markdown)?.frontmatter
  return (
    spec?.specStatus === 'approved' &&
    typeof spec.approval?.evidence === 'string' &&
    Boolean(spec.approval.evidence.trim()) &&
    Array.isArray(spec.unresolvedQuestions) &&
    spec.unresolvedQuestions.every((question) => question?.blocking === false)
  )
}

function approvedInMerge(pr, slugs) {
  if (!slugs.length) return true // An implementation prerequisite only needs its merged PR.
  const paths = slugs.map((slug) => `docs/components/${slug}-spec.md`)
  for (let page = 1; ; page++) {
    const files = api(
      `${endpoint}/pulls/${pr.number}/files?per_page=100&page=${page}`,
    )
    for (const file of files) {
      if (file.status === 'removed' || !paths.includes(file.filename)) continue
      const merged = api(
        `${endpoint}/contents/${file.filename}?ref=${pr.mergeCommit.oid}`,
      )
      if (
        merged.encoding !== 'base64' ||
        !approvedSpec(Buffer.from(merged.content, 'base64').toString('utf8'))
      )
        continue
      // Checkout is pinned to trusted master. A later withdrawal overrides old approval.
      try {
        if (
          approvedSpec(
            readFileSync(
              new URL('../../' + file.filename, import.meta.url),
              'utf8',
            ),
          )
        )
          return true
      } catch (error) {
        if (error.code !== 'ENOENT') throw error
      }
    }
    if (files.length < 100) return false
  }
}

export function dependencyHolds(issues, gates) {
  const holds = new Map()
  const open = new Set(issues.map((issue) => issue.number))
  for (const issue of issues) {
    const gate = gates[issue.number]
    if (!gate) continue
    const refs = bodyBlockers(issue.body)
    for (const number of Object.keys(gate)) refs.add(Number(number))
    let reason = ''
    try {
      if (!Number.isSafeInteger(issue.issueDependenciesSummary?.blockedBy))
        throw new Error('Missing GitHub blocker count')
      if (issue.issueDependenciesSummary.blockedBy > 0)
        reason = 'open GitHub dependency'
      for (const number of refs) {
        if (reason) break
        if (open.has(number)) {
          reason = `open blocker #${number}`
          break
        }
        const slugs = gate[number]
        if (slugs) {
          const merged = closingPulls(number)
          if (!merged.some((pr) => approvedInMerge(pr, slugs)))
            reason = `awaiting merged prerequisite #${number}`
        } else if (api(`${endpoint}/issues/${number}`).state !== 'closed') {
          reason = `open blocker #${number}`
        }
      }
    } catch (error) {
      reason = `could not verify prerequisites for #${issue.number}`
      console.error(reason, error.message)
    }
    holds.set(issue.number, reason)
  }
  return holds
}
