import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'

import { useGhostToolbar } from './use-ghost-toolbar'

const attached: { unmount: () => void }[] = []

afterEach(() => {
  for (const wrapper of attached) {
    wrapper.unmount()
  }
  attached.length = 0
})

function key(target: EventTarget, keyName: string): void {
  target.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: keyName,
      bubbles: true,
      cancelable: true,
    }),
  )
}

describe('useGhostToolbar', () => {
  it('focus() moves to the roving tab stop instead of the toolbar root', async () => {
    const root = ref<HTMLElement | null>(null)
    let focusToolbar: ((options?: FocusOptions) => void) | undefined
    const wrapper = mount(
      defineComponent({
        setup() {
          const { rootProps, focus } = useGhostToolbar({
            element: root,
            label: 'Actions',
          })
          focusToolbar = focus
          return () =>
            h('div', { ref: root, ...rootProps.value }, [
              h('button', { type: 'button' }, 'One'),
              h('button', { type: 'button' }, 'Two'),
            ])
        },
      }),
      { attachTo: document.body },
    )
    attached.push(wrapper)
    await nextTick()
    await nextTick()

    focusToolbar?.()
    expect(document.activeElement?.textContent).toBe('One')
    expect(document.activeElement).not.toBe(root.value)
  })

  it('attaches roving focus to a composable root', async () => {
    const root = ref<HTMLElement | null>(null)
    const wrapper = mount(
      defineComponent({
        setup() {
          const { rootProps } = useGhostToolbar({
            element: root,
            label: 'Filters',
          })
          return () =>
            h('div', { ref: root, ...rootProps.value }, [
              h('button', { type: 'button' }, 'All'),
              h('button', { type: 'button' }, 'Open'),
              h('button', { type: 'button' }, 'Closed'),
            ])
        },
      }),
      { attachTo: document.body },
    )
    attached.push(wrapper)
    await nextTick()
    await nextTick()

    const buttons = wrapper.findAll('button')
    const enabled = buttons.map((node) => node.element)
    expect(enabled.filter((item) => item.tabIndex === 0)).toHaveLength(1)

    const first = enabled[0]
    expect(first).toBeDefined()
    first?.focus()
    key(first ?? document.body, 'ArrowRight')
    expect(document.activeElement?.textContent).toBe('Open')
  })
})
