import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'

import {
  GhostToggleGroup,
  GhostToggleGroupItem,
  type GhostToggleGroupExposed,
  type GhostToggleGroupItemExposed,
} from '../../packages/themes/src/index'

describe('themed GhostToggleGroup', () => {
  it('forwards v-model and type through the themed root', async () => {
    const formats = ref<string[]>(['bold'])
    const host = defineComponent({
      setup: () => () =>
        h(
          GhostToggleGroup,
          {
            modelValue: formats.value,
            type: 'multiple',
            'onUpdate:modelValue': (value: string[] | string | undefined) => {
              if (Array.isArray(value)) {
                formats.value = value
              }
            },
          },
          {
            default: () => [
              h(GhostToggleGroupItem, { value: 'bold' }, () => 'Bold'),
              h(GhostToggleGroupItem, { value: 'italic' }, () => 'Italic'),
            ],
          },
        ),
    })
    const wrapper = mount(host)
    const italic = wrapper.findAll('.ghost-toggle-group-item')[1]
    await italic?.trigger('click')
    expect(formats.value).toEqual(['bold', 'italic'])
    wrapper.unmount()
  })

  it('exposes the mounted group root and item through themed wrappers', async () => {
    const groupRef = ref<GhostToggleGroupExposed | null>(null)
    const itemRef = ref<GhostToggleGroupItemExposed | null>(null)
    const host = defineComponent({
      setup: () => () =>
        h(
          GhostToggleGroup,
          { ref: groupRef, 'aria-label': 'Layout', defaultValue: 'list' },
          {
            default: () =>
              h(
                GhostToggleGroupItem,
                { ref: itemRef, value: 'list' },
                () => 'List',
              ),
          },
        ),
    })
    const wrapper = mount(host)
    const group = groupRef.value
    const item = itemRef.value
    expect(group?.element).toBe(
      wrapper.get('[data-ghost-toggle-group]').element,
    )
    expect(item?.element).toBe(wrapper.get('.ghost-toggle-group-item').element)
    expect(group?.element?.classList.contains('ghost-toggle-group')).toBe(true)
    await flushPromises()
    expect(() => group?.focus()).not.toThrow()
    expect(() => item?.blur()).not.toThrow()
    wrapper.unmount()
    expect(group?.element).toBeNull()
  })

  it('applies data-themed on group and items', () => {
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(
            GhostToggleGroup,
            { 'aria-label': 'View', defaultValue: 'grid' },
            {
              default: () =>
                h(GhostToggleGroupItem, { value: 'grid' }, () => 'Grid'),
            },
          ),
      }),
    )
    expect(wrapper.get('[data-themed]').attributes('data-themed')).toBe('')
    wrapper.unmount()
  })
})
