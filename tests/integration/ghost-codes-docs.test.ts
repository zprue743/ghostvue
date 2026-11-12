/** @vitest-environment node */

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { ghostCodes } from '../../packages/vue/src/dev-codes'
import { renderGhostCodeDocs } from '../../packages/vue/src/dev-codes-docs'

describe('diagnostic code docs', () => {
  it('keeps docs/warnings.md identical to the catalog renderer', async () => {
    const markdown = await readFile(
      fileURLToPath(new URL('../../docs/warnings.md', import.meta.url)),
      'utf8',
    )

    expect(markdown).toBe(renderGhostCodeDocs())
    expect(markdown).toContain('## GHOST001')
    expect(markdown).toContain(ghostCodes.GHOST001.title)
  })
})
