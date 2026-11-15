import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'

import {
  GhostContextMenu,
  GhostContextMenuCheckboxItem,
  GhostContextMenuContent,
  GhostContextMenuGroup,
  GhostContextMenuItem,
  GhostContextMenuLabel,
  GhostContextMenuRadioGroup,
  GhostContextMenuRadioItem,
  GhostContextMenuSeparator,
  GhostContextMenuTrigger,
  type GhostContextMenuCheckboxItemExposed,
  type GhostContextMenuContentExposed,
  type GhostContextMenuItemExposed,
  type GhostContextMenuRadioItemExposed,
  type GhostContextMenuTriggerExposed,
} from '../../packages/themes/src/index'

describe('themed GhostContextMenu', () => {
  it('renders themed menu parts when open', () => {
    const wrapper = mount(
      defineComponent({
        setup: () => {
          const checked = ref(true)
          const sort = ref('new')
          return () =>
            h(
              GhostContextMenu,
              { defaultOpen: true },
              {
                default: () => [
                  h(GhostContextMenuTrigger, null, () => 'Menu'),
                  h(GhostContextMenuContent, { portal: false }, () => [
                    h(GhostContextMenuLabel, null, () => 'Actions'),
                    h(GhostContextMenuGroup, null, () => [
                      h(GhostContextMenuItem, null, () => 'Profile'),
                      h(
                        GhostContextMenuCheckboxItem,
                        {
                          checked: checked.value,
                          'onUpdate:checked': (v: boolean) => {
                            checked.value = v
                          },
                        },
                        () => 'Notifications',
                      ),
                    ]),
                    h(GhostContextMenuSeparator),
                    h(
                      GhostContextMenuRadioGroup,
                      {
                        modelValue: sort.value,
                        'onUpdate:modelValue': (v: string) => {
                          sort.value = v
                        },
                      },
                      () => [
                        h(
                          GhostContextMenuRadioItem,
                          { value: 'new' },
                          () => 'Newest',
                        ),
                        h(
                          GhostContextMenuRadioItem,
                          { value: 'old' },
                          () => 'Oldest',
                        ),
                      ],
                    ),
                  ]),
                ],
              },
            )
        },
      }),
    )

    expect(wrapper.get('[data-part="content"]').attributes('data-themed')).toBe(
      '',
    )
    expect(wrapper.text()).toContain('Profile')
    wrapper.unmount()
  })

  it('exposes themed part APIs and controlled open state', async () => {
    const open = ref(true)
    const triggerRef = ref<GhostContextMenuTriggerExposed | null>(null)
    const contentRef = ref<GhostContextMenuContentExposed | null>(null)
    const itemRef = ref<GhostContextMenuItemExposed | null>(null)
    const checkboxRef = ref<GhostContextMenuCheckboxItemExposed | null>(null)
    const radioItemRef = ref<GhostContextMenuRadioItemExposed | null>(null)
    const selects: Event[] = []
    const radioSelects: string[] = []

    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(
            GhostContextMenu,
            {
              open: open.value,
              'onUpdate:open': (next: boolean) => {
                open.value = next
              },
            },
            {
              default: () => [
                h(
                  GhostContextMenuTrigger,
                  { ref: triggerRef, disabled: false },
                  () => 'Target',
                ),
                h(
                  GhostContextMenuContent,
                  { ref: contentRef, portal: false, placement: 'bottom-start' },
                  () => [
                    h(
                      GhostContextMenuLabel,
                      { as: 'div' },
                      () => 'Row actions',
                    ),
                    h(GhostContextMenuGroup, null, () =>
                      h(
                        GhostContextMenuItem,
                        {
                          ref: itemRef,
                          onSelect: (event: Event) => {
                            selects.push(event)
                          },
                        },
                        () => 'Open',
                      ),
                    ),
                    h(GhostContextMenuSeparator),
                    h(
                      GhostContextMenuCheckboxItem,
                      {
                        ref: checkboxRef,
                        checked: false,
                        'onUpdate:checked': () => undefined,
                      },
                      () => 'Flag',
                    ),
                    h(
                      GhostContextMenuRadioGroup,
                      {
                        modelValue: 'a',
                        'onUpdate:modelValue': () => undefined,
                      },
                      () =>
                        h(
                          GhostContextMenuRadioItem,
                          {
                            ref: radioItemRef,
                            value: 'a',
                            onSelect: (value: string) => {
                              radioSelects.push(value)
                            },
                          },
                          () => 'Option A',
                        ),
                    ),
                  ],
                ),
              ],
            },
          ),
      }),
    )

    expect(triggerRef.value?.element).toBe(
      wrapper.get('[data-part="trigger"]').element,
    )
    expect(contentRef.value?.element).toBe(
      wrapper.get('[data-part="content"]').element,
    )
    expect(itemRef.value?.element).toBeTruthy()
    expect(checkboxRef.value?.element).toBeTruthy()
    expect(radioItemRef.value?.element).toBeTruthy()

    triggerRef.value?.focus()
    triggerRef.value?.blur()
    contentRef.value?.focus()
    contentRef.value?.blur()
    itemRef.value?.focus()
    itemRef.value?.blur()
    checkboxRef.value?.focus()
    checkboxRef.value?.blur()
    radioItemRef.value?.focus()
    radioItemRef.value?.blur()

    await wrapper.get('[data-part="item"]').trigger('click')
    expect(selects).toHaveLength(1)

    wrapper.unmount()
    expect(triggerRef.value?.element ?? null).toBeNull()
    expect(contentRef.value?.element ?? null).toBeNull()
  })
})
