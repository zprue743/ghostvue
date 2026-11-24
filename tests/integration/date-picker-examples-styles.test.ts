/** @vitest-environment node */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { ghostExamples, ghostExampleSourcePath } from '../../examples/registry'

/*
 * GHO-220: headless date picker examples paint their portaled calendar
 * surface with one shared consumer stylesheet. Each SFC carries a copy so
 * the shown and copied source stays self-contained; this keeps the copies
 * identical so a fix to the month grid cannot land in one example only.
 */

const headless = ghostExamples.filter(
  (example) =>
    example.id.startsWith('date-picker/') && example.layer === 'headless',
)

function source(id: string): string {
  return readFileSync(join(process.cwd(), ghostExampleSourcePath(id)), 'utf8')
}

function sharedBlock(id: string): string {
  const blocks = [...source(id).matchAll(/<style>([\s\S]*?)<\/style>/g)]
    .map((match) => match[1] ?? '')
    .filter((block) => block.includes('.date-picker-demo__popup {'))
  expect(blocks).toHaveLength(1)
  return blocks[0] ?? ''
}

describe('headless date picker example styles', () => {
  it('covers every headless date picker example', () => {
    expect(headless.map((example) => example.id)).toContain('date-picker/basic')
    expect(headless.length).toBeGreaterThanOrEqual(7)
  })

  it.each(headless.map((example) => [example.id]))(
    '%s styles its input, trigger and popup with the shared block',
    (id) => {
      const template = /<template>([\s\S]*)<\/template>/.exec(source(id))?.[1]
      expect(template).toMatch(
        /<GhostDatePickerInput[^>]*class="date-picker-demo__input"/,
      )
      expect(template).toMatch(
        /<GhostDatePickerTrigger[^>]*class="date-picker-demo__button"/,
      )
      expect(template).toMatch(
        /<GhostDatePickerContent[^>]*class="date-picker-demo__popup"/,
      )
      expect(sharedBlock(id)).toBe(sharedBlock('date-picker/basic'))
    },
  )
})
