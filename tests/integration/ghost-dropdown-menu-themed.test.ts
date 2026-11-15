import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'

import {
  GhostDropdownMenu,
  GhostDropdownMenuCheckboxItem,
  GhostDropdownMenuContent,
  GhostDropdownMenuGroup,
  GhostDropdownMenuItem,
  GhostDropdownMenuLabel,
  GhostDropdownMenuRadioGroup,
  GhostDropdownMenuRadioItem,
  GhostDropdownMenuSeparator,
  GhostDropdownMenuTrigger,
} from '../../packages/themes/src/index'

describe('themed GhostDropdownMenu', () => {
  it('renders themed menu parts when open', () => {
    const wrapper = mount(
      defineComponent({
        setup: () => {
          const checked = ref(true)
          const sort = ref('new')
          return () =>
            h(
              GhostDropdownMenu,
              { defaultOpen: true },
              {
                default: () => [
                  h(GhostDropdownMenuTrigger, null, () => 'Menu'),
                  h(GhostDropdownMenuContent, { portal: false }, () => [
                    h(GhostDropdownMenuLabel, null, () => 'Actions'),
                    h(GhostDropdownMenuGroup, null, () => [
                      h(GhostDropdownMenuItem, null, () => 'Profile'),
                      h(
                        GhostDropdownMenuCheckboxItem,
                        {
                          modelValue: checked.value,
                          'onUpdate:modelValue': (v: boolean) => {
                            checked.value = v
                          },
                        },
                        () => 'Notifications',
                      ),
                    ]),
                    h(GhostDropdownMenuSeparator),
                    h(
                      GhostDropdownMenuRadioGroup,
                      {
                        modelValue: sort.value,
                        'onUpdate:modelValue': (v: string) => {
                          sort.value = v
                        },
                      },
                      () => [
                        h(
                          GhostDropdownMenuRadioItem,
                          { value: 'new' },
                          () => 'Newest',
                        ),
                        h(
                          GhostDropdownMenuRadioItem,
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
