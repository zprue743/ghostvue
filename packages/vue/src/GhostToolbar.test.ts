import { mount } from '@vue/test-utils'
import { createSSRApp, defineComponent, h, nextTick, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { GhostToolbarExposed } from './ghost-toolbar'
import GhostToolbar from './GhostToolbar.vue'

const attached: { unmount: () => void }[] = []

afterEach(() => {
  for (const wrapper of attached) {
    wrapper.unmount()
  }
  attached.length = 0
})

function mountToolbar(
  props: Record<string, unknown> = {},
  attrs: Record<string, unknown> = {},
) {
  const wrapper = mount(GhostToolbar, {
    props: { label: 'Actions', ...props },
    attrs,
    slots: {
      default: () => [
        h('button', { type: 'button' }, 'One'),
        h('button', { type: 'button', disabled: true }, 'Two'),
        h('button', { type: 'button' }, 'Three'),
      ],
    },
    attachTo: document.body,
  })
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

describe('GhostToolbar', () => {
  it('exposes toolbar semantics and configuration hooks', () => {
    const wrapper = mountToolbar({ orientation: 'vertical', label: 'Format' })
    const root = wrapper.get('[data-ghost-toolbar]').element

    expect(root.getAttribute('role')).toBe('toolbar')
    expect(root.getAttribute('aria-label')).toBe('Format')
    expect(root.getAttribute('aria-orientation')).toBe('vertical')
    expect(root.getAttribute('data-orientation')).toBe('vertical')
    expect(root.classList.contains('ghost-toolbar')).toBe(true)
  })

  it('omits aria-orientation for horizontal toolbars', () => {
    const wrapper = mountToolbar({ orientation: 'horizontal' })
    const root = wrapper.get('[data-ghost-toolbar]').element

    expect(root.getAttribute('aria-orientation')).toBeNull()
    expect(root.getAttribute('data-orientation')).toBe('horizontal')
  })

  it('forwards native attributes and merges them over the label prop', () => {
    const wrapper = mountToolbar(
      { label: 'Ignored when labelledby is set' },
      {
        'aria-labelledby': 'toolbar-caption',
        id: 'row-actions',
        class: 'custom',
      },
    )
    const root = wrapper.get('[data-ghost-toolbar]')

    expect(root.attributes('aria-labelledby')).toBe('toolbar-caption')
    expect(root.attributes('id')).toBe('row-actions')
    expect(root.classes()).toContain('custom')
    expect(root.classes()).toContain('ghost-toolbar')
  })

  it('renders the chosen root element', () => {
    const wrapper = mount(GhostToolbar, {
      props: { as: 'section', label: 'Section bar' },
      slots: { default: () => 'Content' },
    })
    expect(wrapper.get('[data-ghost-toolbar]').element.tagName).toBe('SECTION')
  })

  it('exposes focus helpers on the root', () => {
    const component = ref<GhostToolbarExposed | null>(null)
    const host = defineComponent({
      setup: () => () =>
        h(GhostToolbar, { ref: component, label: 'Actions' }, () =>
          h('button', { type: 'button' }, 'Save'),
        ),
    })
    const wrapper = mount(host, { attachTo: document.body })
    attached.push(wrapper)

    expect(component.value?.element).toBe(
      wrapper.get('[data-ghost-toolbar]').element,
    )
    const root = wrapper.get('[data-ghost-toolbar]').element
    component.value?.focus()
    expect(document.activeElement).not.toBe(root)
    expect(document.activeElement?.tagName).toBe('BUTTON')
    component.value?.blur()
    expect(document.activeElement).not.toBe(root)
  })

  it('applies roving tabindex and arrow navigation', async () => {
    const wrapper = mountToolbar({ loop: true })
    await nextTick()
    await nextTick()

    const enabled = wrapper
      .findAll('button')
      .filter((node) => !(node.element as HTMLButtonElement).disabled)
    const tabStops = enabled.map((node) => node.element.tabIndex)
    expect(tabStops.filter((value) => value === 0)).toHaveLength(1)

    const first = enabled[0]?.element
    expect(first).toBeDefined()
    first?.focus()
    key(first ?? document.body, 'ArrowRight')
    expect(document.activeElement?.textContent).toBe('Three')
    expect(enabled[1]?.element.tabIndex).toBe(0)
  })

  it('skips disabled items while roving', async () => {
    const wrapper = mountToolbar()
    await nextTick()

    const first = wrapper.get('button').element
    first.focus()
    key(first, 'ArrowRight')
    expect(document.activeElement?.textContent).toBe('Three')
  })

  it('uses vertical arrows when orientation is vertical', async () => {
    const wrapper = mountToolbar({ orientation: 'vertical' })
    await nextTick()

    const first = wrapper.get('button').element
    first.focus()
    const horizontal = key(first, 'ArrowRight')
    expect(horizontal.defaultPrevented).toBe(false)

    key(first, 'ArrowDown')
    expect(document.activeElement?.textContent).toBe('Three')
  })

  it('does not attach roving listeners during SSR setup', async () => {
    const add = vi.spyOn(HTMLElement.prototype, 'addEventListener')
    const Comp = defineComponent({
      setup() {
        return () =>
          h(GhostToolbar, { label: 'Server' }, () =>
            h('button', { type: 'button' }, 'A'),
          )
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

  it('renders deterministic toolbar markup during SSR', async () => {
    const html = await renderToString(
      h(GhostToolbar, { label: 'Export', orientation: 'vertical' }, () =>
        h('button', { type: 'button' }, 'PDF'),
      ),
    )

    expect(html).toContain('role="toolbar"')
    expect(html).toContain('aria-orientation="vertical"')
    expect(html).toContain('data-orientation="vertical"')
    expect(html).toContain('data-ghost-toolbar')
  })
})
