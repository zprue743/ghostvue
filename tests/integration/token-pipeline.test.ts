/** @vitest-environment node */

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  compileThemeTokens,
  compileTokenDocuments,
  cssVariableName,
} from '../../packages/themes/scripts/lib/compile-tokens.js'
import { tokens } from '../../packages/themes/src/generated/tokens'

const repositoryRoot = process.cwd()
const themesRoot = resolve(repositoryRoot, 'packages/themes')
const tokensDir = join(themesRoot, 'tokens')

describe('token pipeline', () => {
  const tempDirs: string[] = []

  afterEach(async () => {
    await Promise.all(
      tempDirs
        .splice(0)
        .map((dir) => rm(dir, { recursive: true, force: true })),
    )
  })

  it('maps role.part.state names to --sl-<role>-<part>-<state>', () => {
    expect(cssVariableName('action.primary.bg')).toBe('--sl-action-primary-bg')
    expect(cssVariableName('action.primary.bg.hover')).toBe(
      '--sl-action-primary-bg-hover',
    )
    expect(cssVariableName('control.size.sm.padding.block')).toBe(
      '--sl-control-size-sm-padding-block',
    )
  })

  it('snapshots compiled CSS, TypeScript, JSON, and docs outputs', async () => {
    const compiled = await compileThemeTokens(tokensDir)

    expect(compiled.css).toBe(
      await readFile(join(themesRoot, 'src/generated/tokens.css'), 'utf8'),
    )
    expect(compiled.typescript).toBe(
      await readFile(join(themesRoot, 'src/generated/tokens.ts'), 'utf8'),
    )
    expect(compiled.manifestJson).toBe(
      await readFile(join(themesRoot, 'src/generated/tokens.json'), 'utf8'),
    )
    expect(compiled.docsMarkdown).toBe(
      await readFile(resolve(repositoryRoot, 'docs/themes/tokens.md'), 'utf8'),
    )
    expect(compiled.css).toContain('--sl-action-primary-bg: #1d4ed8;')
    expect(compiled.css).toContain('--sl-action-primary-bg: #60a5fa;')
    expect(compiled.css).toContain("[data-sl-mode='dark']")
    expect(compiled.css).toContain('prefers-color-scheme: dark')
    expect(compiled.css).not.toContain('--slop-')
    expect(compiled.manifest.tokens.length).toBeGreaterThan(0)
  })

  it('exports typed semantic constants with resolved light and dark values', () => {
    expect(tokens['action.primary.bg'].cssVar).toBe('--sl-action-primary-bg')
    expect(tokens['action.primary.bg'].value.light).toBe('#1d4ed8')
    expect(tokens['action.primary.bg'].value.dark).toBe('#60a5fa')
    expect(tokens['color.blue.700'].tier).toBe('primitive')
    expect(tokens['color.blue.700']).not.toHaveProperty('cssVar')
  })

  it('nests rest-state tokens with hover/active children', () => {
    const compiled = compileTokenDocuments([
      {
        file: 'primitives.json',
        tier: 'primitive',
        tree: {
          color: {
            blue: {
              700: { $type: 'color', $value: '#1d4ed8' },
              800: { $type: 'color', $value: '#1e40af' },
            },
          },
        },
      },
      {
        file: 'semantic.json',
        tier: 'semantic',
        tree: {
          action: {
            primary: {
              bg: {
                $type: 'color',
                $value: '{color.blue.700}',
                hover: { $type: 'color', $value: '{color.blue.800}' },
              },
            },
          },
        },
      },
    ])

    const names = compiled.tokens.map((token) => token.name)
    expect(names).toContain('action.primary.bg')
    expect(names).toContain('action.primary.bg.hover')
    expect(
      compiled.tokens.find((token) => token.name === 'action.primary.bg.hover')
        ?.cssVar,
    ).toBe('--sl-action-primary-bg-hover')
  })

  it('rejects cyclic aliases, unknown aliases, and primitive-to-semantic aliases', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'slop-tokens-'))
    tempDirs.push(dir)

    await writeFile(
      join(dir, 'primitives.json'),
      JSON.stringify({
        color: {
          a: { $type: 'color', $value: '{color.b}' },
          b: { $type: 'color', $value: '{color.a}' },
        },
      }),
    )
    await writeFile(join(dir, 'semantic.json'), '{}')
    await writeFile(join(dir, 'semantic.dark.json'), '{}')

    await expect(compileThemeTokens(dir)).rejects.toThrow(/Cyclic token alias/)

    await writeFile(
      join(dir, 'primitives.json'),
      JSON.stringify({
        color: {
          a: { $type: 'color', $value: '{color.missing}' },
        },
      }),
    )
    await expect(compileThemeTokens(dir)).rejects.toThrow(/Unknown token/)

    await writeFile(
      join(dir, 'primitives.json'),
      JSON.stringify({
        color: {
          seed: { $type: 'color', $value: '{action.primary.bg}' },
        },
      }),
    )
    await writeFile(
      join(dir, 'semantic.json'),
      JSON.stringify({
        action: {
          primary: {
            bg: { $type: 'color', $value: '#1d4ed8' },
          },
        },
      }),
    )
    await expect(compileThemeTokens(dir)).rejects.toThrow(
      /may not alias semantic token/,
    )
  })

  it('rejects a dark overlay that does not match a semantic base token', () => {
    expect(() =>
      compileTokenDocuments([
        {
          file: 'semantic.json',
          tier: 'semantic',
          tree: {
            action: {
              primary: {
                bg: { $type: 'color', $value: '#1d4ed8' },
              },
            },
          },
        },
        {
          file: 'semantic.dark.json',
          tier: 'semantic',
          overlayMode: 'dark',
          tree: {
            action: {
              primary: {
                fg: { $type: 'color', $value: '#0f172a' },
              },
            },
          },
        },
      ]),
    ).toThrow(/has no base token/)
  })
})
