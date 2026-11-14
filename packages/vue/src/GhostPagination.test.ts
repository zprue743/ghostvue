import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it, vi } from 'vitest'

import GhostPagination from './GhostPagination.vue'
import type { GhostPaginationExposed } from './ghost-pagination'

describe('GhostPagination', () => {
  it('renders a navigation landmark with numbered pages', () => {
    const wrapper = mount(GhostPagination, {
      props: { pageCount: 5, defaultPage: 2 },
    })

    const nav = wrapper.get('nav')
    expect(nav.attributes('aria-label')).toBe('Pagination')
    expect(nav.classes()).toContain('ghost-pagination')
    expect(nav.attributes('data-ghost-pagination')).toBe('')

    const current = wrapper.get('button[aria-current="page"]')
    expect(current.text()).toBe('2')
    expect(wrapper.findAll('button')).toHaveLength(9)
  })

  it('disables previous and first on the first page', () => {
    const wrapper = mount(GhostPagination, {
      props: { pageCount: 8, defaultPage: 1 },
    })

    expect(wrapper.get('[data-part="first"]').attributes('disabled')).toBe('')
    expect(wrapper.get('[data-part="previous"]').attributes('disabled')).toBe(
      '',
    )
    expect(
      wrapper.get('[data-part="next"]').attributes('disabled'),
    ).toBeUndefined()
  })

  it('emits update:modelValue when uncontrolled', async () => {
    const onUpdate = vi.fn()
    const wrapper = mount(GhostPagination, {
      props: { pageCount: 5, defaultPage: 2 },
      attrs: { 'onUpdate:modelValue': onUpdate },
    })

    await wrapper.get('[data-part="next"]').trigger('click')
    expect(onUpdate).toHaveBeenCalledWith(3)
    expect(wrapper.get('button[aria-current="page"]').text()).toBe('3')
  })

  it('supports controlled v-model without rewriting until the parent updates', async () => {
    const page = ref(2)
    const wrapper = mount({
      setup() {
        return () =>
          h(GhostPagination, {
            pageCount: 5,
            modelValue: page.value,
            'onUpdate:modelValue': (next: number) => {
              page.value = next
            },
          })
      },
    })

    await wrapper.get('[data-part="next"]').trigger('click')
    await nextTick()
    expect(wrapper.get('button[aria-current="page"]').text()).toBe('3')
  })

  it('exposes the navigation element and focus helpers', () => {
    const component = ref<GhostPaginationExposed | null>(null)
    const host = defineComponent({
      setup: () => () =>
        h(GhostPagination, {
          ref: component,
          pageCount: 3,
        }),
    })

    const wrapper = mount(host)
    const nav = wrapper.get('nav').element
    expect(component.value?.element).toBe(nav)
    wrapper.unmount()
  })

  it('renders deterministic markup on the server', async () => {
    const html = await renderToString(
      h(GhostPagination, { pageCount: 3, defaultPage: 2 }),
    )
    expect(html).toContain('aria-current')
    expect(html).toContain('role="list"')
  })
})
