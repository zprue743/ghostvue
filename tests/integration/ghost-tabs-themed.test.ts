import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'

import {
  GhostTabs,
  GhostTabsContent,
  GhostTabsList,
  GhostTabsTrigger,
  type GhostTabsContentExposed,
  type GhostTabsListExposed,
  type GhostTabsTriggerExposed,
} from '../../packages/themes/src/index'

describe('themed GhostTabs', () => {
  it('forwards v-model and orientation through the themed root', async () => {
    const selected = ref('billing')
    const host = defineComponent({
      setup: () => () =>
        h(
          GhostTabs,
          {
            modelValue: selected.value,
            orientation: 'vertical',
            'onUpdate:modelValue': (value: string) => {
              selected.value = value
            },
          },
          {
            default: () => [
              h(GhostTabsList, null, () => [
                h(GhostTabsTrigger, { value: 'billing' }, () => 'Billing'),
                h(GhostTabsTrigger, { value: 'usage' }, () => 'Usage'),
              ]),
              h(GhostTabsContent, { value: 'billing' }, () => 'Billing panel'),
              h(GhostTabsContent, { value: 'usage' }, () => 'Usage panel'),
            ],
          },
        ),
    })
    const wrapper = mount(host)
    const list = wrapper.get('.ghost-tabs-list')
    expect(list.attributes('aria-orientation')).toBe('vertical')
    const triggers = wrapper.findAll('.ghost-tabs-trigger')
    await triggers[1]?.trigger('click')
    expect(selected.value).toBe('usage')
    wrapper.unmount()
  })

  it('exposes trigger and content elements through themed wrappers', () => {
    const listRef = ref<GhostTabsListExposed | null>(null)
    const triggerRef = ref<GhostTabsTriggerExposed | null>(null)
    const contentRef = ref<GhostTabsContentExposed | null>(null)
    const host = defineComponent({
      setup: () => () =>
        h(
          GhostTabs,
          { defaultValue: 'one' },
          {
            default: () => [
              h(GhostTabsList, { ref: listRef }, () =>
                h(
                  GhostTabsTrigger,
                  { ref: triggerRef, value: 'one' },
                  () => 'One',
                ),
              ),
              h(
                GhostTabsContent,
                { ref: contentRef, value: 'one' },
                () => 'Panel',
              ),
            ],
          },
        ),
    })
    const wrapper = mount(host)
    expect(triggerRef.value?.element).toBe(
      wrapper.get('.ghost-tabs-trigger').element,
    )
    expect(contentRef.value?.element).toBe(
      wrapper.get('.ghost-tabs-content').element,
    )
    triggerRef.value?.focus()
    triggerRef.value?.blur()
    contentRef.value?.focus()
    contentRef.value?.blur()
    listRef.value?.focus()
    wrapper.unmount()
  })

  it('exposes the tab list element through the public themed export', () => {
    const listRef = ref<GhostTabsListExposed | null>(null)
    const host = defineComponent({
      setup: () => () =>
        h(GhostTabs, null, {
          default: () => [
            h(GhostTabsList, { ref: listRef }, () =>
              h(GhostTabsTrigger, { value: 'one' }, () => 'One'),
            ),
            h(GhostTabsContent, { value: 'one' }, () => 'Panel'),
          ],
        }),
    })
    const wrapper = mount(host)
    const list = wrapper.get('.ghost-tabs-list')
    expect(listRef.value?.element).toBe(list.element)
    wrapper.unmount()
  })

  it('keeps the themed part hooks when consumers pass a class', () => {
    const host = defineComponent({
      setup: () => () =>
        h(
          GhostTabs,
          { defaultValue: 'one' },
          {
            default: () => [
              h(GhostTabsList, { class: 'strip' }, () =>
                h(
                  GhostTabsTrigger,
                  { value: 'one', class: 'tab' },
                  () => 'One',
                ),
              ),
              h(
                GhostTabsContent,
                { value: 'one', class: 'panel' },
                () => 'Panel',
              ),
            ],
          },
        ),
    })
    const wrapper = mount(host)
    // The theme selects `.ghost-tabs-list[data-themed]` and friends, so a
    // consumer class must sit beside the part class rather than replace it.
    const list = wrapper.get('[role="tablist"]')
    expect(list.classes()).toEqual(['ghost-tabs-list', 'strip'])
    expect(list.attributes('data-themed')).toBe('')
    const trigger = wrapper.get('[role="tab"]')
    expect(trigger.classes()).toEqual(['ghost-tabs-trigger', 'tab'])
    expect(trigger.attributes('data-themed')).toBe('')
    const panel = wrapper.get('[role="tabpanel"]')
    expect(panel.classes()).toEqual(['ghost-tabs-content', 'panel'])
    expect(panel.attributes('data-themed')).toBe('')
    wrapper.unmount()
  })
})
