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
})
