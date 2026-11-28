/** @vitest-environment node */

import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const themesSrc = resolve(process.cwd(), 'packages/themes/src')

function importedRecipeFiles(): string[] {
  const css = readFileSync(
    resolve(themesSrc, '.registries/component-imports.generated.css'),
    'utf8',
  )
  return [...css.matchAll(/@import '\.\.\/(ghost-[\w-]+\.css)';/g)].map(
    (match) => match[1] ?? '',
  )
}

describe('@ghostvue/themes default.css component imports', () => {
  it('loads every component recipe stylesheet exactly once', () => {
    // A recipe file missing from `themesCssImports` ships themed wrappers with
    // no styles (GhostCalendar rendered native buttons). Docs hid it because
    // the VitePress reset stripped native chrome from themed demos.
    const recipes = readdirSync(themesSrc)
      .filter((file) => /^ghost-[\w-]+\.css$/.test(file))
      .sort()
    const imported = importedRecipeFiles()

    expect([...imported].sort()).toEqual(recipes)
    expect(new Set(imported).size).toBe(imported.length)
  })
})

describe('@ghostvue/themes opt-in stylesheets (#386)', () => {
  function localImports(file: string): string[] {
    const css = readFileSync(resolve(themesSrc, file), 'utf8')
    return [...css.matchAll(/@import '([^']+)';/g)].map(
      (match) => match[1] ?? '',
    )
  }

  it('composes default.css from the default palette, the shared base, and every recipe', () => {
    // The opt-in path reuses base.css and the per-component files, so the
    // all-in stylesheet must be exactly those pieces plus the default tokens.
    expect(localImports('default.css')).toEqual([
      './generated/tokens.css',
      './base.css',
      './.registries/component-imports.generated.css',
    ])
  })

  it('keeps palettes and component recipes out of the shared base', () => {
    expect(localImports('base.css')).toEqual(['./recipes.css'])
    expect(localImports('recipes.css')).toEqual([])
    for (const file of readdirSync(themesSrc).filter((name) =>
      /^ghost-[\w-]+\.css$/.test(name),
    )) {
      // Published as standalone recipes/<slug>.css files.
      expect(localImports(file), file).toEqual([])
    }
  })
})
