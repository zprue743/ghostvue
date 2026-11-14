import { mount } from '@vue/test-utils'
import { createSSRApp, defineComponent, h, nextTick, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useRovingFocus } from './use-roving-focus'

const attached: ReturnType<typeof mount>[] = []

afterEach(() => {
  for (const wrapper of attached) {
    wrapper.unmount()
  }
  attached.length = 0
})

function mountRoving(
  options: Parameters<typeof useRovingFocus>[1],
  labels: string[],
  extra: { disabled?: string; dir?: 'ltr' | 'rtl' } = {},
) {
  const container = ref<HTMLElement | null>(null)
  const wrapper = mount(
    defineComponent({
      setup() {
        useRovingFocus(container, options)
        return () =>
          h(
            'div',
            {
              ref: container,
              role: 'toolbar',
              dir: extra.dir,
            },
            labels.map((label) =>
              h(
                'button',
                {
                  type: 'button',
                  disabled: extra.disabled === label,
                },
                label,
              ),
            ),
          )
      },
    }),
    { attachTo: document.body },
  )
  attached.push(wrapper)
  return wrapper
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

function buttonElement(
  wrapper: ReturnType<typeof mount>,
  index: number | 'last',
): HTMLElement {
  const buttons = wrapper.findAll('button')
  const node = index === 'last' ? buttons[buttons.length - 1] : buttons[index]
  if (!node) {
    throw new Error('expected a button')
  }
  return node.element
}

describe('useRovingFocus', () => {
  it('does not attach listeners during SSR setup', async () => {
    const add = vi.spyOn(document, 'addEventListener')
    const Comp = defineComponent({
      setup() {
        const container = ref<HTMLElement | null>(null)
        useRovingFocus(container, { orientation: 'horizontal' })
        return () =>
          h('div', { ref: container }, [h('button', { type: 'button' }, 'A')])
      },
    })

    await renderToString(createSSRApp(Comp))
    expect(add).not.toHaveBeenCalledWith(
      'keydown',
      expect.any(Function),
      expect.anything(),
    )
    add.mockRestore()
  })

  it('makes a single item the tab stop', async () => {
    const wrapper = mountRoving({ orientation: 'horizontal' }, [
      'One',
      'Two',
      'Three',
    ])
    await nextTick()

    const indexes = wrapper
      .findAll('button')
      .map((node) => node.element.tabIndex)
    expect(indexes.filter((value) => value === 0)).toHaveLength(1)
    expect(indexes.filter((value) => value === -1)).toHaveLength(2)
  })

  it('skips aria-disabled items while keeping them in the focusable set', async () => {
    const container = ref<HTMLElement | null>(null)
    const wrapper = mount(
      defineComponent({
        setup() {
          useRovingFocus(container, { orientation: 'horizontal', loop: true })
          return () =>
            h('div', { ref: container, role: 'toolbar' }, [
              h('button', { type: 'button' }, 'One'),
              h('button', { type: 'button', 'aria-disabled': 'true' }, 'Busy'),
              h('button', { type: 'button' }, 'Three'),
            ])
        },
      }),
      { attachTo: document.body },
    )
    attached.push(wrapper)
    await nextTick()

    const first = buttonElement(wrapper, 0)
    first.focus()
    key(first, 'ArrowRight')
    expect(document.activeElement?.textContent).toBe('Three')
  })

  it('does not treat items in display:none subtrees as roving tab stops', async () => {
    const container = ref<HTMLElement | null>(null)
    const wrapper = mount(
      defineComponent({
        setup() {
          useRovingFocus(container, { orientation: 'horizontal', loop: true })
          return () =>
            h('div', { ref: container, role: 'toolbar' }, [
              h(
                'div',
                { style: { display: 'none' } },
                h('button', { type: 'button' }, 'Hidden'),
              ),
              h('button', { type: 'button' }, 'Visible'),
            ])
        },
      }),
      { attachTo: document.body },
    )
    attached.push(wrapper)
    await nextTick()

    const visible = buttonElement(wrapper, 'last')
    expect(visible.tabIndex).toBe(0)
  })

  it('moves horizontally with arrows and skips disabled items', async () => {
    const wrapper = mountRoving(
      { orientation: 'horizontal', loop: true },
      ['One', 'Two', 'Three'],
      { disabled: 'Two' },
    )
    await nextTick()

    const first = wrapper.get('button').element
    first.focus()
    const event = key(first, 'ArrowRight')
    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement?.textContent).toBe('Three')
    expect(buttonElement(wrapper, 'last').tabIndex).toBe(0)
    expect(first.tabIndex).toBe(-1)
  })

  it('wraps with loop and stays put when loop is false', async () => {
    const looping = mountRoving({ orientation: 'horizontal', loop: true }, [
      'A',
      'B',
    ])
    await nextTick()
    const last = buttonElement(looping, 'last')
    last.focus()
    key(last, 'ArrowRight')
    expect(document.activeElement?.textContent).toBe('A')

    const bounded = mountRoving({ orientation: 'horizontal', loop: false }, [
      'A',
      'B',
    ])
    await nextTick()
    const boundedLast = buttonElement(bounded, 'last')
    boundedLast.focus()
    key(boundedLast, 'ArrowRight')
    expect(document.activeElement).toBe(boundedLast)
  })

  it('uses vertical arrows when orientation is vertical', async () => {
    const wrapper = mountRoving({ orientation: 'vertical' }, ['A', 'B'])
    await nextTick()
    const first = wrapper.get('button').element
    first.focus()
    const horizontal = key(first, 'ArrowRight')
    expect(horizontal.defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(first)

    key(first, 'ArrowDown')
    expect(document.activeElement?.textContent).toBe('B')
  })

  it('accepts both axes when orientation is both', async () => {
    const wrapper = mountRoving({ orientation: 'both' }, ['A', 'B'])
    await nextTick()
    const first = wrapper.get('button').element
    first.focus()
    key(first, 'ArrowDown')
    expect(document.activeElement?.textContent).toBe('B')
    key(document.activeElement ?? first, 'ArrowLeft')
    expect(document.activeElement?.textContent).toBe('A')
  })

  it('moves to the ends with Home and End', async () => {
    const wrapper = mountRoving({ orientation: 'horizontal' }, ['A', 'B', 'C'])
    await nextTick()
    const first = wrapper.get('button').element
    first.focus()
    key(first, 'End')
    expect(document.activeElement?.textContent).toBe('C')
    key(document.activeElement ?? first, 'Home')
    expect(document.activeElement?.textContent).toBe('A')
  })

  it('reverses horizontal arrows in RTL', async () => {
    const wrapper = mountRoving(
      { orientation: 'horizontal', dir: 'rtl' },
      ['A', 'B'],
      { dir: 'rtl' },
    )
    await nextTick()
    const first = wrapper.get('button').element
    first.focus()
    key(first, 'ArrowLeft')
    expect(document.activeElement?.textContent).toBe('B')
    key(document.activeElement ?? first, 'ArrowRight')
    expect(document.activeElement?.textContent).toBe('A')
  })

  it('updates the tab stop when a different item is focused', async () => {
    const wrapper = mountRoving({ orientation: 'horizontal' }, ['A', 'B'])
    await nextTick()
    const second = buttonElement(wrapper, 'last')
    second.focus()
    await nextTick()
    expect(second.tabIndex).toBe(0)
    expect(wrapper.get('button').element.tabIndex).toBe(-1)
  })

  it('does not steal Tab from the page', async () => {
    const wrapper = mountRoving({ orientation: 'horizontal' }, ['A', 'B'])
    await nextTick()
    const first = wrapper.get('button').element
    first.focus()
    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    })
    first.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })
})
