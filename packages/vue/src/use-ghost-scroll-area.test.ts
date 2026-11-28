import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useGhostScrollArea } from './use-ghost-scroll-area'

const Host = defineComponent({
  props: {
    label: { type: String, default: undefined },
    orientation: {
      type: String as () => 'vertical' | 'horizontal' | 'both',
      default: 'vertical',
    },
  },
  setup(props, { slots }) {
    const element = ref<HTMLElement | null>(null)
    const { rootProps } = useGhostScrollArea(
      {
        label: () => props.label,
        orientation: () => props.orientation,
      },
      element,
    )
    return () =>
      h(
        'div',
        {
          ref: element,
          ...rootProps.value,
          style: rootProps.value.style,
        },
        slots['default']?.(),
      )
  },
})

function stubOverflow(element: HTMLElement): void {
  Object.defineProperties(element, {
    scrollHeight: { configurable: true, value: 200 },
    clientHeight: { configurable: true, value: 100 },
  })
}

async function flushObserversAndFrames(): Promise<void> {
  await Promise.resolve()
  await vi.runOnlyPendingTimersAsync()
  await nextTick()
}

describe('useGhostScrollArea', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('maps horizontal orientation to overflow-x', () => {
    const wrapper = mount(Host, {
      props: { orientation: 'horizontal' },
    })

    const root = wrapper.get('div')
    expect(root.element.style.overflowX).toBe('auto')
    expect(root.element.style.overflowY).toBe('hidden')
    expect(root.attributes('data-orientation')).toBe('horizontal')
  })

  it('adds root tabindex when the sole button becomes disabled and removes it when re-enabled', async () => {
    vi.useFakeTimers()
    const disabled = ref(false)
    const wrapper = mount({
      setup() {
        return () =>
          h(
            Host,
            { label: 'Scrollable actions' },
            {
              default: () =>
                h('button', { disabled: disabled.value }, 'Action'),
            },
          )
      },
    })

    const root = wrapper.get('[data-part="root"]')
    stubOverflow(root.element as HTMLElement)

    await flushObserversAndFrames()
    expect(root.attributes('data-overflow')).toBe('vertical')
    expect(root.attributes('tabindex')).toBeUndefined()

    disabled.value = true
    await nextTick()
    await flushObserversAndFrames()
    expect(root.attributes('tabindex')).toBe('0')
    expect(root.attributes('role')).toBe('region')
    expect(root.attributes('aria-label')).toBe('Scrollable actions')

    disabled.value = false
    await nextTick()
    await flushObserversAndFrames()
    expect(root.attributes('tabindex')).toBeUndefined()
    expect(root.attributes('role')).toBeUndefined()
  })

  it('recalculates root tabindex when descendant tabindex or inert changes', async () => {
    vi.useFakeTimers()
    const childTabindex = ref(0)
    const wrapperInert = ref(false)
    const wrapper = mount({
      setup() {
        return () =>
          h(
            Host,
            {},
            {
              default: () =>
                h('div', { inert: wrapperInert.value || undefined }, [
                  h('div', { tabindex: childTabindex.value }, 'Focusable'),
                ]),
            },
          )
      },
    })

    const root = wrapper.get('[data-part="root"]')
    stubOverflow(root.element as HTMLElement)

    await flushObserversAndFrames()
    expect(root.attributes('tabindex')).toBeUndefined()

    childTabindex.value = -1
    await nextTick()
    await flushObserversAndFrames()
    expect(root.attributes('tabindex')).toBe('0')

    childTabindex.value = 0
    await nextTick()
    await flushObserversAndFrames()
    expect(root.attributes('tabindex')).toBeUndefined()

    wrapperInert.value = true
    await nextTick()
    await flushObserversAndFrames()
    expect(root.attributes('tabindex')).toBe('0')

    wrapperInert.value = false
    await nextTick()
    await flushObserversAndFrames()
    expect(root.attributes('tabindex')).toBeUndefined()
  })
})
