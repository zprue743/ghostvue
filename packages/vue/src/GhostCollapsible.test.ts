import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'

import GhostCollapsible from './GhostCollapsible.vue'
import GhostCollapsibleContent from './GhostCollapsibleContent.vue'
import GhostCollapsibleTrigger from './GhostCollapsibleTrigger.vue'
import type {
  GhostCollapsibleContentExposed,
  GhostCollapsibleTriggerExposed,
} from './ghost-collapsible'

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

describe('GhostCollapsible', () => {
  it('supports uncontrolled open/defaultOpen and controlled open', async () => {
    const uncontrolledUpdates: boolean[] = []
    const uncontrolled = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostCollapsible,
              {
                defaultOpen: false,
                'onUpdate:open': (value: boolean) =>
                  uncontrolledUpdates.push(value),
              },
              {
                default: () => [
                  h(GhostCollapsibleTrigger, null, () => 'Toggle shipment'),
                  h(GhostCollapsibleContent, null, () => 'Shipment details'),
                ],
              },
            )
        },
      }),
    )

    const trigger = uncontrolled.get('[data-part="trigger"]')
    const content = uncontrolled.get('[data-part="content"]')

    expect(trigger.attributes('data-state')).toBe('closed')
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(content.attributes('hidden')).toBe('')

    await trigger.trigger('click')
    await flushPromises()

    expect(uncontrolledUpdates).toEqual([true])
    expect(trigger.attributes('data-state')).toBe('open')
    expect(trigger.attributes('aria-expanded')).toBe('true')
    expect(content.attributes('hidden')).toBeUndefined()

    await trigger.trigger('click')
    await flushPromises()
    expect(uncontrolledUpdates).toEqual([true, false])
    expect(content.attributes('hidden')).toBe('')

    const open = ref(false)
    const controlledUpdates: boolean[] = []
    const controlled = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostCollapsible,
              {
                open: open.value,
                'onUpdate:open': (value: boolean) => {
                  controlledUpdates.push(value)
                  open.value = value
                },
              },
              {
                default: () => [
                  h(GhostCollapsibleTrigger, null, () => 'Controlled'),
                  h(GhostCollapsibleContent, null, () => 'Controlled body'),
                ],
              },
            )
        },
      }),
    )

    const controlledTrigger = controlled.get('[data-part="trigger"]')
    await controlledTrigger.trigger('click')
    await flushPromises()
    expect(controlledUpdates).toEqual([true])
    expect(controlledTrigger.attributes('aria-expanded')).toBe('true')
  })

  it('wires aria-controls and aria-labelledby between trigger and content', () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostCollapsible, null, {
              default: () => [
                h(GhostCollapsibleTrigger, null, () => 'Row metadata'),
                h(GhostCollapsibleContent, null, () => 'Expanded row body'),
              ],
            })
        },
      }),
    )

    const trigger = wrapper.get('[data-part="trigger"]')
    const content = wrapper.get('[data-part="content"]')
    const controls = trigger.attributes('aria-controls')
    expect(controls).toBeTruthy()
    expect(content.attributes('id')).toBe(controls)
    expect(content.attributes('aria-labelledby')).toBe(trigger.attributes('id'))

    wrapper.unmount()
  })

  it('disables toggling from root disabled and trigger disabled', async () => {
    const rootDisabled = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostCollapsible,
              { disabled: true },
              {
                default: () => [
                  h(GhostCollapsibleTrigger, null, () => 'Root disabled'),
                  h(GhostCollapsibleContent, null, () => 'Hidden'),
                ],
              },
            )
        },
      }),
    )

    const rootTrigger = rootDisabled.get('[data-part="trigger"]')
    expect(rootTrigger.attributes('disabled')).toBe('')
    await rootTrigger.trigger('click')
    await flushPromises()
    expect(rootTrigger.attributes('aria-expanded')).toBe('false')

    const triggerDisabled = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(GhostCollapsible, null, {
              default: () => [
                h(
                  GhostCollapsibleTrigger,
                  { disabled: true },
                  () => 'Trigger disabled',
                ),
                h(GhostCollapsibleContent, null, () => 'Hidden'),
              ],
            })
        },
      }),
    )

    const localTrigger = triggerDisabled.get('[data-part="trigger"]')
    await localTrigger.trigger('click')
    await flushPromises()
    expect(localTrigger.attributes('aria-expanded')).toBe('false')
  })

  it('exposes element focus and blur from trigger and content', async () => {
    const triggerRef = ref<GhostCollapsibleTriggerExposed | null>(null)
    const contentRef = ref<GhostCollapsibleContentExposed | null>(null)

    const Host = defineComponent({
      setup() {
        return () =>
          h(GhostCollapsible, null, {
            default: () => [
              h(
                GhostCollapsibleTrigger,
                { ref: triggerRef },
                () => 'Focus target',
              ),
              h(
                GhostCollapsibleContent,
                { ref: contentRef, tabindex: -1 },
                () => 'Panel',
              ),
            ],
          })
      },
    })

    const wrapper = mountAttached(Host)
    await flushPromises()

    expect(triggerRef.value?.element).toBe(
      wrapper.get('[data-part="trigger"]').element,
    )
    triggerRef.value?.focus()
    expect(document.activeElement).toBe(triggerRef.value?.element)

    const trigger = wrapper.get('[data-part="trigger"]')
    await trigger.trigger('click')
    await flushPromises()

    expect(contentRef.value?.element).toBe(
      wrapper.get('[data-part="content"]').element,
    )
    contentRef.value?.focus()
    expect(document.activeElement).toBe(contentRef.value?.element)
  })

  it('toggles from a non-button host on Space and Enter', async () => {
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(GhostCollapsible, null, {
              default: () => [
                h(
                  GhostCollapsibleTrigger,
                  { as: 'span' },
                  () => 'Keyboard disclosure host',
                ),
                h(GhostCollapsibleContent, null, () => 'Keyboard body'),
              ],
            })
        },
      }),
    )

    const trigger = wrapper.get('[data-part="trigger"]')
    expect(trigger.attributes('role')).toBe('button')
    await trigger.trigger('keydown', { key: ' ' })
    await flushPromises()
    expect(trigger.attributes('aria-expanded')).toBe('true')

    await trigger.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(trigger.attributes('aria-expanded')).toBe('false')
  })

  it('allows consumer aria-label on content without aria-labelledby', () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostCollapsible, null, {
              default: () => [
                h(GhostCollapsibleTrigger, null, () => 'Trigger'),
                h(
                  GhostCollapsibleContent,
                  { 'aria-label': 'Shipment timeline' },
                  () => 'Panel',
                ),
              ],
            })
        },
      }),
    )

    const content = wrapper.get('[data-part="content"]')
    expect(content.attributes('aria-label')).toBe('Shipment timeline')
    expect(content.attributes('aria-labelledby')).toBeUndefined()
    wrapper.unmount()
  })

  it('throws when trigger is rendered outside root', () => {
    expect(() =>
      mount(GhostCollapsibleTrigger, { slots: { default: 'Orphan' } }),
    ).toThrow(/GhostCollapsibleTrigger must be used inside GhostCollapsible/)
  })

  it('sets data-animation off when disableAnimation is true', () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostCollapsible,
              { defaultOpen: true },
              {
                default: () => [
                  h(GhostCollapsibleTrigger, null, () => 'Open'),
                  h(
                    GhostCollapsibleContent,
                    { disableAnimation: true },
                    () => 'Still panel',
                  ),
                ],
              },
            )
        },
      }),
    )

    expect(
      wrapper.get('[data-part="content"]').attributes('data-animation'),
    ).toBe('off')
    wrapper.unmount()
  })
})
