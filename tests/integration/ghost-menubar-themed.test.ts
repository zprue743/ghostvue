import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'

import {
  GhostMenubar,
  GhostMenubarCheckboxItem,
  GhostMenubarContent,
  GhostMenubarGroup,
  GhostMenubarItem,
  GhostMenubarLabel,
  GhostMenubarMenu,
  GhostMenubarRadioGroup,
  GhostMenubarRadioItem,
  GhostMenubarSeparator,
  GhostMenubarTrigger,
} from '../../packages/themes/src/index'

describe('themed GhostMenubar', () => {
  it('renders themed menu content when open', () => {
    const wrapper = mount(
      defineComponent({
        setup: () => {
          const checked = ref(true)
          const sort = ref('new')
          return () =>
            h(GhostMenubar, null, {
              default: () =>
                h(
                  GhostMenubarMenu,
                  { defaultOpen: true },
                  {
                    default: () => [
                      h(GhostMenubarTrigger, null, () => 'File'),
                      h(GhostMenubarContent, { portal: false }, () => [
                        h(GhostMenubarLabel, null, () => 'Actions'),
                        h(GhostMenubarGroup, null, () => [
                          h(GhostMenubarItem, null, () => 'Profile'),
                          h(
                            GhostMenubarCheckboxItem,
                            {
                              checked: checked.value,
                              'onUpdate:checked': (v: boolean) => {
                                checked.value = v
                              },
                            },
                            () => 'Notifications',
                          ),
                        ]),
                        h(GhostMenubarSeparator),
                        h(
                          GhostMenubarRadioGroup,
                          {
                            modelValue: sort.value,
                            'onUpdate:modelValue': (v: string) => {
                              sort.value = v
                            },
                          },
                          () => [
                            h(
                              GhostMenubarRadioItem,
                              { value: 'new' },
                              () => 'Newest',
                            ),
                            h(
                              GhostMenubarRadioItem,
                              { value: 'old' },
                              () => 'Oldest',
                            ),
                          ],
                        ),
                      ]),
                    ],
                  },
                ),
            })
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
