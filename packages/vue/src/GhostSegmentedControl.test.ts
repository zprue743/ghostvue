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
})
