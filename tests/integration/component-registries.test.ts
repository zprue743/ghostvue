/** @vitest-environment node */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access -- generator is plain JS */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  hashContent,
  syncRepositoryRegistries,
} from '../../scripts/lib/component-registries.js'

const repositoryRoot = process.cwd()

describe('component registries', () => {
  it('matches generated artifacts after registries:write', async () => {
    const check = await syncRepositoryRegistries({
      repositoryRoot,
      write: false,
    })
    expect(check.violations).toEqual([])
  })

  it('tracks vue public API hash for merge proofs', async () => {
    const vueApi = await readFile(
      join(
        repositoryRoot,
        'packages/vue/src/.registries/public-api.generated.ts',
      ),
      'utf8',
    )
    expect(hashContent(vueApi).length).toBe(64)
  })
})
