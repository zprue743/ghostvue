/** @vitest-environment node */

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  expandExportTarget,
  packedContentProblems,
} from '../../scripts/lib/published-contents.js'

// #347: the tarball file-list gate that `pnpm published-exports` runs on the
// `npm pack --dry-run` output of every publishable package.

function check(
  files: readonly string[],
  maps: Record<string, unknown> = {},
): string[] {
  return packedContentProblems({
    name: '@ghostvue/example',
    files,
    readText: (path) => JSON.stringify(maps[path]),
  })
}

describe('packedContentProblems', () => {
  it('accepts a README and built files without maps or tests', () => {
    expect(
      check(['README.md', 'package.json', 'dist/index.js', 'dist/index.d.ts']),
    ).toEqual([])
  })

  it('reports compiled test files, declarations, and their maps', () => {
    const problems = check(
      [
        'README.md',
        'dist/ghost-select.test.js',
        'dist/ghost-select.test.d.ts',
        'dist/nested/button.spec.js',
        'dist/__tests__/helper.js',
        'dist/testing.js',
        'dist/contest.js',
      ],
      {},
    )
    expect(problems).toEqual([
      '@ghostvue/example tarball includes test file dist/ghost-select.test.js',
      '@ghostvue/example tarball includes test file dist/ghost-select.test.d.ts',
      '@ghostvue/example tarball includes test file dist/nested/button.spec.js',
      '@ghostvue/example tarball includes test file dist/__tests__/helper.js',
    ])
  })

  it('requires a root README, not a nested one', () => {
    expect(check(['package.json', 'dist/README.md'])).toEqual([
      '@ghostvue/example tarball has no README',
    ])
  })

  it('reports a map whose sources are neither shipped nor embedded', () => {
    expect(
      check(['README.md', 'dist/rules/a.js', 'dist/rules/a.js.map'], {
        'dist/rules/a.js.map': { sources: ['../../src/rules/a.ts'] },
      }),
    ).toEqual([
      '@ghostvue/example source map dist/rules/a.js.map points at src/rules/a.ts, which the tarball does not include',
    ])
  })

  it('accepts maps whose sources ship or are embedded', () => {
    expect(
      check(
        [
          'README.md',
          'src/a.ts',
          'dist/a.js.map',
          'dist/b.js.map',
          'dist/c.js.map',
        ],
        {
          'dist/a.js.map': { sources: ['../src/a.ts'] },
          'dist/b.js.map': {
            sources: ['../src/b.ts'],
            sourcesContent: ['export {}'],
          },
          'dist/c.js.map': { sourceRoot: '../src/', sources: ['a.ts'] },
        },
      ),
    ).toEqual([])
  })

  it('reports absolute or URL sources that cannot resolve in the tarball', () => {
    expect(
      check(['README.md', 'dist/a.js.map'], {
        'dist/a.js.map': { sources: ['webpack://pkg/src/a.ts'] },
      }),
    ).toEqual([
      '@ghostvue/example source map dist/a.js.map points at webpack://pkg/src/a.ts, which the tarball does not include',
    ])
  })
})

describe('expandExportTarget', () => {
  // #386: `./recipes/*.css` is the first subpath pattern a package exports.
  it('returns a plain target unchanged and expands a file-name pattern', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ghostvue-export-pattern-'))
    try {
      await mkdir(join(root, 'dist/recipes'), { recursive: true })
      for (const file of ['button.css', 'input.css', 'notes.txt']) {
        await writeFile(join(root, 'dist/recipes', file), '')
      }

      expect(await expandExportTarget(root, './dist/index.js')).toEqual([
        { star: undefined, target: './dist/index.js' },
      ])
      expect(await expandExportTarget(root, './dist/recipes/*.css')).toEqual([
        { star: 'button', target: './dist/recipes/button.css' },
        { star: 'input', target: './dist/recipes/input.css' },
      ])
      expect(await expandExportTarget(root, './dist/missing/*.css')).toEqual([])
      await expect(
        expandExportTarget(root, './dist/*/index.css'),
      ).rejects.toThrow(/one \* in the file name/)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
