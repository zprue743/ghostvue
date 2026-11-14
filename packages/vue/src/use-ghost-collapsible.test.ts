import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import { useGhostCollapsible } from './use-ghost-collapsible'

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

describe('useGhostCollapsible', () => {
  it('returns stable ids and default closed state', () => {
    const { result, wrapper } = mountComposable(() => useGhostCollapsible())
    expect(result.isOpen.value).toBe(false)
    expect(result.triggerId.value).toMatch(/^ghost-collapsible-trigger-/)
    expect(result.contentId.value).toMatch(/^ghost-collapsible-content-/)
    wrapper.unmount()
  })

  it('calls onOpenChange when open state changes', () => {
    const onOpenChange = vi.fn()
    const { result, wrapper } = mountComposable(() =>
      useGhostCollapsible({ onOpenChange }),
    )

    result.open()
    expect(result.isOpen.value).toBe(true)
    expect(onOpenChange).toHaveBeenLastCalledWith(true)

    result.close()
    expect(result.isOpen.value).toBe(false)
    expect(onOpenChange).toHaveBeenLastCalledWith(false)

    result.toggle()
    expect(result.isOpen.value).toBe(true)
    wrapper.unmount()
  })

  it('respects controlled open prop', async () => {
    const open = ref(false)
    const Host = defineComponent({
      setup() {
        const api = useGhostCollapsible({ open: () => open.value })
        return { api }
      },
      template: '<div />',
    })
    const wrapper = mount(Host)
    const { api } = wrapper.vm as unknown as {
      api: ReturnType<typeof useGhostCollapsible>
    }

    api.toggle()
    expect(api.isOpen.value).toBe(false)
    open.value = true
    await wrapper.vm.$nextTick()
    expect(api.isOpen.value).toBe(true)
    wrapper.unmount()
  })
})
