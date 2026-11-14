import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import GhostInput from './GhostInput.vue'
import { afterNativeFormReset } from './form-reset'

describe('afterNativeFormReset', () => {
  it('runs apply after dispatch when reset is not canceled', async () => {
    const apply = vi.fn()
    const form = document.createElement('form')
    document.body.append(form)
    form.addEventListener('reset', (event) => {
      afterNativeFormReset(event, apply)
    })

    form.reset()
    await Promise.resolve()

    expect(apply).toHaveBeenCalledOnce()
    form.remove()
  })

  it('skips apply when reset is canceled before dispatch ends', async () => {
    const apply = vi.fn()
    const form = document.createElement('form')
    document.body.append(form)
    form.addEventListener('reset', (event) => {
      event.preventDefault()
      afterNativeFormReset(event, apply)
    })

    form.reset()
    await Promise.resolve()

    expect(apply).not.toHaveBeenCalled()
    form.remove()
  })

  it('skips apply when a later document listener cancels', async () => {
    const apply = vi.fn()
    const form = document.createElement('form')
    document.body.append(form)

    function schedule(event: Event) {
      afterNativeFormReset(event, apply)
    }
    function cancel(event: Event) {
      event.preventDefault()
    }
    document.addEventListener('reset', schedule)
    document.addEventListener('reset', cancel)

    try {
      form.reset()
      await Promise.resolve()

      expect(apply).not.toHaveBeenCalled()
    } finally {
      document.removeEventListener('reset', schedule)
      document.removeEventListener('reset', cancel)
      form.remove()
    }
  })

  it('skips apply when a window listener cancels', async () => {
    const apply = vi.fn()
    const form = document.createElement('form')
    document.body.append(form)

    document.addEventListener('reset', (event) => {
      afterNativeFormReset(event, apply)
    })
    function cancelOnWindow(event: Event) {
      event.preventDefault()
    }
    window.addEventListener('reset', cancelOnWindow)

    try {
      form.reset()
      await Promise.resolve()

      expect(apply).not.toHaveBeenCalled()
    } finally {
      window.removeEventListener('reset', cancelOnWindow)
      form.remove()
    }
  })
})

describe('GhostInput form reset cancellation', () => {
  it('does not emit when a window listener cancels reset', async () => {
    const wrapper = mount(
      {
        setup() {
          return () =>
            h('form', [h(GhostInput, { defaultValue: 'seed', name: 'q' })])
        },
      },
      { attachTo: document.body },
    )
    const form = wrapper.get('form').element as HTMLFormElement
    const input = wrapper.get('input')

    const cancel = (event: Event) => {
      event.preventDefault()
    }
    window.addEventListener('reset', cancel)

    await input.setValue('edited')
    const emitsBefore = wrapper
      .findComponent(GhostInput)
      .emitted('update:modelValue')?.length

    form.reset()
    await Promise.resolve()
    await nextTick()

    expect(input.element.value).toBe('edited')
    expect(
      wrapper.findComponent(GhostInput).emitted('update:modelValue')?.length,
    ).toBe(emitsBefore)

    window.removeEventListener('reset', cancel)
    wrapper.unmount()
  })
})
