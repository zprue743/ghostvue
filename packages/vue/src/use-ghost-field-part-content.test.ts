import { Comment, Fragment, Text, h } from 'vue'
import { describe, expect, it } from 'vitest'

import {
  fieldPartHostHasContent,
  fieldPartSlotHasRenderableContent,
} from './use-ghost-field-part-content'

describe('fieldPartHostHasContent', () => {
  it('detects trimmed text and element children', () => {
    const withText = document.createElement('p')
    withText.textContent = '  hint '
    const withChild = document.createElement('p')
    withChild.appendChild(document.createElement('span'))
    const empty = document.createElement('p')

    expect(fieldPartHostHasContent(withText)).toBe(true)
    expect(fieldPartHostHasContent(withChild)).toBe(true)
    expect(fieldPartHostHasContent(empty)).toBe(false)
    expect(fieldPartHostHasContent(null)).toBe(false)
  })
})

describe('fieldPartSlotHasRenderableContent', () => {
  it('ignores comments, empty text, and whitespace-only strings', () => {
    expect(fieldPartSlotHasRenderableContent([])).toBe(false)
    expect(fieldPartSlotHasRenderableContent([''])).toBe(false)
    expect(fieldPartSlotHasRenderableContent(['   '])).toBe(false)
    expect(
      fieldPartSlotHasRenderableContent([h(Comment, 'ignored') as never]),
    ).toBe(false)
    expect(
      fieldPartSlotHasRenderableContent([h(Text, null, '   ') as never]),
    ).toBe(false)
  })

  it('detects text, elements, and non-empty fragments', () => {
    expect(fieldPartSlotHasRenderableContent(['Error text'])).toBe(true)
    expect(fieldPartSlotHasRenderableContent([h('span')])).toBe(true)
    expect(
      fieldPartSlotHasRenderableContent([
        h(Fragment, null, [h(Comment, 'x'), h('em', 'Details')]),
      ]),
    ).toBe(true)
  })
})
