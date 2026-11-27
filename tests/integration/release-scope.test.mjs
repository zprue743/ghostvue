/** @vitest-environment node */
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { sweep } from '../../scripts/release-scope.mjs'
import {
  api,
  board,
  openIssues,
  pullRequests,
} from '../../scripts/lib/release-scope-github.mjs'
import { evaluate, repository } from '../../scripts/lib/release-scope.mjs'

vi.mock('../../scripts/lib/release-scope-github.mjs', () => ({
  api: vi.fn(),
  board: vi.fn(),
  openIssues: vi.fn(),
  pullRequests: vi.fn(),
}))

const policy = { mode: 'enforce', activeRelease: '0.1.0' }
const issue = (number, labels = ['agent:triaged']) => ({
  number,
  labels,
  body: '',
  assignees: { totalCount: 0 },
  issueDependenciesSummary: { blockedBy: 0 },
})
const pull = (number, body, links = []) => ({
  number,
  body,
  links: links.map((n) => ({
    number: n,
    repository: { nameWithOwner: repository },
  })),
  headRefName: 'spec',
  headRefOid: 'head',
  author: { __typename: 'User', login: 'maintainer' },
})
const card = (target) => ({ target, status: 'Todo' })
let issues, cards, prs

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('GITHUB_ACTIONS', 'true')
  vi.stubEnv('GITHUB_REPOSITORY', repository)
  vi.stubEnv('GITHUB_ACTOR', 'worker')
  vi.stubEnv('CLAIM_ISSUE', '')
  vi.stubEnv('GITHUB_STEP_SUMMARY', '')
  issues = [issue(1, ['agent:triaged', 'agent:ready']), issue(2)]
  cards = new Map([
    [1, card('0.1.0')],
    [2, card('0.1.x')],
  ])
  prs = []
  board.mockImplementation(() => cards)
  openIssues.mockImplementation(() => issues)
  pullRequests.mockImplementation(() => prs)
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

it('requires exact release after a blocker closes and scopes rollover to the selected option', () => {
  issues[1].body = 'Blocked by: #3'
  issues.push(issue(3))
  const snapshot = { issues, cards, prs }
  expect(evaluate(snapshot, '0.1.x').queue[1].reason).toContain('blocked by #3')
  issues.pop()
  expect(evaluate(snapshot, '0.1.0').queue[1].eligible).toBe(false)
  expect(evaluate(snapshot, '0.1.x').queue.map((i) => i.action)).toEqual([
    'remove',
    'add',
  ])
  const output = vi.spyOn(console, 'log').mockImplementation(() => undefined)
  sweep('report', '0.1.x', policy)
  expect(output).toHaveBeenCalledWith(
    expect.stringContaining('Unfinished in 0.1.0: #1'),
  )
  expect(api).not.toHaveBeenCalled()
})

it('holds human-authored spec work, mixed targets, missing links, and spoofed maintenance', () => {
  const bot = {
    ...pull(14, ''),
    headRefName: 'dependabot/npm/update',
    headRepository: { nameWithOwner: repository },
  }
  prs = [
    pull(10, 'Work item #2'),
    pull(11, 'Work item #2', [1]),
    pull(12, 'no link'),
    pull(13, 'Work item #1'),
    bot,
    { ...bot, number: 15, author: { __typename: 'Bot', login: 'dependabot' } },
  ]
  expect(
    evaluate({ issues, cards, prs }, '0.1.0').pulls.map((p) => p.pass),
  ).toEqual([false, false, false, true, false, true])
})

it('removes stale labels, respects holds and performs no writes on a second sweep', () => {
  for (const n of [2, 3, 4, 5, 6, 7])
    issues.push(issue(10 + n, ['agent:triaged', 'agent:ready']))
  cards.set(12, card('0.3.0'))
  cards.set(13, card(null))
  cards.set(15, { target: '0.1.0', status: 'In Progress' })
  cards.set(16, card('0.1.0'))
  issues.find((i) => i.number === 16).labels.push('human-required')
  cards.set(17, card('0.1.0'))
  issues.find((i) => i.number === 17).issueDependenciesSummary.blockedBy = 1
  cards.set(2, card('0.1.0'))
  api.mockImplementation((path, body) => {
    const n = Number(/issues\/(\d+)\/labels/.exec(path)[1])
    const item = issues.find((i) => i.number === n)
    item.labels = body
      ? [...item.labels, 'agent:ready']
      : item.labels.filter((l) => l !== 'agent:ready')
  })
  sweep('workflow', undefined, policy)
  expect(api).toHaveBeenCalledTimes(7)
  api.mockClear()
  sweep('workflow', undefined, policy)
  expect(api).not.toHaveBeenCalled()
})

it('serializes claims, gives one worker ownership and denies a second worker using the same account', () => {
  const workflow = readFileSync('.github/workflows/release-scope.yml', 'utf8')
  expect(workflow).toMatch(
    /concurrency:\s+group: release-scope-master\s+queue: max/,
  )
  expect(workflow).toContain('ref: refs/heads/master')
  vi.stubEnv('CLAIM_ISSUE', '1')
  api.mockImplementation((path, body) => {
    if (path.endsWith('/labels')) issues[0].labels.push(...body.labels)
    if (path.endsWith('/agent%3Aready'))
      issues[0].labels = issues[0].labels.filter(
        (label) => label !== 'agent:ready',
      )
  })
  sweep('workflow', undefined, policy)
  expect(issues[0].labels).toContain('in-progress')
  expect(api).toHaveBeenCalledWith(expect.stringContaining('/comments'), {
    body: expect.stringContaining('Claimed by worker'),
  })
  expect(() => sweep('workflow', undefined, policy)).toThrow('Claim denied')
  expect(api).toHaveBeenCalledTimes(3)
})

it('denies claims in report mode and preserves labels and assignments during a project outage', () => {
  vi.stubEnv('CLAIM_ISSUE', '1')
  expect(() =>
    sweep('workflow', undefined, { ...policy, mode: 'report' }),
  ).toThrow('Claim denied')
  expect(api).not.toHaveBeenCalled()
  prs = [pull(10, 'Work item #1')]
  board.mockImplementation(() => {
    throw new Error('partial project response')
  })
  api.mockImplementation((path) =>
    path.includes('/commits/')
      ? { statuses: [{ context: 'release-scope', state: 'success' }] }
      : {},
  )
  for (const claim of ['1', '']) {
    vi.stubEnv('CLAIM_ISSUE', claim)
    expect(() => sweep('workflow', undefined, policy)).toThrow(
      'partial project response',
    )
  }
  expect(api.mock.calls.some(([path]) => path.includes('/issues/'))).toBe(false)
  expect(
    api.mock.calls.filter(([, body]) => body?.state === 'error'),
  ).toHaveLength(2)
})

it('reevaluates an unchanged PR head after a board move and leaves current statuses alone', () => {
  prs = [pull(9, 'Work item #1')]
  let statuses = []
  api.mockImplementation((path, body) => {
    if (path.includes('/commits/')) return { statuses }
    if (path.includes('/statuses/')) statuses = [body]
  })
  sweep('workflow', undefined, policy)
  expect(statuses[0].state).toBe('success')
  cards.set(1, card('0.3.0'))
  sweep('workflow', undefined, policy)
  expect(statuses[0].state).toBe('failure')
  api.mockClear()
  sweep('workflow', undefined, policy)
  expect(
    api.mock.calls.filter(([path]) => path.includes('/statuses/')),
  ).toHaveLength(0)
})
