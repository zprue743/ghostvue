import { flushPromises, mount } from '@vue/test-utils'
import { createSSRApp, defineComponent, h, nextTick, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { resolveTabsHtmlElement } from './ghost-tabs'
import GhostTabs from './GhostTabs.vue'
import GhostTabsContent from './GhostTabsContent.vue'
import GhostTabsList from './GhostTabsList.vue'
import GhostTabsTrigger from './GhostTabsTrigger.vue'

const attached: ReturnType<typeof mount>[] = []

afterEach(() => {
  for (const wrapper of attached) {
    wrapper.unmount()
  }
  attached.length = 0
})

function mountTabs(
  options: {
    modelValue?: string
    defaultValue?: string
    activationMode?: 'automatic' | 'manual'
    orientation?: 'horizontal' | 'vertical'
    dir?: 'ltr' | 'rtl'
    onUpdate?: (value: string) => void
    middleDisabled?: boolean
  } = {},
) {
  const updates: string[] = []
  const wrapper = mount(
    defineComponent({
      setup() {
        const model = ref(options.modelValue)
        return () =>
          h(
            GhostTabs,
            {
              modelValue:
                options.modelValue !== undefined ? model.value : undefined,
              ...(options.defaultValue !== undefined
                ? { defaultValue: options.defaultValue }
                : {}),
              ...(options.activationMode
                ? { activationMode: options.activationMode }
                : {}),
              ...(options.orientation
                ? { orientation: options.orientation }
                : {}),
              ...(options.dir ? { dir: options.dir } : {}),
              'onUpdate:modelValue': (value: string) => {
                updates.push(value)
                model.value = value
                options.onUpdate?.(value)
              },
            },
            {
              default: () => [
                h(GhostTabsList, null, () => [
                  h(GhostTabsTrigger, { value: 'one' }, () => 'One'),
                  h(
                    GhostTabsTrigger,
                    { value: 'two', disabled: options.middleDisabled ?? false },
                    () => 'Two',
                  ),
                  h(GhostTabsTrigger, { value: 'three' }, () => 'Three'),
                ]),
                h(GhostTabsContent, { value: 'one' }, () => 'Panel one'),
                h(GhostTabsContent, { value: 'two' }, () => 'Panel two'),
                h(GhostTabsContent, { value: 'three' }, () => 'Panel three'),
              ],
            },
          )
      },
    }),
    { attachTo: document.body },
  )
  attached.push(wrapper)
  return { wrapper, updates }
}

function tabButtons(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('[role="tab"]')
}

function key(target: EventTarget, keyName: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key: keyName,
    bubbles: true,
    cancelable: true,
  })
  target.dispatchEvent(event)
  return event
}

describe('GhostTabs', () => {
  it('selects the first tab when uncontrolled without defaultValue', async () => {
    const { wrapper } = mountTabs()
    await nextTick()

    const tabs = tabButtons(wrapper)
    expect(tabs[0]?.attributes('aria-selected')).toBe('true')
    expect(tabs[1]?.attributes('aria-selected')).toBe('false')
    expect(wrapper.find('[role="tabpanel"][data-state="active"]').text()).toBe(
      'Panel one',
    )
  })

  it('wires aria-controls and aria-labelledby across triggers and panels', async () => {
    const { wrapper } = mountTabs({ defaultValue: 'two' })
    await nextTick()

    const tabs = tabButtons(wrapper)
    const panels = wrapper.findAll('[role="tabpanel"]')
    expect(tabs).toHaveLength(3)
    expect(panels).toHaveLength(3)

    for (let index = 0; index < 3; index += 1) {
      const tab = tabs[index]
      const panel = panels[index]
      expect(tab?.attributes('aria-controls')).toBe(panel?.attributes('id'))
      expect(panel?.attributes('aria-labelledby')).toBe(tab?.attributes('id'))
    }
  })

  it('moves roving focus horizontally with arrow keys', async () => {
    const { wrapper } = mountTabs({
      defaultValue: 'one',
      orientation: 'horizontal',
    })
    await nextTick()

    const list = wrapper.get('[role="tablist"]')
    const tabs = tabButtons(wrapper)
    const first = tabs[0]?.element as HTMLElement
    const second = tabs[1]?.element as HTMLElement

    first.focus()
    key(list.element, 'ArrowRight')
    expect(document.activeElement).toBe(second)

    key(list.element, 'ArrowLeft')
    expect(document.activeElement).toBe(first)

    key(list.element, 'End')
    expect(document.activeElement).toBe(tabs[2]?.element)

    key(list.element, 'Home')
    expect(document.activeElement).toBe(first)
  })

  it('moves roving focus vertically with arrow keys', async () => {
    const { wrapper } = mountTabs({
      defaultValue: 'one',
      orientation: 'vertical',
    })
    await nextTick()

    const list = wrapper.get('[role="tablist"]')
    expect(list.attributes('aria-orientation')).toBe('vertical')

    const tabs = tabButtons(wrapper)
    const first = tabs[0]?.element as HTMLElement
    const second = tabs[1]?.element as HTMLElement

    first.focus()
    key(list.element, 'ArrowDown')
    expect(document.activeElement).toBe(second)

    key(list.element, 'ArrowUp')
    expect(document.activeElement).toBe(first)
  })

  it('skips disabled tabs while roving', async () => {
    const { wrapper } = mountTabs({
      defaultValue: 'one',
      middleDisabled: true,
    })
    await nextTick()

    const list = wrapper.get('[role="tablist"]')
    const tabs = tabButtons(wrapper)
    ;(tabs[0]?.element as HTMLElement).focus()
    key(list.element, 'ArrowRight')
    expect(document.activeElement).toBe(tabs[2]?.element)
  })

  it('activates on focus in automatic mode and on click in manual mode', async () => {
    const automatic = mountTabs({ activationMode: 'automatic' })
    await nextTick()
    const automaticTabs = tabButtons(automatic.wrapper)
    ;(automaticTabs[2]?.element as HTMLElement).focus()
    await nextTick()
    expect(automaticTabs[2]?.attributes('aria-selected')).toBe('true')
    expect(automaticTabs[0]?.attributes('aria-selected')).toBe('false')

    const manual = mountTabs({
      activationMode: 'manual',
      defaultValue: 'one',
    })
    await nextTick()
    const manualTabs = tabButtons(manual.wrapper)
    ;(manualTabs[1]?.element as HTMLElement).focus()
    await nextTick()
    expect(manualTabs[1]?.attributes('aria-selected')).toBe('false')

    await manualTabs[1]?.trigger('click')
    await nextTick()
    expect(manualTabs[1]?.attributes('aria-selected')).toBe('true')
  })

  it('selects manual tabs on Space and Enter for non-button hosts', async () => {
    mountTabs({
      activationMode: 'manual',
      defaultValue: 'one',
    })
    await nextTick()

    const Host = defineComponent({
      setup() {
        return () =>
          h(
            GhostTabs,
            { activationMode: 'manual', defaultValue: 'one' },
            {
              default: () => [
                h(GhostTabsList, null, () => [
                  h(GhostTabsTrigger, { value: 'a', as: 'div' }, () => 'A'),
                  h(GhostTabsTrigger, { value: 'b', as: 'div' }, () => 'B'),
                ]),
                h(GhostTabsContent, { value: 'a' }, () => 'A panel'),
                h(GhostTabsContent, { value: 'b' }, () => 'B panel'),
              ],
            },
          )
      },
    })

    const custom = mount(Host, { attachTo: document.body })
    attached.push(custom)
    await nextTick()

    const triggers = custom.findAll('[role="tab"]')
    const second = triggers[1]?.element as HTMLElement
    second.focus()
    const enter = key(second, 'Enter')
    await nextTick()
    expect(enter.defaultPrevented).toBe(true)
    expect(triggers[1]?.attributes('aria-selected')).toBe('true')

    const first = triggers[0]?.element as HTMLElement
    first.focus()
    const space = key(first, ' ')
    await nextTick()
    expect(space.defaultPrevented).toBe(true)
    expect(triggers[0]?.attributes('aria-selected')).toBe('true')
  })

  it('emits update:modelValue when selection changes in uncontrolled mode', async () => {
    const { wrapper, updates } = mountTabs({ defaultValue: 'one' })
    await nextTick()
    await tabButtons(wrapper)[2]?.trigger('click')
    await nextTick()
    expect(updates).toEqual(['three'])
  })

  it('starts at defaultValue when provided', async () => {
    const { wrapper } = mountTabs({ defaultValue: 'two' })
    await nextTick()
    expect(tabButtons(wrapper)[1]?.attributes('aria-selected')).toBe('true')
  })

  it('assigns tabindex 0 only to the selected enabled tab', async () => {
    const { wrapper } = mountTabs({ defaultValue: 'two' })
    await nextTick()
    const tabs = tabButtons(wrapper)
    expect(tabs[0]?.attributes('tabindex')).toBe('-1')
    expect(tabs[1]?.attributes('tabindex')).toBe('0')
    expect(tabs[2]?.attributes('tabindex')).toBe('-1')
  })

  it('keeps the selected tab stop when tabs become visible after a hidden mount', async () => {
    const hidden = ref(true)
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(
              'div',
              { style: { display: hidden.value ? 'none' : undefined } },
              h(
                GhostTabs,
                { defaultValue: 'two' },
                {
                  default: () => [
                    h(GhostTabsList, null, () => [
                      h(GhostTabsTrigger, { value: 'one' }, () => 'One'),
                      h(GhostTabsTrigger, { value: 'two' }, () => 'Two'),
                    ]),
                    h(GhostTabsContent, { value: 'one' }, () => 'Panel one'),
                    h(GhostTabsContent, { value: 'two' }, () => 'Panel two'),
                  ],
                },
              ),
            )
        },
      }),
      { attachTo: document.body },
    )
    attached.push(wrapper)
    await nextTick()

    let tabs = tabButtons(wrapper)
    expect(tabs[1]?.attributes('tabindex')).toBe('0')

    hidden.value = false
    await nextTick()

    tabs = tabButtons(wrapper)
    expect(tabs[1]?.attributes('tabindex')).toBe('0')
    expect(tabs[1]?.attributes('aria-selected')).toBe('true')
  })

  it('assigns the tab stop to a visible tab when the selected trigger is in a hidden subtree', async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostTabs,
              { defaultValue: 'one' },
              {
                default: () => [
                  h(GhostTabsList, null, () => [
                    h(
                      'div',
                      { style: { display: 'none' } },
                      h(GhostTabsTrigger, { value: 'one' }, () => 'One'),
                    ),
                    h(GhostTabsTrigger, { value: 'two' }, () => 'Two'),
                  ]),
                  h(GhostTabsContent, { value: 'one' }, () => 'Panel one'),
                  h(GhostTabsContent, { value: 'two' }, () => 'Panel two'),
                ],
              },
            )
        },
      }),
      { attachTo: document.body },
    )
    attached.push(wrapper)
    await nextTick()

    const tabs = tabButtons(wrapper)
    expect(tabs[0]?.attributes('tabindex')).toBe('-1')
    expect(tabs[1]?.attributes('tabindex')).toBe('0')
  })

  it('keeps selection when focusing the selected tab in automatic mode', async () => {
    const { wrapper, updates } = mountTabs({ defaultValue: 'two' })
    await nextTick()
    const selected = tabButtons(wrapper)[1]?.element as HTMLElement
    expect(selected.tabIndex).toBe(0)
    selected.focus()
    await nextTick()
    expect(updates).toEqual([])
    expect(tabButtons(wrapper)[1]?.attributes('aria-selected')).toBe('true')
  })

  it('moves the tab stop when the controlled value changes', async () => {
    const model = ref('one')
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(
            GhostTabs,
            {
              modelValue: model.value,
              'onUpdate:modelValue': (value: string) => {
                model.value = value
              },
            },
            {
              default: () => [
                h(GhostTabsList, null, () => [
                  h(GhostTabsTrigger, { value: 'one' }, () => 'One'),
                  h(GhostTabsTrigger, { value: 'two' }, () => 'Two'),
                  h(GhostTabsTrigger, { value: 'three' }, () => 'Three'),
                ]),
                h(GhostTabsContent, { value: 'one' }, () => 'P1'),
                h(GhostTabsContent, { value: 'two' }, () => 'P2'),
                h(GhostTabsContent, { value: 'three' }, () => 'P3'),
              ],
            },
          ),
      }),
      { attachTo: document.body },
    )
    attached.push(wrapper)
    await nextTick()
    model.value = 'three'
    await nextTick()
    const tabs = tabButtons(wrapper)
    expect(tabs[0]?.attributes('tabindex')).toBe('-1')
    expect(tabs[2]?.attributes('tabindex')).toBe('0')
  })

  it('restores the selected tab stop after roving and leaving the list', async () => {
    const { wrapper } = mountTabs({
      defaultValue: 'two',
      activationMode: 'manual',
    })
    await nextTick()
    const list = wrapper.get('[role="tablist"]')
    const tabs = tabButtons(wrapper)
    ;(tabs[1]?.element as HTMLElement).focus()
    key(list.element, 'ArrowRight')
    await nextTick()
    expect((tabs[2]?.element as HTMLElement).tabIndex).toBe(0)

    const outside = document.createElement('input')
    document.body.appendChild(outside)
    outside.focus()
    await flushPromises()
    await nextTick()

    expect(tabs[1]?.attributes('tabindex')).toBe('0')
    expect(tabs[2]?.attributes('tabindex')).toBe('-1')
    outside.remove()
  })

  it('hides inactive panels and exposes list metadata', async () => {
    const { wrapper } = mountTabs({ defaultValue: 'two' })
    await nextTick()

    const list = wrapper.get('[data-part="list"]')
    expect(list.classes()).toContain('ghost-tabs-list')
    expect(list.attributes('data-ghost-tabs')).toBe('')

    const panels = wrapper.findAll('[role="tabpanel"]')
    expect(
      panels.filter((node) => node.attributes('hidden') === undefined),
    ).toHaveLength(1)
    expect(panels[1]?.attributes('data-state')).toBe('active')
  })

  it('resolveTabsHtmlElement reads exposed refs and component roots', () => {
    const el = document.createElement('button')
    expect(resolveTabsHtmlElement(el)).toBe(el)
    expect(resolveTabsHtmlElement({ element: el })).toBe(el)
    expect(resolveTabsHtmlElement({ $el: el })).toBe(el)
    expect(resolveTabsHtmlElement(null)).toBeNull()
  })

  it('exposes focus helpers on list and content parts', async () => {
    const listRef = ref<{
      element: HTMLElement | null
      focus: () => void
    } | null>(null)
    const contentRef = ref<{
      element: HTMLElement | null
      blur: () => void
    } | null>(null)
    const host = defineComponent({
      setup: () => () =>
        h(
          GhostTabs,
          { defaultValue: 'one' },
          {
            default: () => [
              h(GhostTabsList, { ref: listRef }, () =>
                h(GhostTabsTrigger, { value: 'one' }, () => 'One'),
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
    const wrapper = mount(host, { attachTo: document.body })
    attached.push(wrapper)
    await nextTick()
    listRef.value?.focus()
    contentRef.value?.blur()
    expect(listRef.value?.element).toBeTruthy()
    expect(contentRef.value?.element).toBeTruthy()
  })

  it('does not attach roving-focus listeners during SSR setup', async () => {
    const add = vi.spyOn(document, 'addEventListener')

    const Comp = defineComponent({
      setup() {
        return () =>
          h(GhostTabs, null, {
            default: () =>
              h(GhostTabsList, null, () =>
                h(GhostTabsTrigger, { value: 'x' }, () => 'Tab'),
              ),
          })
      },
    })

    const app = createSSRApp(Comp)
    await renderToString(app)
    await flushPromises()

    const keydownCalls = add.mock.calls.filter(([event]) => event === 'keydown')
    const focusinCalls = add.mock.calls.filter(([event]) => event === 'focusin')
    expect(keydownCalls).toHaveLength(0)
    expect(focusinCalls).toHaveLength(0)

    add.mockRestore()
  })
})
