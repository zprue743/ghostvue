import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref, type VNode } from 'vue'

import GhostCombobox from './GhostCombobox.vue'
import GhostComboboxContent from './GhostComboboxContent.vue'
import GhostComboboxInput from './GhostComboboxInput.vue'
import GhostComboboxOption from './GhostComboboxOption.vue'
import GhostContextMenu from './GhostContextMenu.vue'
import GhostContextMenuContent from './GhostContextMenuContent.vue'
import GhostContextMenuItem from './GhostContextMenuItem.vue'
import GhostContextMenuTrigger from './GhostContextMenuTrigger.vue'
import GhostDropdownMenu from './GhostDropdownMenu.vue'
import GhostDropdownMenuContent from './GhostDropdownMenuContent.vue'
import GhostDropdownMenuItem from './GhostDropdownMenuItem.vue'
import GhostDropdownMenuTrigger from './GhostDropdownMenuTrigger.vue'
import GhostMenubar from './GhostMenubar.vue'
import GhostMenubarContent from './GhostMenubarContent.vue'
import GhostMenubarItem from './GhostMenubarItem.vue'
import GhostMenubarMenu from './GhostMenubarMenu.vue'
import GhostMenubarTrigger from './GhostMenubarTrigger.vue'
import GhostSelect from './GhostSelect.vue'
import GhostSelectContent from './GhostSelectContent.vue'
import GhostSelectOption from './GhostSelectOption.vue'
import GhostSelectTrigger from './GhostSelectTrigger.vue'

/**
 * GHO-164 regression coverage: every menu and listbox content host must merge
 * the consumer `class` with its library class (like Popover/Tooltip/Dialog)
 * while keeping floating positioning and consumer `style` merging intact.
 */

type ContentProps = Record<string, unknown>

interface ContentHost {
  name: string
  libraryClass: string
  /** Default floating strategy; context menus anchor to the pointer. */
  position: 'absolute' | 'fixed'
  render: (contentProps: ContentProps) => VNode
}

const hosts: ContentHost[] = [
  {
    name: 'GhostDropdownMenuContent',
    libraryClass: 'ghost-dropdown-menu-content',
    position: 'absolute',
    render: (contentProps) =>
      h(
        GhostDropdownMenu,
        { defaultOpen: true },
        {
          default: () => [
            h(GhostDropdownMenuTrigger, null, () => 'Menu'),
            h(GhostDropdownMenuContent, contentProps, () => [
              h(GhostDropdownMenuItem, null, () => 'Apple'),
            ]),
          ],
        },
      ),
  },
  {
    name: 'GhostContextMenuContent',
    libraryClass: 'ghost-context-menu-content',
    position: 'fixed',
    render: (contentProps) =>
      h(
        GhostContextMenu,
        { defaultOpen: true },
        {
          default: () => [
            h(GhostContextMenuTrigger, null, () => 'Area'),
            h(GhostContextMenuContent, contentProps, () => [
              h(GhostContextMenuItem, null, () => 'Apple'),
            ]),
          ],
        },
      ),
  },
  {
    name: 'GhostMenubarContent',
    libraryClass: 'ghost-menubar-content',
    position: 'absolute',
    render: (contentProps) =>
      h(GhostMenubar, null, {
        default: () => [
          h(
            GhostMenubarMenu,
            { defaultOpen: true },
            {
              default: () => [
                h(GhostMenubarTrigger, null, () => 'File'),
                h(GhostMenubarContent, contentProps, () => [
                  h(GhostMenubarItem, null, () => 'New'),
                ]),
              ],
            },
          ),
        ],
      }),
  },
  {
    name: 'GhostSelectContent',
    libraryClass: 'ghost-select-content',
    position: 'absolute',
    render: (contentProps) =>
      h(
        GhostSelect,
        { defaultOpen: true },
        {
          default: () => [
            h(GhostSelectTrigger, null, () => 'Fruit'),
            h(GhostSelectContent, contentProps, () => [
              h(
                GhostSelectOption,
                { value: 'a', textValue: 'Apple' },
                () => 'Apple',
              ),
            ]),
          ],
        },
      ),
  },
  {
    name: 'GhostComboboxContent',
    libraryClass: 'ghost-combobox-content',
    position: 'absolute',
    render: (contentProps) =>
      h(
        GhostCombobox,
        { defaultOpen: true },
        {
          default: () => [
            h(GhostComboboxInput),
            h(GhostComboboxContent, contentProps, () => [
              h(
                GhostComboboxOption,
                { value: 'a', textValue: 'Apple' },
                () => 'Apple',
              ),
            ]),
          ],
        },
      ),
  },
]

const attached: ReturnType<typeof mount>[] = []

afterEach(() => {
  while (attached.length > 0) attached.pop()?.unmount()
  document.body.innerHTML = ''
})

function mountHost(host: ContentHost, contentProps: () => ContentProps) {
  const wrapper = mount(
    defineComponent({
      setup: () => () => host.render(contentProps()),
    }),
    { attachTo: document.body },
  )
  attached.push(wrapper)
  return wrapper
}

function getContent(id: string): HTMLElement {
  const element = document.getElementById(id)
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Expected content element #${id}`)
  }
  return element
}

describe.each(hosts)('$name class merging', (host) => {
  it('merges string, array, object and module class bindings reactively without portal', async () => {
    const active = ref(true)
    const moduleStyles = { surface: 'MenuModule_surface__abc123' }
    const id = `${host.libraryClass}-inline`
    const wrapper = mountHost(host, () => ({
      id,
      portal: false,
      class: [
        'consumer-surface',
        { 'is-active': active.value, 'is-hidden': false },
        [moduleStyles.surface],
      ],
      style: { outlineColor: 'red' },
    }))

    await flushPromises()
    await nextTick()

    const content = getContent(id)
    // The asserted node is the real content part rendered inside the wrapper.
    expect(content.getAttribute('data-part')).toBe('content')
    expect(wrapper.find(`#${id}`).exists()).toBe(true)
    expect(content.classList).toContain(host.libraryClass)
    expect(content.classList).toContain('consumer-surface')
    expect(content.classList).toContain('is-active')
    expect(content.classList).toContain('MenuModule_surface__abc123')
    expect(content.classList).not.toContain('is-hidden')

    // Floating position styles and consumer styles still merge.
    expect(content.style.position).toBe(host.position)
    expect(content.style.outlineColor).toBe('red')

    active.value = false
    await nextTick()
    expect(content.classList).toContain(host.libraryClass)
    expect(content.classList).toContain('consumer-surface')
    expect(content.classList).not.toContain('is-active')
    expect(content.style.position).toBe(host.position)
  })

  it('merges a plain string class when portaled to body', async () => {
    const id = `${host.libraryClass}-portal`
    const wrapper = mountHost(host, () => ({
      id,
      class: 'consumer-surface',
      style: { outlineColor: 'red' },
    }))

    await flushPromises()
    await nextTick()

    const content = getContent(id)
    expect(content.getAttribute('data-part')).toBe('content')
    // Portaled content lives directly under body, outside the mount wrapper.
    expect(wrapper.find(`#${id}`).exists()).toBe(false)
    expect(content.parentElement).toBe(document.body)
    expect(content.classList).toContain(host.libraryClass)
    expect(content.classList).toContain('consumer-surface')
    expect(content.style.position).toBe(host.position)
    expect(content.style.outlineColor).toBe('red')
  })

  it('keeps only the library class when no consumer class is passed', async () => {
    const id = `${host.libraryClass}-bare`
    mountHost(host, () => ({ id, portal: false }))

    await flushPromises()
    await nextTick()

    expect(getContent(id).className).toBe(host.libraryClass)
  })
})
