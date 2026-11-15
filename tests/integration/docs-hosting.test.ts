/** @vitest-environment node */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import vitepressConfig from '../../apps/docs/.vitepress/config'

describe('docs hosting', () => {
  it('enables Vercel cleanUrls, master-only Git deploys, and permanent spec redirects', async () => {
    const raw = await readFile(
      resolve(process.cwd(), 'apps/docs/vercel.json'),
      'utf8',
    )

    expect(JSON.parse(raw)).toEqual({
      cleanUrls: true,
      git: {
        deploymentEnabled: {
          '**': false,
          master: true,
        },
      },
      redirects: [
        {
          source: '/components/:slug-spec',
          destination: '/specs/:slug',
          permanent: true,
        },
      ],
    })
  })

  it('rewrites the ADR README and component specs onto /specs/* URLs', () => {
    expect(vitepressConfig.rewrites).toMatchObject({
      'adr/README.md': 'adr/index.md',
      'components/button-spec.md': 'specs/button.md',
    })
    expect(Object.keys(vitepressConfig.rewrites ?? {})).toContain(
      'components/tooltip-provider-spec.md',
    )
  })
})
