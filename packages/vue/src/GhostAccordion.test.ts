import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'

import type { GhostAccordionExposed } from './ghost-accordion'
import GhostAccordion from './GhostAccordion.vue'
import GhostAccordionContent from './GhostAccordionContent.vue'
import GhostAccordionItem from './GhostAccordionItem.vue'
import GhostAccordionTrigger from './GhostAccordionTrigger.vue'

const attached: ReturnType<typeof mount>[] = []

function mountAttached(component: Parameters<typeof mount>[0]) {
  const wrapper = mount(component, { attachTo: document.body })
  attached.push(wrapper)
  return wrapper
}

afterEach(() => {
  for (const wrapper of attached) {
    wrapper.unmount()
  }
  attached.length = 0
})

function basicAccordion(
  rootProps: Record<string, unknown> = {},
  onUpdate?: (value: string | string[] | undefined) => void,
) {
  return defineComponent({
    setup() {
      return () =>
        h(
          GhostAccordion,
          {
            type: 'single',
            collapsible: true,
            ...rootProps,
            ...(onUpdate ? { 'onUpdate:modelValue': onUpdate } : {}),
          },
          {
            default: () => [
              h(GhostAccordionItem, { value: 'one' }, () => [
                h(GhostAccordionTrigger, null, () => 'Panel one'),
                h(GhostAccordionContent, null, () => 'Body one'),
              ]),
              h(GhostAccordionItem, { value: 'two' }, () => [
                h(GhostAccordionTrigger, null, () => 'Panel two'),
                h(GhostAccordionContent, null, () => 'Body two'),
              ]),
            ],
          },
        )
    },
  })
}

describe('GhostAccordion', () => {
  it('expands one item at a time in single collapsible mode', async () => {
    const wrapper = mountAttached(basicAccordion())
    const triggers = wrapper.findAll('[data-part="trigger"]')
    const first = triggers.at(0)
    const second = triggers.at(1)
    expect(first).toBeDefined()
    expect(second).toBeDefined()
    if (!first || !second) {
      return
    }

    await first.trigger('click')
    await flushPromises()
    expect(first.attributes('aria-expanded')).toBe('true')
    expect(second.attributes('aria-expanded')).toBe('false')

    await second.trigger('click')
    await flushPromises()
    expect(first.attributes('aria-expanded')).toBe('false')
    expect(second.attributes('aria-expanded')).toBe('true')
  })

  it('wraps triggers in heading elements', () => {
    const wrapper = mountAttached(basicAccordion({ headingLevel: 4 }))
    expect(wrapper.find('h4.ghost-accordion-header').exists()).toBe(true)
  })

  it('supports multiple expansion mode', async () => {
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostAccordion,
              { type: 'multiple', defaultValue: ['one'] },
              {
                default: () => [
                  h(GhostAccordionItem, { value: 'one' }, () => [
                    h(GhostAccordionTrigger, null, () => 'Panel one'),
                    h(GhostAccordionContent, null, () => 'Body one'),
                  ]),
                  h(GhostAccordionItem, { value: 'two' }, () => [
                    h(GhostAccordionTrigger, null, () => 'Panel two'),
                    h(GhostAccordionContent, null, () => 'Body two'),
                  ]),
                ],
              },
            )
        },
      }),
    )
    const triggers = wrapper.findAll('[data-part="trigger"]')
    await triggers.at(1)?.trigger('click')
    await flushPromises()
    expect(triggers.at(0)?.attributes('aria-expanded')).toBe('true')
    expect(triggers.at(1)?.attributes('aria-expanded')).toBe('true')
  })

  it('supports controlled modelValue', async () => {
    const value = ref<string | undefined>('one')
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostAccordion,
              {
                type: 'single',
                collapsible: true,
                modelValue: value.value,
                'onUpdate:modelValue': (
                  next: string | string[] | undefined,
                ) => {
                  value.value = typeof next === 'string' ? next : undefined
                },
              },
              {
                default: () => [
                  h(GhostAccordionItem, { value: 'one' }, () => [
                    h(GhostAccordionTrigger, null, () => 'Panel one'),
                    h(GhostAccordionContent, null, () => 'Body one'),
                  ]),
                  h(GhostAccordionItem, { value: 'two' }, () => [
                    h(GhostAccordionTrigger, null, () => 'Panel two'),
                    h(GhostAccordionContent, null, () => 'Body two'),
                  ]),
                ],
              },
            )
        },
      }),
    )
    const triggers = wrapper.findAll('[data-part="trigger"]')
    const first = triggers.at(0)
    const second = triggers.at(1)
    expect(first?.attributes('aria-expanded')).toBe('true')
    await second?.trigger('click')
    await flushPromises()
    expect(value.value).toBe('two')
  })

  it('exposes focus helpers on the accordion root', () => {
    const accordionRef = ref<GhostAccordionExposed | null>(null)
    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostAccordion,
              { ref: accordionRef },
              {
                default: () =>
                  h(GhostAccordionItem, { value: 'one' }, () => [
                    h(GhostAccordionTrigger, null, () => 'Panel one'),
                    h(GhostAccordionContent, null, () => 'Body one'),
                  ]),
              },
            )
        },
      }),
    )
    expect(accordionRef.value?.element).toBeTruthy()
    accordionRef.value?.focus()
    accordionRef.value?.blur()
  })

  it('marks the open header aria-disabled in single non-collapsible mode', async () => {
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostAccordion,
              { type: 'single', defaultValue: 'one' },
              {
                default: () => [
                  h(GhostAccordionItem, { value: 'one' }, () => [
                    h(GhostAccordionTrigger, null, () => 'Panel one'),
                    h(GhostAccordionContent, null, () => 'Body one'),
                  ]),
                  h(GhostAccordionItem, { value: 'two' }, () => [
                    h(GhostAccordionTrigger, null, () => 'Panel two'),
                    h(GhostAccordionContent, null, () => 'Body two'),
                  ]),
                ],
              },
            )
        },
      }),
    )
    const triggers = wrapper.findAll('[data-part="trigger"]')
    expect(triggers.at(0)?.attributes('aria-disabled')).toBe('true')
    expect(triggers.at(1)?.attributes('aria-disabled')).toBeUndefined()
  })

  it('keeps a non-collapsible single section open when toggled closed', async () => {
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostAccordion,
              { type: 'single', defaultValue: 'one' },
              {
                default: () => [
                  h(GhostAccordionItem, { value: 'one' }, () => [
                    h(GhostAccordionTrigger, null, () => 'Panel one'),
                    h(GhostAccordionContent, null, () => 'Body one'),
                  ]),
                ],
              },
            )
        },
      }),
    )
    const trigger = wrapper.get('[data-part="trigger"]')
    await trigger.trigger('click')
    await flushPromises()
    expect(trigger.attributes('aria-expanded')).toBe('true')
  })
})
