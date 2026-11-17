import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref, type VNode } from 'vue'

import {
  GhostCombobox,
  GhostComboboxContent,
  GhostComboboxInput,
  GhostComboboxOption,
  GhostContextMenu,
  GhostContextMenuContent,
  GhostContextMenuItem,
  GhostContextMenuTrigger,
  GhostDropdownMenu,
  GhostDropdownMenuContent,
  GhostDropdownMenuItem,
  GhostDropdownMenuTrigger,
  GhostMenubar,
  GhostMenubarContent,
  GhostMenubarItem,
  GhostMenubarMenu,
  GhostMenubarTrigger,
  GhostSelect,
  GhostSelectContent,
  GhostSelectOption,
  GhostSelectTrigger,
} from './index'

type ContentProps = Record<string, unknown>

interface ThemedContentHost {
  name: string
  libraryClass: string
  render: (contentProps: ContentProps) => VNode
}

const hosts: ThemedContentHost[] = [
  {
    name: 'GhostDropdownMenuContent',
    libraryClass: 'ghost-dropdown-menu-content',
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

describe.each(hosts)('themed $name class merging', (host) => {
  it.each([false, true])(
    'merges consumer classes onto the content element (portal: %s)',
    async (portal) => {
      const active = ref(true)
      const id = `themed-${host.libraryClass}-${String(portal)}`
      const wrapper = mount(
        defineComponent({
          setup: () => () =>
            host.render({
              id,
              portal,
              class: ['consumer-surface', { 'is-active': active.value }],
            }),
        }),
        { attachTo: document.body },
      )
      attached.push(wrapper)

      await flushPromises()
      await nextTick()

      const content = document.getElementById(id)
      if (!(content instanceof HTMLElement)) {
        throw new Error(`Expected themed content element #${id}`)
      }
      expect(content.getAttribute('data-part')).toBe('content')
      expect(content.getAttribute('data-themed')).toBe('')
      expect(wrapper.find(`#${id}`).exists()).toBe(!portal)
      // The library class appears exactly once alongside consumer classes.
      expect(content.className.split(/\s+/)).toEqual([
        host.libraryClass,
        'consumer-surface',
        'is-active',
      ])

      active.value = false
      await nextTick()
      expect(content.className.split(/\s+/)).toEqual([
        host.libraryClass,
        'consumer-surface',
      ])
    },
  )
})
