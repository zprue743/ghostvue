import { describe, expect, it } from 'vitest'

import { fieldPartHostHasContent } from './use-ghost-field-part-content'

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
