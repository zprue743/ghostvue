/** @vitest-environment node */
import { execFileSync } from 'node:child_process'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { board, closingPulls } from '../../scripts/lib/release-scope-github.mjs'
import { repository } from '../../scripts/lib/release-scope.mjs'

vi.mock('node:child_process', () => ({ execFileSync: vi.fn() }))
const project = (value) =>
  JSON.stringify({ data: { user: { projectV2: value } } })
const item = (number, target) => ({
  type: 'ISSUE',
  isArchived: false,
  content: {
    __typename: 'Issue',
    number,
    repository: { nameWithOwner: repository },
  },
  target,
  status: { name: 'Todo' },
})
const page = (nodes, totalCount, after = null) =>
  project({
    items: {
      nodes,
      totalCount,
      pageInfo: { hasNextPage: Boolean(after), endCursor: after },
    },
  })
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('GH_TOKEN', 'repo-fixture')
  vi.stubEnv('RELEASE_PROJECT_TOKEN', 'board-fixture')
  execFileSync.mockReturnValueOnce(
    project({
      target: { options: [{ name: '0.1.0' }] },
      status: { options: [{ name: 'Todo' }] },
    }),
  )
})
afterEach(() => vi.unstubAllEnvs())

it('reads every board page with the project credential and preserves a verified empty target', () => {
  execFileSync
    .mockReturnValueOnce(page([item(1, null)], 2, 'next'))
    .mockReturnValueOnce(page([item(2, { name: '0.1.0' })], 2))
  const result = board('0.1.0')
  expect(result.get(1)).toEqual({ status: 'Todo', target: undefined })
  expect(result.get(2).target).toBe('0.1.0')
  const options = execFileSync.mock.calls[2][2]
  expect(JSON.parse(options.input).variables.after).toBe('next')
  expect(options.env.GH_TOKEN).toBe('board-fixture')
})
it.each([
  ['missing page', page([item(1, null)], 2)],
  ['redacted issue', page([{ type: 'REDACTED' }], 1)],
  ['unknown field value', page([item(1, {})], 1)],
  ['missing field', page([item(1, undefined)], 1)],
  [
    'partial GraphQL response',
    JSON.stringify({ data: {}, errors: [{ message: 'permission denied' }] }),
  ],
])('refuses a partial board: %s', (_reason, response) => {
  execFileSync.mockReturnValueOnce(response)
  expect(() => board('0.1.0')).toThrow()
})

it('requires a completed spec issue and a closing PR merged into this repository on master', () => {
  execFileSync.mockReset()
  const pr = {
    number: 90,
    merged: true,
    baseRefName: 'master',
    mergeCommit: { oid: 'sha' },
    repository: { nameWithOwner: repository },
  }
  const candidates = [
    pr,
    { ...pr, merged: false },
    { ...pr, baseRefName: 'release/0.1.x' },
    { ...pr, repository: { nameWithOwner: 'other/repo' } },
  ]
  const issueData = {
    id: 'ID',
    state: 'CLOSED',
    stateReason: 'COMPLETED',
    closedByPullRequestsReferences: {
      totalCount: candidates.length,
      nodes: candidates,
    },
  }
  for (const overrides of [
    { state: 'OPEN' },
    { stateReason: 'NOT_PLANNED' },
    {},
  ]) {
    execFileSync.mockReturnValueOnce(
      JSON.stringify({
        data: { repository: { issue: { ...issueData, ...overrides } } },
      }),
    )
    expect(closingPulls(42)).toEqual(Object.keys(overrides).length ? [] : [pr])
  }
})
