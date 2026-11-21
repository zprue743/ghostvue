/** @vitest-environment node */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

/*
 * Static guards for forced-colors (Windows High Contrast) recipes. Forced
 * colors repaint backgrounds as Canvas and drop box shadows, so a state shown
 * only by a fill, an opacity, or a shadow ring disappears. Each entry pins the
 * system colors that keep that state visible. Rendering is covered by the
 * forced-colors baselines in tests/e2e/forced-colors-visual.spec.ts.
 */
const themesSrc = resolve(process.cwd(), 'packages/themes/src')

async function readCss(file: string): Promise<string> {
  const css = await readFile(resolve(themesSrc, file), 'utf8')
  return css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ')
}

/** Returns the body of the first `@media <query> { ... }` block. */
function mediaBlock(css: string, query: string): string {
  const start = css.indexOf(`@media ${query}`)
  if (start === -1) return ''
  let depth = 0
  for (let index = css.indexOf('{', start); index < css.length; index += 1) {
    if (css[index] === '{') depth += 1
    if (css[index] === '}') {
      depth -= 1
      if (depth === 0) return css.slice(start, index + 1)
    }
  }
  return ''
}

const cases: readonly {
  file: string
  reason: string
  expected: readonly string[]
}[] = [
  {
    file: 'ghost-radio-group.css',
    reason: 'keeps the checked dot and disabled ring',
    expected: [
      "[data-state='checked'] )::after { background-color: Highlight; }",
      'forced-color-adjust: none',
      '--_ghost-radio-ring: GrayText',
      'outline-color: Highlight',
    ],
  },
  {
    file: 'ghost-select.css',
    reason: 'paints the checked option and greys disabled parts',
    expected: [
      'background-color: Highlight',
      'color: HighlightText',
      'outline-color: HighlightText',
      'color: GrayText',
    ],
  },
  {
    file: 'ghost-combobox.css',
    reason: 'paints the checked option and greys disabled parts',
    expected: [
      'background-color: Highlight',
      'color: HighlightText',
      'outline-color: HighlightText',
      'color: GrayText',
    ],
  },
  {
    file: 'ghost-calendar.css',
    reason: 'separates selected days and range middles from today',
    expected: [
      'background-color: Highlight',
      'color: HighlightText',
      'forced-color-adjust: none',
      "[data-state='range-middle'] ) { border-color: Highlight; }",
    ],
  },
  {
    file: 'ghost-pagination.css',
    reason: 'marks the current page and disabled buttons',
    expected: [
      "button[aria-current='page'] ) { background-color: Highlight;",
      'color: GrayText',
      'opacity: 1',
    ],
  },
  {
    file: 'ghost-number-input.css',
    reason: 'replaces the box-shadow focus ring with an outline',
    expected: [
      'outline: var(--ghost-focus-ring-width) solid Highlight',
      'color: GrayText',
    ],
  },
  {
    file: 'ghost-collapsible.css',
    reason: 'greys disabled triggers (accordion triggers reuse them)',
    expected: ['color: GrayText', 'opacity: 1'],
  },
  {
    file: 'ghost-date-picker.css',
    reason: 'greys the disabled input and trigger',
    expected: [
      '.ghost-date-picker-trigger[data-themed]:disabled ) { border-color: GrayText; color: GrayText; }',
    ],
  },
]

describe('theme CSS forced-colors recipes', () => {
  for (const { file, reason, expected } of cases) {
    it(`${file} ${reason}`, async () => {
      const forced = mediaBlock(await readCss(file), '(forced-colors: active)')
      expect(forced).not.toBe('')
      for (const declaration of expected) {
        expect(forced).toContain(declaration)
      }
    })
  }
})
