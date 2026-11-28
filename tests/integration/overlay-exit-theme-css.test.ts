/** @vitest-environment node */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

async function readTheme(name: string): Promise<string> {
  return stripComments(
    await readFile(
      resolve(process.cwd(), `packages/themes/src/${name}.css`),
      'utf8',
    ),
  )
}

/** Bodies of every rule whose selector list includes `selector`. */
function ruleBodies(css: string, selector: string): string[] {
  const bodies: string[] = []
  let from = 0
  for (;;) {
    const at = css.indexOf(selector, from)
    if (at === -1) {
      return bodies
    }
    const open = css.indexOf('{', at)
    let depth = 1
    let index = open + 1
    while (depth > 0 && index < css.length) {
      if (css[index] === '{') depth += 1
      if (css[index] === '}') depth -= 1
      index += 1
    }
    bodies.push(css.slice(open + 1, index - 1))
    from = index
  }
}

/** Contents of every `@media <query> { ... }` block. */
function mediaBlocks(css: string, query: string): string {
  return ruleBodies(css, `@media ${query}`).join('\n')
}

const hosts = [
  {
    file: 'ghost-dialog',
    surfaces: ['.ghost-dialog-content', '.ghost-dialog-overlay'],
    travel: 'translate: 0 calc(var(--ghost-motion-translate) / 2);',
  },
  {
    file: 'ghost-drawer',
    surfaces: ['.ghost-drawer-content', '.ghost-drawer-overlay'],
    travel: 'translate: -100% 0;',
  },
  {
    file: 'ghost-popover',
    surfaces: ['.ghost-popover-content'],
    travel: 'scale: 0.98;',
  },
  {
    file: 'ghost-hover-card',
    surfaces: ['.ghost-hover-card-content'],
    travel: 'scale: 0.98;',
  },
  {
    file: 'ghost-command-palette',
    surfaces: [
      '.ghost-command-palette-content',
      '.ghost-command-palette-overlay',
    ],
    travel: 'scale: 0.98;',
  },
] as const

describe('overlay exit recipes', () => {
  it.each(hosts)(
    '$file fades every adopted surface out on [data-state=closed]',
    async ({ file, surfaces }) => {
      const css = await readTheme(file)
      for (const surface of surfaces) {
        const closed = ruleBodies(css, `${surface}[data-state='closed']`).join(
          '\n',
        )
        expect(closed, surface).toContain('opacity: 0;')
        expect(closed, surface).toContain('var(--ghost-motion-exit-duration)')
        expect(closed, surface).toContain('var(--ghost-motion-exit-easing)')
        expect(closed, surface).toContain('var(--ghost-motion-fade-duration)')
      }
    },
  )

  it.each(hosts)(
    '$file only travels spatially under no-preference',
    async ({ file, travel }) => {
      const css = await readTheme(file)
      const exitRules = css
        .split(/(?=:where\()/)
        .filter((chunk) => chunk.includes("[data-state='closed']"))
        .join('\n')
      expect(exitRules).toContain(travel)
      const reduced = mediaBlocks(css, '(prefers-reduced-motion: reduce)')
      expect(reduced).not.toContain(travel)
      // Every spatial exit declaration lives inside a no-preference block.
      const outsideMotion = css.replace(
        /@media \(prefers-reduced-motion: no-preference\)\s*\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}/g,
        '',
      )
      expect(outsideMotion).not.toContain(travel)
    },
  )

  it.each(hosts)(
    '$file keeps geometry and forced-colors paint off [data-state=open]',
    async ({ file, surfaces }) => {
      const css = await readTheme(file)
      const forced = mediaBlocks(css, '(forced-colors: active)')
      expect(forced).not.toContain("[data-state='open']")
      for (const surface of surfaces) {
        for (const body of ruleBodies(css, `${surface}[data-state='open']`)) {
          expect(body, surface).not.toMatch(/\bposition:|\binset:|z-index/)
        }
      }
    },
  )

  it('drawer exits toward each physical edge and collapses travel when reduced', async () => {
    const css = await readTheme('ghost-drawer')
    const motion = mediaBlocks(css, '(prefers-reduced-motion: no-preference)')
    for (const edge of [
      'translate: -100% 0;',
      'translate: 100% 0;',
      'translate: 0 -100%;',
      'translate: 0 100%;',
    ]) {
      expect(motion).toContain(edge)
    }
    const reduced = mediaBlocks(css, '(prefers-reduced-motion: reduce)')
    expect(
      ruleBodies(reduced, ".ghost-drawer-content[data-state='closed']").join(
        '\n',
      ),
    ).toContain('translate: none;')
  })
})
