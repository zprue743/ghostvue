/** @vitest-environment node */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import vitepressConfig from '../../apps/docs/.vitepress/config'

describe('docs hosting', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it.each([
    { target: 'production', expectedScripts: 1 },
    { target: 'preview', expectedScripts: 0 },
    { target: 'development', expectedScripts: 0 },
    { target: undefined, expectedScripts: 0 },
  ])(
    'includes Web Analytics only in production ($target)',
    ({ target, expectedScripts }) => {
      vi.stubEnv('VERCEL_ENV', target)

      const analytics = vitepressConfig
        .transformHead()
        .filter(
          ([tag, attributes]) =>
            tag === 'script' &&
            attributes.src === '/_vercel/insights/script.js',
        )

      expect(analytics).toHaveLength(expectedScripts)
    },
  )

  it('enables Vercel cleanUrls, PR preview deploys, and permanent spec redirects', async () => {
    const raw = await readFile(
      resolve(process.cwd(), 'apps/docs/vercel.json'),
      'utf8',
    )

    expect(JSON.parse(raw)).toEqual({
      cleanUrls: true,
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
    expect(Object.keys(vitepressConfig.rewrites)).toContain(
      'components/tooltip-provider-spec.md',
    )
  })
})
