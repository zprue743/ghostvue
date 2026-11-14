import { describe, expect, it, vi } from 'vitest'

import { afterNativeFormReset } from './form-reset'

describe('afterNativeFormReset', () => {
  it('runs apply when reset is not canceled', () => {
    const apply = vi.fn()
    const form = document.createElement('form')
    const event = new Event('reset', { cancelable: true })
    Object.defineProperty(event, 'target', { value: form })

    afterNativeFormReset(event, apply)

    expect(apply).toHaveBeenCalledOnce()
  })

  it('skips apply when reset is canceled', () => {
    const apply = vi.fn()
    const form = document.createElement('form')
    const event = new Event('reset', { cancelable: true })
    Object.defineProperty(event, 'target', { value: form })
    event.preventDefault()

    afterNativeFormReset(event, apply)

    expect(apply).not.toHaveBeenCalled()
  })
})
