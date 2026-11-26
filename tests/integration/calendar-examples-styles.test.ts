/** @vitest-environment node */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { ghostExamples, ghostExampleSourcePath } from '../../examples/registry'

/*
 * Issue #349: headless calendar examples paint their inline month grid with
 * one shared consumer stylesheet. Each SFC carries a copy so the shown and
 * copied source stays self-contained; this keeps the copies identical so a
 * fix to the grid cannot land in one example only, and fails when a new
 * headless calendar example ships without the block.
 */

const headless = ghostExamples.filter(
  (example) =>
    example.id.startsWith('calendar/') && example.layer === 'headless',
)

function source(id: string): string {
  return readFileSync(join(process.cwd(), ghostExampleSourcePath(id)), 'utf8')
}

function sharedBlock(id: string): string {
  const blocks = [...source(id).matchAll(/<style>([\s\S]*?)<\/style>/g)]
    .map((match) => match[1] ?? '')
    .filter((block) => block.includes('.calendar-demo {'))
  expect(blocks).toHaveLength(1)
  return blocks[0] ?? ''
}

describe('headless calendar example styles', () => {
  it('covers every headless calendar example', () => {
    expect(headless.map((example) => example.id)).toContain('calendar/basic')
    expect(headless.length).toBeGreaterThanOrEqual(5)
  })

  it.each(headless.map((example) => [example.id]))(
    '%s stays headless and styles its calendar with the shared block',
    (id) => {
      const text = source(id)
      expect(text).toContain("from '@ghostvue/vue'")
      expect(text).not.toContain('@ghostvue/themes')
      // GhostCalendar renders no element, so the class sits on a wrapper.
      const template = /<template>([\s\S]*)<\/template>/.exec(text)?.[1]
      expect(template).toMatch(
        /<div class="calendar-demo">\s*<GhostCalendar[\s>]/,
      )
      expect(sharedBlock(id)).toBe(sharedBlock('calendar/basic'))
    },
  )
})
