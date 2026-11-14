import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import { useGhostTextarea } from './use-ghost-textarea'

function mountComposable<Value>(setup: () => Value) {
  let result!: Value
  const wrapper = mount(
    defineComponent({
      setup() {
        result = setup()
        return () => h('div')
      },
    }),
  )
  return { result, wrapper }
}

describe('useGhostTextarea', () => {
  it('defaults to an empty uncontrolled value and native rows', () => {
    const { result, wrapper } = mountComposable(() => useGhostTextarea())

    expect(result.value.value).toBe('')
    expect(result.rows.value).toBe(2)
    expect(result.rootProps.value.class).toBe('ghost-textarea')
    expect(result.rootProps.value['data-part']).toBe('root')
    expect(result.rootProps.value.rows).toBe(2)
    expect(result.rootProps.value.style['--_ghost-textarea-rows']).toBe('2')
    expect(result.rootProps.value.disabled).toBeUndefined()
    expect(result.rootProps.value['aria-invalid']).toBeUndefined()
    expect(result.rootProps.value['data-state']).toBeUndefined()
    expect(result.rootProps.value['data-auto-resize']).toBeUndefined()
    wrapper.unmount()
  })

  it('writes the model from native input and emits once', () => {
    const onValueChange = vi.fn()
    const { result, wrapper } = mountComposable(() =>
      useGhostTextarea({ onValueChange }),
    )
    const textarea = document.createElement('textarea')
    textarea.value = 'notes'
    const event = new Event('input', { bubbles: true })
    Object.defineProperty(event, 'target', { value: textarea })

    result.onInput(event)

    expect(result.value.value).toBe('notes')
    expect(onValueChange).toHaveBeenCalledOnce()
    expect(onValueChange).toHaveBeenCalledWith('notes')
    wrapper.unmount()
  })

  it('treats an empty string as a defined controlled value', () => {
    const modelValue = ref('')
    const { result, wrapper } = mountComposable(() =>
      useGhostTextarea({ modelValue }),
    )

    result.value.value = 'x'

    expect(result.value.value).toBe('')
    wrapper.unmount()
  })

  it('exposes disabled, readonly, and invalid with disabled winning data-state', () => {
    const disabled = ref(false)
    const readonly = ref(true)
    const invalid = ref(true)
    const { result, wrapper } = mountComposable(() =>
      useGhostTextarea({ disabled, readonly, invalid, required: true }),
    )

    expect(result.rootProps.value.readonly).toBe(true)
    expect(result.rootProps.value.required).toBe(true)
    expect(result.rootProps.value['aria-invalid']).toBe('true')
    expect(result.rootProps.value['data-state']).toBe('readonly')

    disabled.value = true
    expect(result.rootProps.value.disabled).toBe(true)
    expect(result.rootProps.value['data-state']).toBe('disabled')
    wrapper.unmount()
  })

  it('marks auto-resize as a configuration hook and no-ops resize without a host', () => {
    const { result, wrapper } = mountComposable(() =>
      useGhostTextarea({ autoResize: true, maxRows: 6 }),
    )

    expect(result.autoResize.value).toBe(true)
    expect(result.maxRows.value).toBe(6)
    expect(result.rootProps.value['data-auto-resize']).toBe('')
    expect(() => {
      result.resize(null)
    }).not.toThrow()
    wrapper.unmount()
  })

  it('measures after mount and caps overflow when content exceeds maxRows', () => {
    const textarea = document.createElement('textarea')
    Object.defineProperty(textarea, 'scrollHeight', { get: () => 480 })
    document.body.append(textarea)

    const { result, wrapper } = mountComposable(() =>
      useGhostTextarea({
        autoResize: true,
        rows: 2,
        maxRows: 4,
        element: textarea,
      }),
    )

    result.resize(textarea)

    expect(textarea.style.height).toMatch(/^\d+px$/)
    expect(textarea.style.overflowY).toBe('auto')

    textarea.remove()
    wrapper.unmount()
  })

  it('clears measured height when auto-resize is off', () => {
    const textarea = document.createElement('textarea')
    textarea.style.height = '120px'
    textarea.style.overflowY = 'hidden'

    const { result, wrapper } = mountComposable(() => useGhostTextarea())
    result.resize(textarea)

    expect(textarea.style.height).toBe('')
    expect(textarea.style.overflowY).toBe('')
    wrapper.unmount()
  })
})
