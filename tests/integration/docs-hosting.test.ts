/** @vitest-environment node */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import vitepressConfig from '../../apps/docs/.vitepress/config'

describe('docs hosting', () => {
  it('enables Vercel cleanUrls next to the VitePress app', async () => {
    const raw = await readFile(
      resolve(process.cwd(), 'apps/docs/vercel.json'),
      'utf8',
    )

    expect(JSON.parse(raw)).toEqual({ cleanUrls: true })
  })

  it('rewrites the ADR README to the directory index URL', () => {
    expect(vitepressConfig.rewrites).toEqual({
      'adr/README.md': 'adr/index.md',
    })
  })
})
