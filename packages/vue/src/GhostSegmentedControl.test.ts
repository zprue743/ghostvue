import { flushPromises, mount } from '@vue/test-utils'
import { createSSRApp, defineComponent, h, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { afterEach, describe, expect, it } from 'vitest'

import type { GhostSegmentedControlExposed } from './ghost-segmented-control'
import GhostSegmentedControl from './GhostSegmentedControl.vue'
import GhostSegmentedControlItem from './GhostSegmentedControlItem.vue'

const attached: ReturnType<typeof mount>[] = []

afterEach(() => {
  for (const wrapper of attached) {
    wrapper.unmount()
  }
  attached.length = 0
})

function mountSegmented(
  options: {
    modelValue?: string
    defaultValue?: string
    deselectable?: boolean
    disabled?: boolean
    onUpdate?: (value: string | undefined) => void
  } = {},
) {
  const updates: (string | undefined)[] = []
  const wrapper = mount(
    defineComponent({
      setup() {
        const model = ref<string | undefined>(options.modelValue)
        return () =>
          h(
            GhostSegmentedControl,
            {
              modelValue:
                options.modelValue !== undefined ? model.value : undefined,
              ...(options.defaultValue !== undefined
                ? { defaultValue: options.defaultValue }
                : {}),
              ...(options.deselectable !== undefined
                ? { deselectable: options.deselectable }
                : {}),
              ...(options.disabled ? { disabled: options.disabled } : {}),
              'aria-label': 'Test segments',
              'onUpdate:modelValue': (value: string | undefined) => {
                updates.push(value)
                model.value = value
                options.onUpdate?.(value)
              },
            },
            {
              default: () => [
                h(GhostSegmentedControlItem, { value: 'a' }, () => 'A'),
                h(GhostSegmentedControlItem, { value: 'b' }, () => 'B'),
                h(GhostSegmentedControlItem, { value: 'c' }, () => 'C'),
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
  return wrapper.findAll('.ghost-segmented-control-item')
}

function selectedIndexFromIndicator(wrapper: ReturnType<typeof mount>): number {
  const style = wrapper.get('[data-part="indicator"]').attributes('style') ?? ''
  const pattern = /--ghost-segmented-selected-index:\s*(-?\d+)/
  const match = pattern.exec(style)
  return match ? Number(match[1]) : Number.NaN
}

function domIndexForValue(
  wrapper: ReturnType<typeof mount>,
  value: string,
): number {
  return items(wrapper).findIndex(
    (item) => item.attributes('data-ghost-segmented-control-value') === value,
  )
}

describe('GhostSegmentedControl', () => {
  it('sets indicator CSS variables from selection without layout reads', async () => {
    const { wrapper } = mountSegmented({ defaultValue: 'b' })
    await flushPromises()
    const indicator = wrapper.get('[data-part="indicator"]')
    expect(indicator.attributes('data-indicator-visible')).toBe('true')
    const style = indicator.attributes('style') ?? ''
    expect(style).toMatch(/--ghost-segmented-item-count:\s*3/)
    expect(style).toMatch(/--ghost-segmented-selected-index:\s*1/)
  })

  it('keeps selection when deselectable is false', async () => {
    const { wrapper, updates } = mountSegmented({ defaultValue: 'a' })
    await flushPromises()
    await items(wrapper)[0]?.trigger('click')
    expect(updates).toHaveLength(0)
    expect(items(wrapper)[0]?.attributes('aria-pressed')).toBe('true')
  })

  it('allows deselect when deselectable is true', async () => {
    const { wrapper, updates } = mountSegmented({
      defaultValue: 'a',
      deselectable: true,
    })
    await flushPromises()
    await items(wrapper)[0]?.trigger('click')
    expect(updates).toEqual([undefined])
    expect(items(wrapper)[0]?.attributes('aria-pressed')).toBe('false')
    expect(
      wrapper
        .get('[data-part="indicator"]')
        .attributes('data-indicator-visible'),
    ).toBe('false')
  })

  it('switches pressed state between items', async () => {
    const { wrapper } = mountSegmented({ defaultValue: 'a' })
    await flushPromises()
    await items(wrapper)[1]?.trigger('click')
    expect(items(wrapper)[0]?.attributes('aria-pressed')).toBe('false')
    expect(items(wrapper)[1]?.attributes('aria-pressed')).toBe('true')
  })

  it('renders equal SSR markup including the indicator', async () => {
    const app = createSSRApp(
      defineComponent({
        setup: () => () =>
          h(
            GhostSegmentedControl,
            { defaultValue: 'b', 'aria-label': 'SSR' },
            {
              default: () => [
                h(GhostSegmentedControlItem, { value: 'a' }, () => 'A'),
                h(GhostSegmentedControlItem, { value: 'b' }, () => 'B'),
              ],
            },
          ),
      }),
    )
    const html = await renderToString(app)
    expect(html).toContain('data-part="indicator"')
    expect(html).toMatch(/--ghost-segmented-selected-index:\s*1/)
    expect(html).toContain('aria-pressed="true"')
  })

  it('reconciles indicator index when a segment is inserted before the selection', async () => {
    const showLeading = ref(false)
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostSegmentedControl,
              { defaultValue: 'b', 'aria-label': 'Reorder test' },
              {
                default: () => [
                  showLeading.value
                    ? h(
                        GhostSegmentedControlItem,
                        { value: 'leading' },
                        () => 'L',
                      )
                    : null,
                  h(GhostSegmentedControlItem, { value: 'a' }, () => 'A'),
                  h(GhostSegmentedControlItem, { value: 'b' }, () => 'B'),
                  h(GhostSegmentedControlItem, { value: 'c' }, () => 'C'),
                ],
              },
            )
        },
      }),
      { attachTo: document.body },
    )
    attached.push(wrapper)
    await flushPromises()
    expect(selectedIndexFromIndicator(wrapper)).toBe(1)

    showLeading.value = true
    await flushPromises()
    const domIndex = domIndexForValue(wrapper, 'b')
    expect(domIndex).toBe(2)
    expect(selectedIndexFromIndicator(wrapper)).toBe(domIndex)
  })

  it('reconciles indicator index when v-for item order changes', async () => {
    const values = ref(['a', 'b', 'c'])
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostSegmentedControl,
              { defaultValue: 'c', 'aria-label': 'v-for test' },
              {
                default: () =>
                  values.value.map((value) =>
                    h(GhostSegmentedControlItem, { key: value, value }, () =>
                      value.toUpperCase(),
                    ),
                  ),
              },
            )
        },
      }),
      { attachTo: document.body },
    )
    attached.push(wrapper)
    await flushPromises()
    expect(selectedIndexFromIndicator(wrapper)).toBe(2)

    values.value = ['c', 'b', 'a']
    await flushPromises()
    const domIndex = domIndexForValue(wrapper, 'c')
    expect(domIndex).toBe(0)
    expect(selectedIndexFromIndicator(wrapper)).toBe(domIndex)
  })

  it('exposes focus() on the group root', async () => {
    const component = ref<GhostSegmentedControlExposed | null>(null)
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostSegmentedControl,
              { ref: component, 'aria-label': 'Test', defaultValue: 'b' },
              {
                default: () => [
                  h(GhostSegmentedControlItem, { value: 'a' }, () => 'A'),
                  h(GhostSegmentedControlItem, { value: 'b' }, () => 'B'),
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
    expect(document.activeElement?.textContent).toBe('B')
  })

  it('exposes button semantics and tabindex on non-button hosts', async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostSegmentedControl,
              { 'aria-label': 'View', defaultValue: 'grid' },
              {
                default: () => [
                  h(
                    GhostSegmentedControlItem,
                    { as: 'div', value: 'list' },
                    () => 'List',
                  ),
                  h(
                    GhostSegmentedControlItem,
                    { as: 'span', value: 'grid' },
                    () => 'Grid',
                  ),
                  h(
                    GhostSegmentedControlItem,
                    { as: 'div', value: 'table', disabled: true },
                    () => 'Table',
                  ),
                  h(
                    GhostSegmentedControlItem,
                    { as: 'div', value: 'custom', role: 'radio' },
                    () => 'Custom',
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

    const list = items(wrapper)
    expect(list[0]?.attributes('role')).toBe('button')
    expect(list[0]?.attributes('tabindex')).toBe('-1')
    expect(list[0]?.attributes('aria-disabled')).toBeUndefined()

    expect(list[1]?.attributes('role')).toBe('button')
    expect(list[1]?.attributes('tabindex')).toBe('0')

    expect(list[2]?.attributes('role')).toBe('button')
    expect(list[2]?.attributes('tabindex')).toBe('-1')
    expect(list[2]?.attributes('aria-disabled')).toBe('true')
    expect(list[2]?.attributes('disabled')).toBeUndefined()

    expect(list[3]?.attributes('role')).toBe('radio')
  })

  it('toggles non-button hosts with Enter and Space and moves roving focus', async () => {
    const updates: (string | undefined)[] = []
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostSegmentedControl,
              {
                'aria-label': 'View',
                defaultValue: 'list',
                'onUpdate:modelValue': (value: string | undefined) => {
                  updates.push(value)
                },
              },
              {
                default: () => [
                  h(
                    GhostSegmentedControlItem,
                    { as: 'div', value: 'list' },
                    () => 'List',
                  ),
                  h(
                    GhostSegmentedControlItem,
                    { as: 'span', value: 'grid' },
                    () => 'Grid',
                  ),
                  h(
                    GhostSegmentedControlItem,
                    { as: 'div', value: 'board' },
                    () => 'Board',
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

    const [first, second, third] = items(wrapper)
    if (!first || !second || !third) {
      throw new Error('Expected three segment items')
    }
    ;(first.element as HTMLElement).focus()
    first.element.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        cancelable: true,
      }),
    )
    await flushPromises()
    expect(document.activeElement).toBe(second.element)

    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    })
    second.element.dispatchEvent(enterEvent)
    await flushPromises()
    expect(enterEvent.defaultPrevented).toBe(true)
    expect(second.attributes('aria-pressed')).toBe('true')
    expect(updates.at(-1)).toBe('grid')

    const spaceEvent = new KeyboardEvent('keydown', {
      key: ' ',
      bubbles: true,
      cancelable: true,
    })
    third.element.dispatchEvent(spaceEvent)
    await flushPromises()
    expect(spaceEvent.defaultPrevented).toBe(true)
    expect(third.attributes('aria-pressed')).toBe('true')
    expect(updates.at(-1)).toBe('board')
  })

  it('ignores Enter and Space on disabled non-button hosts and respects prevented keydown', async () => {
    const updates: (string | undefined)[] = []
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostSegmentedControl,
              {
                'aria-label': 'View',
                defaultValue: 'list',
                'onUpdate:modelValue': (value: string | undefined) => {
                  updates.push(value)
                },
              },
              {
                default: () => [
                  h(
                    GhostSegmentedControlItem,
                    { as: 'div', value: 'list' },
                    () => 'List',
                  ),
                  h(
                    GhostSegmentedControlItem,
                    { as: 'span', value: 'disabled-seg', disabled: true },
                    () => 'Disabled',
                  ),
                  h(
                    GhostSegmentedControlItem,
                    {
                      as: 'div',
                      value: 'prevented-seg',
                      onKeydown: (event: KeyboardEvent) => {
                        event.preventDefault()
                      },
                    },
                    () => 'Prevented',
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

    const [, disabledSeg, preventedSeg] = items(wrapper)
    if (!disabledSeg || !preventedSeg) {
      throw new Error('Expected segment items')
    }
    const disabledSpace = new KeyboardEvent('keydown', {
      key: ' ',
      bubbles: true,
      cancelable: true,
    })
    disabledSeg.element.dispatchEvent(disabledSpace)
    await flushPromises()
    expect(disabledSpace.defaultPrevented).toBe(true)
    expect(disabledSeg.attributes('aria-pressed')).toBe('false')

    const preventedEnter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    })
    preventedSeg.element.dispatchEvent(preventedEnter)
    await flushPromises()
    expect(preventedEnter.defaultPrevented).toBe(true)
    expect(preventedSeg.attributes('aria-pressed')).toBe('false')
    expect(updates).toHaveLength(0)
  })

  it('clears controlled deselectable selection to empty state when active segment is clicked', async () => {
    const { wrapper, updates } = mountSegmented({
      modelValue: 'a',
      deselectable: true,
    })
    await flushPromises()
    expect(items(wrapper)[0]?.attributes('aria-pressed')).toBe('true')
    expect(
      wrapper
        .get('[data-part="indicator"]')
        .attributes('data-indicator-visible'),
    ).toBe('true')

    await items(wrapper)[0]?.trigger('click')
    await flushPromises()

    expect(updates).toEqual([undefined])
    for (const item of items(wrapper)) {
      expect(item.attributes('aria-pressed')).toBe('false')
    }
    expect(
      wrapper
        .get('[data-part="indicator"]')
        .attributes('data-indicator-visible'),
    ).toBe('false')
    expect(selectedIndexFromIndicator(wrapper)).toBe(-1)

    await items(wrapper)[1]?.trigger('click')
    await flushPromises()
    expect(updates).toEqual([undefined, 'b'])
    expect(items(wrapper)[1]?.attributes('aria-pressed')).toBe('true')
    expect(selectedIndexFromIndicator(wrapper)).toBe(1)
  })

  it('preserves active segment when controlled parent ignores deselection', async () => {
    const updates: (string | undefined)[] = []
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostSegmentedControl,
              {
                modelValue: 'a',
                deselectable: true,
                'aria-label': 'Test segments',
                'onUpdate:modelValue': (value: string | undefined) => {
                  updates.push(value)
                },
              },
              {
                default: () => [
                  h(GhostSegmentedControlItem, { value: 'a' }, () => 'A'),
                  h(GhostSegmentedControlItem, { value: 'b' }, () => 'B'),
                ],
              },
            )
        },
      }),
      { attachTo: document.body },
    )
    attached.push(wrapper)
    await flushPromises()

    await items(wrapper)[0]?.trigger('click')
    await flushPromises()

    expect(updates).toEqual([undefined])
    expect(items(wrapper)[0]?.attributes('aria-pressed')).toBe('true')
    expect(
      wrapper
        .get('[data-part="indicator"]')
        .attributes('data-indicator-visible'),
    ).toBe('true')
  })
})
