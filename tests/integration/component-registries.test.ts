/** @vitest-environment node */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access -- generator is plain JS */

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  buildAutoImportNames,
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

  it('derives auto-import names from barrel value exports only', () => {
    const names = buildAutoImportNames(
      {
        schemaVersion: '1.0.0',
        slug: 'primitives',
        familyOrder: ['badge'],
        vueBarrel: [
          "export { useGhostId, useFocusScope } from './use-ghost-id'",
          // A future non-component Ghost* value (an app plugin) must not
          // become an auto-imported component.
          "export { GhostVue } from './plugin'",
        ],
        themesBarrel: ["export { tokens } from './generated/tokens'"],
      },
      [
        {
          schemaVersion: '1.0.0',
          slug: 'badge',
          vueBarrel: [
            "export { default as GhostBadge } from './GhostBadge.vue'",
            "export {\n  useGhostBadge,\n  type GhostBadgeRootProps,\n} from './use-ghost-badge'",
            "export type { GhostBadgeProps } from './ghost-badge'",
          ],
          themesBarrel: [
            "export { GhostBadge, type GhostBadgeTone } from './ghost-badge'",
          ],
        },
      ],
    )
    expect(names).toEqual({
      headlessComponents: ['GhostBadge'],
      headlessComposables: ['useGhostBadge', 'useGhostId'],
      themedComponents: ['GhostBadge'],
    })
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

  it('regenerates package barrels when adding exports to an existing family', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'ghostvue-registries-'))
    try {
      const registryDir = join(tempRoot, 'packages/vue/registry')
      await mkdir(registryDir, { recursive: true })

      const initialVueExport =
        "export { default as GhostBadge } from './GhostBadge.vue'"
      const addedVueExport =
        "export type { GhostBadgeExtraProps } from './ghost-badge'"
      const initialThemesExport =
        "export { GhostBadge, type GhostBadgeExposed } from './ghost-badge'"
      const addedThemesExport =
        "export { GhostBadgeAddon, type GhostBadgeAddonProps } from './ghost-badge-addon'"

      await writeFile(
        join(registryDir, 'primitives.registry.json'),
        JSON.stringify(
          {
            schemaVersion: '1.0.0',
            slug: 'primitives',
            familyOrder: ['badge'],
            vueBarrel: ["export { useGhostId } from './use-ghost-id'"],
            themesBarrel: [
              "export { startThemeTransition } from './start-theme-transition'",
            ],
            vueBarrelOrdered: [
              "export { useGhostId } from './use-ghost-id'",
              initialVueExport,
            ],
            themesBarrelOrdered: [
              "export { startThemeTransition } from './start-theme-transition'",
              initialThemesExport,
            ],
            vueBarrelSource: `/**\n * Public Vue package entry point.\n */\nexport { useGhostId } from './use-ghost-id'\n${initialVueExport}\n`,
            themesBarrelSource: `/** Themed wrappers and default CSS. */\nimport './default.css'\n\nexport { startThemeTransition } from './start-theme-transition'\n${initialThemesExport}\n`,
          },
          null,
          2,
        ),
      )

      const badgeRegistryPath = join(registryDir, 'badge.registry.json')
      const badgeBase = {
        schemaVersion: '1.0.0',
        slug: 'badge',
        docs: {
          title: 'GhostBadge',
          specStatus: 'approved',
          link: '/components/badge',
          specLink: '/specs/badge',
          category: 'feedback',
          sidebarLabel: 'Badge',
        },
        vueBarrel: [initialVueExport],
        themesBarrel: [initialThemesExport],
        examples: [],
      }
      await writeFile(badgeRegistryPath, JSON.stringify(badgeBase, null, 2))

      await syncRepositoryRegistries({ repositoryRoot: tempRoot, write: true })

      await writeFile(
        badgeRegistryPath,
        JSON.stringify(
          {
            ...badgeBase,
            vueBarrel: [initialVueExport, addedVueExport],
            themesBarrel: [initialThemesExport, addedThemesExport],
          },
          null,
          2,
        ),
      )

      const staleCheck = await syncRepositoryRegistries({
        repositoryRoot: tempRoot,
        write: false,
      })
      expect(staleCheck.violations).toEqual(
        expect.arrayContaining([
          expect.stringContaining(
            'packages/vue/src/.registries/public-api.generated.ts is stale',
          ),
          expect.stringContaining(
            'packages/vue/src/.publish-index.generated.ts is stale',
          ),
          expect.stringContaining(
            'packages/themes/src/.registries/public-api.generated.ts is stale',
          ),
          expect.stringContaining(
            'packages/themes/src/.publish-index.generated.ts is stale',
          ),
        ]),
      )

      await syncRepositoryRegistries({ repositoryRoot: tempRoot, write: true })

      const cleanCheck = await syncRepositoryRegistries({
        repositoryRoot: tempRoot,
        write: false,
      })
      expect(cleanCheck.violations).toEqual([])

      const vuePublicApi = await readFile(
        join(tempRoot, 'packages/vue/src/.registries/public-api.generated.ts'),
        'utf8',
      )
      const vuePublishIndex = await readFile(
        join(tempRoot, 'packages/vue/src/.publish-index.generated.ts'),
        'utf8',
      )
      const themesPublicApi = await readFile(
        join(
          tempRoot,
          'packages/themes/src/.registries/public-api.generated.ts',
        ),
        'utf8',
      )
      const themesPublishIndex = await readFile(
        join(tempRoot, 'packages/themes/src/.publish-index.generated.ts'),
        'utf8',
      )

      expect(vuePublicApi).toContain("from '../ghost-badge'")
      expect(vuePublicApi).toContain('GhostBadgeExtraProps')
      expect(vuePublishIndex).toContain(addedVueExport)

      expect(themesPublicApi).toContain("from '../ghost-badge-addon'")
      expect(themesPublicApi).toContain('GhostBadgeAddonProps')
      expect(themesPublicApi).not.toContain("import '../default.css'")
      expect(themesPublishIndex).toContain("import './default.css'")
      expect(themesPublishIndex).toContain(addedThemesExport)
    } finally {
      await rm(tempRoot, { recursive: true, force: true })
    }
  })
})
