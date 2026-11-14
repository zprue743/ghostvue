import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'

import {
  GhostCollapsible,
  GhostCollapsibleContent,
  GhostCollapsibleTrigger,
  type GhostCollapsibleContentExposed,
  type GhostCollapsibleTriggerExposed,
} from '../../packages/themes/src/index'

describe('themed GhostCollapsible', () => {
  it('exposes the inner trigger element through the themed trigger wrapper', async () => {
    const triggerRef = ref<GhostCollapsibleTriggerExposed | null>(null)
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(GhostCollapsible, null, {
            default: () => [
              h(
                GhostCollapsibleTrigger,
                { ref: triggerRef, 'data-themed': '' },
                () => 'Themed disclosure control',
              ),
              h(
                GhostCollapsibleContent,
                { 'data-themed': '' },
                () => 'Themed body',
              ),
            ],
          }),
      }),
    )

    expect(triggerRef.value?.element).toBe(
      wrapper.get('[data-part="trigger"]').element,
    )
    expect(wrapper.get('.ghost-collapsible-trigger')).toBeTruthy()

    const trigger = wrapper.get('[data-part="trigger"]')
    await trigger.trigger('click')
    await flushPromises()
    expect(wrapper.get('.ghost-collapsible-content').attributes('hidden')).toBe(
      undefined,
    )

    wrapper.unmount()
    expect(triggerRef.value?.element ?? null).toBeNull()
  })

  it('forwards open state through the themed root wrapper', () => {
    const host = mount(
      defineComponent({
        setup: () => () =>
          h(
            GhostCollapsible,
            { defaultOpen: true },
            {
              default: () => [
                h(GhostCollapsibleTrigger, null, () => 'Themed open'),
                h(GhostCollapsibleContent, null, () => 'Starts open'),
              ],
            },
          ),
      }),
    )

    expect(
      host.get('[data-part="content"]').attributes('hidden'),
    ).toBeUndefined()
    host.unmount()
  })

  it('exposes content focus helpers through the themed content wrapper', () => {
    const contentRef = ref<GhostCollapsibleContentExposed | null>(null)
    const host = mount(
      defineComponent({
        setup: () => () =>
          h(
            GhostCollapsible,
            { defaultOpen: true },
            {
              default: () => [
                h(GhostCollapsibleTrigger, null, () => 'Themed'),
                h(
                  GhostCollapsibleContent,
                  { ref: contentRef, tabindex: -1 },
                  () => 'Focusable themed panel',
                ),
              ],
            },
          ),
      }),
      { attachTo: document.body },
    )

    expect(contentRef.value?.element).toBe(
      host.get('[data-part="content"]').element,
    )
    contentRef.value?.focus()
    expect(document.activeElement).toBe(contentRef.value?.element)
    contentRef.value?.blur()
    host.unmount()
    expect(contentRef.value?.element ?? null).toBeNull()
  })
})
