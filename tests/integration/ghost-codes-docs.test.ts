/** @vitest-environment node */

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { slopCodes } from '../../packages/vue/src/dev-codes'
import { renderSlopCodeDocs } from '../../packages/vue/src/dev-codes-docs'

describe('diagnostic code docs', () => {
  it('keeps docs/warnings.md identical to the catalog renderer', async () => {
    const markdown = await readFile(
      fileURLToPath(new URL('../../docs/warnings.md', import.meta.url)),
      'utf8',
    )

    expect(markdown).toBe(renderSlopCodeDocs())
    expect(markdown).toContain('## SLOP001')
    expect(markdown).toContain(slopCodes.SLOP001.title)
  })
})
