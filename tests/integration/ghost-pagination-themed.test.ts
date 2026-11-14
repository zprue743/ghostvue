import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'

import {
  GhostPagination,
  type GhostPaginationExposed,
} from '../../packages/themes/src/index'

describe('themed GhostPagination', () => {
  it('forwards size and update:modelValue through the themed wrapper', async () => {
    const onUpdate = vi.fn()
    const wrapper = mount(GhostPagination, {
      props: {
        pageCount: 4,
        size: 'sm',
        'onUpdate:modelValue': onUpdate,
      },
    })

    await wrapper.get('[data-part="next"]').trigger('click')
    expect(onUpdate).toHaveBeenCalled()
    expect(wrapper.get('[data-ghost-pagination]').attributes('data-size')).toBe(
      'sm',
    )
    wrapper.unmount()

    const labeled = mount(GhostPagination, {
      props: {
        pageCount: 2,
        size: 'lg',
        getPageLabel: (page: number) => `Sheet ${String(page)}`,
      },
    })
    expect(labeled.get('[data-ghost-pagination]').attributes('data-size')).toBe(
      'lg',
    )
    expect(
      labeled.get('button[aria-current="page"]').attributes('aria-label'),
    ).toContain('Sheet')
    labeled.unmount()

    const controlled = mount(GhostPagination, {
      props: {
        pageCount: 5,
        modelValue: 3,
        'onUpdate:modelValue': vi.fn(),
      },
    })
    expect(
      controlled.get('[data-ghost-pagination]').attributes('data-size'),
    ).toBeUndefined()
    const exposed = controlled.vm as unknown as {
      focus: () => void
      blur: () => void
    }
    exposed.focus()
    exposed.blur()
    controlled.unmount()

    const minimal = mount(GhostPagination, {
      props: {
        pageCount: 2,
        showEdges: false,
        disabled: true,
      },
    })
    expect(minimal.find('[data-part="first"]').exists()).toBe(false)
    expect(
      minimal.get('[data-ghost-pagination]').attributes('data-state'),
    ).toBe('disabled')
  })

  it('exposes the mounted navigation root through the public themed export', () => {
    const component = ref<GhostPaginationExposed | null>(null)
    const host = defineComponent({
      setup: () => () =>
        h(GhostPagination, {
          ref: component,
          pageCount: 5,
        }),
    })
    const wrapper = mount(host)
    const exposed = component.value
    expect(exposed?.element).toBe(
      wrapper.get('[data-ghost-pagination]').element,
    )
    expect(exposed?.element).not.toBe(wrapper.element)
    wrapper.unmount()
    expect(exposed?.element).toBeNull()
  })
})
