import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'

import {
  GhostAccordion as GhostHeadlessAccordion,
  GhostAccordionContent as GhostHeadlessAccordionContent,
  GhostAccordionItem as GhostHeadlessAccordionItem,
  GhostAccordionTrigger as GhostHeadlessAccordionTrigger,
} from '../../packages/vue/src/index'

import {
  GhostAccordion,
  GhostAccordionContent,
  GhostAccordionItem,
  GhostAccordionTrigger,
  type GhostAccordionTriggerExposed,
} from '../../packages/themes/src/index'

describe('themed GhostAccordion', () => {
  it('exposes the inner trigger through the themed trigger wrapper', () => {
    const triggerRef = ref<GhostAccordionTriggerExposed | null>(null)
    const host = defineComponent({
      setup: () => () =>
        h(
          GhostAccordion,
          { type: 'single' },
          {
            default: () =>
              h(GhostAccordionItem, { value: 'lane' }, () => [
                h(
                  GhostAccordionTrigger,
                  { ref: triggerRef, 'data-themed': '' },
                  () => 'Lane schedule',
                ),
                h(GhostAccordionContent, null, () => 'Cutoff times'),
              ]),
          },
        ),
    })
    const wrapper = mount(host)
    const exposed = triggerRef.value
    expect(exposed?.element).toBe(wrapper.get('[data-part="trigger"]').element)
    wrapper.unmount()
    expect(exposed?.element).toBeNull()
  })

  it('marks the themed root and items with data-themed and merges consumer class/style', () => {
    const wrapper = mount(GhostAccordion, {
      props: { type: 'single' },
      attrs: { class: 'consumer-root', style: 'max-width: 20rem' },
      slots: {
        default: () =>
          h(
            GhostAccordionItem,
            { value: 'lane', class: 'consumer-item' },
            () => [
              h(GhostAccordionTrigger, null, () => 'Lane schedule'),
              h(GhostAccordionContent, null, () => 'Cutoff times'),
            ],
          ),
      },
    })

    const root = wrapper.get('.ghost-accordion')
    expect(root.attributes('data-themed')).toBe('')
    expect(root.classes()).toContain('consumer-root')
    expect(root.attributes('style')).toContain('max-width: 20rem')

    const item = wrapper.get('.ghost-accordion-item')
    expect(item.attributes('data-themed')).toBe('')
    expect(item.classes()).toContain('consumer-item')
  })

  it('leaves the headless accordion without the visual opt-in marker', () => {
    const wrapper = mount(GhostHeadlessAccordion, {
      props: { type: 'single' },
      slots: {
        default: () =>
          h(GhostHeadlessAccordionItem, { value: 'lane' }, () => [
            h(GhostHeadlessAccordionTrigger, null, () => 'Lane schedule'),
            h(GhostHeadlessAccordionContent, null, () => 'Cutoff times'),
          ]),
      },
    })

    // Behavior hooks stay; nothing opts the instance into theme styling.
    expect(wrapper.get('.ghost-accordion').attributes()).toHaveProperty(
      'data-ghost-accordion',
    )
    expect(wrapper.find('[data-themed]').exists()).toBe(false)
  })
})

describe('ghost-accordion.css', () => {
  const css = readFileSync(
    resolve(process.cwd(), 'packages/themes/src/ghost-accordion.css'),
    'utf8',
  ).replace(/\/\*[\s\S]*?\*\//g, '')

  it('opts in only through theme scopes or data-themed, never behavior hooks', () => {
    expect(css).not.toMatch(/data-ghost-accordion/)

    const selectorLists = [...css.matchAll(/:where\(([^{]*)\)\s*\{/g)].map(
      (match) => match[1] ?? '',
    )
    expect(selectorLists.length).toBeGreaterThan(0)
    for (const list of selectorLists) {
      for (const selector of list.split(',').map((part) => part.trim())) {
        expect(selector).toMatch(
          /^(\.ghost-theme |\.ghost-themed-scope |\.ghost-accordion(-item)?\[data-themed\])/,
        )
      }
    }
  })
})
