import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('published export checks', () => {
  it('runs after the library build in verify', async () => {
    const packageJson = JSON.parse(
      await readFile(resolve(process.cwd(), 'package.json'), 'utf8'),
    ) as { scripts?: Record<string, string> }

    // Dist artifacts do not exist during `pnpm test`, so this guard belongs
    // after `pnpm build` in verify rather than in the earlier typecheck/test
    // gates. The script itself is what inspects the files.
    expect(packageJson.scripts?.['published-exports']).toBe(
      'node scripts/check-published-exports.mjs',
    )
    expect(packageJson.scripts?.verify).toMatch(
      /pnpm build && pnpm published-exports/,
    )
  })
})
