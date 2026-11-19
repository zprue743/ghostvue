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
