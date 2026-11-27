/** @vitest-environment node */
import { execFileSync, spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { beforeEach, expect, it, vi } from 'vitest'
import { createRelease } from '../../scripts/github-release.mjs'

vi.mock('node:child_process', { spy: true })
vi.mock('node:fs/promises', { spy: true })

const sha = 'a'.repeat(40)
const release = {
  GITHUB_REF: 'refs/heads/release/0.1.x',
  GITHUB_REPOSITORY: 'zprue743/ghostvue',
  GITHUB_SHA: sha,
  GITHUB_RUN_ID: '123',
  EXPECTED_VERSION: '0.1.1',
}

beforeEach(() => {
  vi.resetAllMocks()
})

it('writes exact-version npm links and notes without promoting a patch release', async () => {
  vi.mocked(execFileSync).mockReturnValue('')
  vi.mocked(readFile).mockResolvedValue(
    '# Changelog\r\n\r\n## 0.1.1\r\n\r\n### Patch Changes\r\n\r\n- Fix the bug\r\n\r\n## 0.1.0\r\n\r\n- First release',
  )

  await createRelease(release)

  expect(execFileSync).toHaveBeenCalledTimes(2)
  const [command, args, options] = vi.mocked(execFileSync).mock.calls[1]
  expect(command).toBe('gh')
  expect(args).toEqual(
    expect.arrayContaining([
      'create',
      'v0.1.1',
      '--target',
      sha,
      '--latest=false',
    ]),
  )
  expect(options.input).toContain('actions/runs/123')
  expect(options.input).toContain('@ghostvue/vue/v/0.1.1')
  expect(options.input).toContain('@ghostvue/mcp/v/0.1.1')
  expect(options.input).toContain('- Fix the bug')
  expect(options.input).not.toContain('First release')
})

it('refuses a tag that points at another commit', async () => {
  vi.mocked(execFileSync).mockReturnValue(
    `${'b'.repeat(40)}\trefs/tags/v0.1.1\n`,
  )

  await expect(createRelease(release)).rejects.toThrow(
    'points to a different commit',
  )
  expect(execFileSync).toHaveBeenCalledTimes(1)
})

it('reuses an already published release at the verified commit', async () => {
  vi.mocked(execFileSync).mockReturnValue(`${sha}\trefs/tags/v0.1.1\n`)
  vi.mocked(spawnSync).mockReturnValue({
    status: 0,
    stdout: JSON.stringify({
      isDraft: false,
      url: 'https://example.com/release',
    }),
  })

  await createRelease(release)

  expect(execFileSync).toHaveBeenCalledTimes(1)
  expect(readFile).not.toHaveBeenCalled()
})
