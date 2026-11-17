import { describe, expect, it } from 'vitest'

import { isImeComposing } from './is-ime-composing'

function keydown(init: KeyboardEventInit): KeyboardEvent {
  return new KeyboardEvent('keydown', { bubbles: true, ...init })
}

describe('isImeComposing', () => {
  it('reports keys dispatched during composition (isComposing)', () => {
    expect(
      isImeComposing(keydown({ key: 'ArrowDown', isComposing: true })),
    ).toBe(true)
    expect(isImeComposing(keydown({ key: 'Enter', isComposing: true }))).toBe(
      true,
    )
  })

  it('reports the legacy keyCode 229 signal without isComposing', () => {
    // WebKit fires compositionend before the confirming keydown, which then
    // arrives with isComposing === false, the physical key, and keyCode 229.
    expect(isImeComposing(keydown({ key: 'Enter', keyCode: 229 }))).toBe(true)
    expect(isImeComposing(keydown({ key: 'Process', keyCode: 229 }))).toBe(true)
  })

  it('does not report ordinary keys', () => {
    expect(isImeComposing(keydown({ key: 'Enter', keyCode: 13 }))).toBe(false)
    expect(isImeComposing(keydown({ key: 'ArrowDown' }))).toBe(false)
    expect(isImeComposing(keydown({ key: 'a', keyCode: 65 }))).toBe(false)
    expect(isImeComposing(keydown({ key: 'Process' }))).toBe(false)
  })
})
