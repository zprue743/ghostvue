export const repository = 'zprue743/ghostvue'

function targetOf(cards, ref) {
  return cards.has(ref) ? (cards.get(ref).target ?? 'unassigned') : 'off board'
}

function workItems(pr) {
  const items = new Set(
    pr.links.map((link) =>
      link.repository.nameWithOwner === repository ? link.number : link.url,
    ),
  )
  // Partial work (e.g. a spec) can name its issue without closing it on merge.
  for (const match of pr.body.matchAll(/^Work item #([1-9]\d*)\s*$/gim))
    items.add(Number(match[1]))
  return [...items]
}

export function evaluate({ issues, prs, cards }, active) {
  const underway = new Set()
  const pulls = prs.map((pr) => {
    const refs = workItems(pr)
    const branchIssue = /^(?:[^/]+\/)?issue-(\d+)-/.exec(pr.headRefName)
    if (branchIssue) underway.add(Number(branchIssue[1]))
    for (const ref of refs) underway.add(ref)
    const maintenance =
      pr.author?.__typename === 'Bot' &&
      pr.author.login === 'dependabot' &&
      pr.headRepository?.nameWithOwner === repository &&
      pr.headRefName.startsWith('dependabot/') &&
      !refs.length
    const reasons = refs.map((ref) => {
      return `#${ref} ${targetOf(cards, ref)}`
    })
    if (branchIssue && !refs.includes(Number(branchIssue[1])))
      reasons.push(
        `missing work link for #${branchIssue[1]} (${targetOf(cards, Number(branchIssue[1]))})`,
      )
    const pass =
      maintenance ||
      (refs.length > 0 &&
        refs.every((ref) => cards.get(ref)?.target === active) &&
        (!branchIssue || refs.includes(Number(branchIssue[1]))))
    return {
      number: pr.number,
      sha: pr.headRefOid,
      pass,
      reason: maintenance
        ? 'Dependabot maintenance'
        : reasons.join(', ') || 'missing work item',
    }
  })
  const queue = issues.map((issue) => {
    const labels = issue.labels
    const card = cards.get(issue.number)
    const reasons = []
    if (card?.target !== active) reasons.push(targetOf(cards, issue.number))
    if (!labels.includes('agent:triaged')) reasons.push('awaiting triage')
    if (
      issue.assignees.totalCount ||
      underway.has(issue.number) ||
      card?.status === 'In Progress' ||
      labels.includes('in-progress')
    )
      reasons.push('already started')
    if (card && card.status !== 'Todo' && card.status !== 'In Progress')
      reasons.push('board status is not Todo')
    for (const hold of ['blocked', 'deferred', 'human-required'])
      if (labels.includes(hold)) reasons.push(hold)
    if (issue.issueDependenciesSummary.blockedBy)
      reasons.push('open dependency')
    // Legacy dependencies are recorded in the issue body. A closed repo issue drops out of the open set.
    for (const line of issue.body.matchAll(
      /^\s*(?:[-*]\s+)?Blocked by:\s*(.+)$/gim,
    )) {
      for (const ref of line[1].matchAll(/#(\d+)/g)) {
        if (issues.some((open) => open.number === Number(ref[1])))
          reasons.push(`blocked by #${ref[1]}`)
      }
    }
    const ready = labels.includes('agent:ready')
    const eligible = reasons.length === 0
    return {
      number: issue.number,
      target: card?.target,
      ready,
      eligible,
      action: ready === eligible ? 'keep' : eligible ? 'add' : 'remove',
      reason: reasons.join(', ') || 'eligible',
    }
  })
  return { queue, pulls }
}

export function claimable(queue, number) {
  const issue = queue.find((item) => item.number === number)
  if (!issue?.ready || !issue.eligible)
    throw new Error(
      `Claim denied for #${number}: ${issue?.reason ?? 'no open issue'} (ready label required)`,
    )
}
