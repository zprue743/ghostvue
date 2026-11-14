import { flushPromises, mount } from '@vue/test-utils'
import { createSSRApp, defineComponent, h, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { GhostToggleGroupExposed } from './ghost-toggle-group'
import GhostToggleGroup from './GhostToggleGroup.vue'
import GhostToggleGroupItem from './GhostToggleGroupItem.vue'

const attached: ReturnType<typeof mount>[] = []

afterEach(() => {
  for (const wrapper of attached) {
    wrapper.unmount()
  }
  attached.length = 0
})

function mountGroup(
  options: {
    type?: 'single' | 'multiple'
    modelValue?: string | string[]
    defaultValue?: string | string[]
    orientation?: 'horizontal' | 'vertical'
    dir?: 'ltr' | 'rtl'
    disabled?: boolean
    middleDisabled?: boolean
    onUpdate?: (value: string | string[] | undefined) => void
  } = {},
) {
  const updates: (string | string[] | undefined)[] = []
  const wrapper = mount(
    defineComponent({
      setup() {
        const model = ref<string | string[] | undefined>(options.modelValue)
        return () =>
          h(
            GhostToggleGroup,
            {
              ...(options.type ? { type: options.type } : {}),
              modelValue:
                options.modelValue !== undefined ? model.value : undefined,
              ...(options.defaultValue !== undefined
                ? { defaultValue: options.defaultValue }
                : {}),
              ...(options.orientation
                ? { orientation: options.orientation }
                : {}),
              ...(options.dir ? { dir: options.dir } : {}),
              ...(options.disabled ? { disabled: options.disabled } : {}),
              'aria-label': 'Test group',
              'onUpdate:modelValue': (value: string | string[] | undefined) => {
                updates.push(value)
                model.value = value
                options.onUpdate?.(value)
              },
            },
            {
              default: () => [
                h(GhostToggleGroupItem, { value: 'one' }, () => 'One'),
                h(
                  GhostToggleGroupItem,
                  { value: 'two', disabled: options.middleDisabled ?? false },
                  () => 'Two',
                ),
                h(GhostToggleGroupItem, { value: 'three' }, () => 'Three'),
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

function items(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('.ghost-toggle-group-item')
}

function focusItem(wrapper: ReturnType<typeof mount>, index: number): void {
  const item = items(wrapper)[index]
  if (item) {
    ;(item.element as HTMLElement).focus()
  }
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

describe('GhostToggleGroup', () => {
  it('starts with no pressed item in uncontrolled single mode', async () => {
    const { wrapper } = mountGroup()
    await flushPromises()
    for (const item of items(wrapper)) {
      expect(item.attributes('aria-pressed')).toBe('false')
    }
  })

  it('selects defaultValue in single mode', async () => {
    const { wrapper } = mountGroup({ defaultValue: 'two' })
    await flushPromises()
    expect(items(wrapper)[1]?.attributes('aria-pressed')).toBe('true')
    expect(items(wrapper)[0]?.attributes('aria-pressed')).toBe('false')
  })

  it('deselects the active item when clicked again in single mode', async () => {
    const { wrapper, updates } = mountGroup({ defaultValue: 'one' })
    await flushPromises()
    await items(wrapper)[0]?.trigger('click')
    expect(updates.at(-1)).toBe(undefined)
    expect(items(wrapper)[0]?.attributes('aria-pressed')).toBe('false')
  })

  it('toggles membership in multiple mode', async () => {
    const { wrapper, updates } = mountGroup({
      type: 'multiple',
      defaultValue: ['one'],
    })
    await flushPromises()
    await items(wrapper)[1]?.trigger('click')
    expect(updates.at(-1)).toEqual(['one', 'two'])
    await items(wrapper)[0]?.trigger('click')
    expect(updates.at(-1)).toEqual(['two'])
  })

  it('uses aria-pressed and data-state on items', async () => {
    const { wrapper } = mountGroup({ defaultValue: 'two' })
    await flushPromises()
    const middle = items(wrapper)[1]
    expect(middle?.attributes('aria-pressed')).toBe('true')
    expect(middle?.attributes('data-state')).toBe('on')
    expect(items(wrapper)[0]?.attributes('data-state')).toBe('off')
  })

  it('skips disabled items during roving focus', async () => {
    const { wrapper } = mountGroup({
      defaultValue: 'one',
      middleDisabled: true,
    })
    await flushPromises()
    const group = wrapper.get('[role="group"]').element
    focusItem(wrapper, 0)
    key(group, 'ArrowRight')
    await flushPromises()
    expect(items(wrapper)[2]?.element).toBe(document.activeElement)
  })

  it('moves horizontally with arrow keys in RTL', async () => {
    const { wrapper } = mountGroup({ defaultValue: 'two', dir: 'rtl' })
    await flushPromises()
    const group = wrapper.get('[role="group"]').element
    focusItem(wrapper, 1)
    key(group, 'ArrowRight')
    await flushPromises()
    expect(items(wrapper)[0]?.element).toBe(document.activeElement)
  })

  it('moves vertically with arrow keys', async () => {
    const { wrapper } = mountGroup({
      defaultValue: 'one',
      orientation: 'vertical',
    })
    await flushPromises()
    const group = wrapper.get('[role="group"]').element
    focusItem(wrapper, 0)
    key(group, 'ArrowDown')
    await flushPromises()
    expect(items(wrapper)[1]?.element).toBe(document.activeElement)
  })

  it('sets group aria-disabled when disabled', async () => {
    const { wrapper, updates } = mountGroup({
      defaultValue: 'one',
      disabled: true,
    })
    await flushPromises()
    expect(wrapper.get('[role="group"]').attributes('aria-disabled')).toBe(
      'true',
    )
    await items(wrapper)[0]?.trigger('click')
    expect(updates).toHaveLength(0)
  })

  it('places tabindex 0 on the primary pressed tab stop', async () => {
    const { wrapper } = mountGroup({ defaultValue: 'two' })
    await flushPromises()
    expect(items(wrapper)[1]?.attributes('tabindex')).toBe('0')
    expect(items(wrapper)[0]?.attributes('tabindex')).toBe('-1')
  })

  it('does not attach roving listeners during SSR setup', async () => {
    const addListener = vi.spyOn(HTMLElement.prototype, 'addEventListener')
    const app = createSSRApp(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostToggleGroup,
              { 'aria-label': 'SSR' },
              {
                default: () =>
                  h(GhostToggleGroupItem, { value: 'a' }, () => 'A'),
              },
            )
        },
      }),
    )
    await renderToString(app)
    const rovingCalls = addListener.mock.calls.filter(([type]) =>
      ['keydown', 'focusin'].includes(type),
    )
    expect(rovingCalls).toHaveLength(0)
    addListener.mockRestore()
  })

  it('jumps with Home and End keys', async () => {
    const { wrapper } = mountGroup({ defaultValue: 'two' })
    await flushPromises()
    const group = wrapper.get('[role="group"]').element
    focusItem(wrapper, 1)
    key(group, 'Home')
    await flushPromises()
    expect(items(wrapper)[0]?.element).toBe(document.activeElement)
    key(group, 'End')
    await flushPromises()
    expect(items(wrapper)[2]?.element).toBe(document.activeElement)
  })

  it('merges consumer class with the item part class', async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostToggleGroup,
              { 'aria-label': 'Align' },
              {
                default: () =>
                  h(
                    GhostToggleGroupItem,
                    { value: 'left', class: 'custom-density' },
                    () => 'Left',
                  ),
              },
            )
        },
      }),
      { attachTo: document.body },
    )
    attached.push(wrapper)
    await flushPromises()
    const item = wrapper.get('.ghost-toggle-group-item')
    expect(item.classes()).toContain('custom-density')
    expect(item.classes()).toContain('ghost-toggle-group-item')
  })

  it('does not apply nested group items to the outer tab-stop sync', async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostToggleGroup,
              { 'aria-label': 'Outer', defaultValue: 'outer' },
              {
                default: () => [
                  h(GhostToggleGroupItem, { value: 'outer' }, () => 'Outer'),
                  h(
                    GhostToggleGroup,
                    { 'aria-label': 'Inner', defaultValue: 'inner' },
                    {
                      default: () =>
                        h(
                          GhostToggleGroupItem,
                          { value: 'inner' },
                          () => 'Inner',
                        ),
                    },
                  ),
                ],
              },
            )
        },
      }),
      { attachTo: document.body },
    )
    attached.push(wrapper)
    await flushPromises()
    const outerButtons = wrapper
      .get('[aria-label="Outer"]')
      .findAll('.ghost-toggle-group-item')
    expect(outerButtons).toHaveLength(1)
    expect(outerButtons[0]?.attributes('tabindex')).toBe('0')
    const innerButton = wrapper
      .get('[aria-label="Inner"]')
      .find('.ghost-toggle-group-item')
    expect(innerButton.attributes('tabindex')).toBe('0')
  })

  it('uses aria-disabled on non-button disabled items', async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostToggleGroup,
              { 'aria-label': 'Align' },
              {
                default: () =>
                  h(
                    GhostToggleGroupItem,
                    { as: 'span', value: 'left', disabled: true },
                    () => 'Left',
                  ),
              },
            )
        },
      }),
      { attachTo: document.body },
    )
    attached.push(wrapper)
    await flushPromises()
    const item = wrapper.get('.ghost-toggle-group-item')
    expect(item.attributes('aria-disabled')).toBe('true')
    expect(item.attributes('aria-pressed')).toBe('false')
  })

  it('exposes focus() on the group root', async () => {
    const component = ref<GhostToggleGroupExposed | null>(null)
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostToggleGroup,
              { ref: component, 'aria-label': 'Test', defaultValue: 'two' },
              {
                default: () => [
                  h(GhostToggleGroupItem, { value: 'one' }, () => 'One'),
                  h(GhostToggleGroupItem, { value: 'two' }, () => 'Two'),
                ],
              },
            )
        },
      }),
      { attachTo: document.body },
    )
    attached.push(wrapper)
    await flushPromises()
    component.value?.focus()
    expect(document.activeElement?.textContent).toBe('Two')
  })

  it('resets tab stop on focusout to the selected item', async () => {
    const { wrapper } = mountGroup({ defaultValue: 'one' })
    await flushPromises()
    const group = wrapper.get('[role="group"]').element
    focusItem(wrapper, 2)
    await flushPromises()
    group.dispatchEvent(
      new FocusEvent('focusout', {
        relatedTarget: document.body,
        bubbles: true,
      }),
    )
    await flushPromises()
    expect(items(wrapper)[0]?.attributes('tabindex')).toBe('0')
  })
})
