import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import { waitForFormResetDeferral } from './form-reset'
import GhostRadioGroup from './GhostRadioGroup.vue'
import GhostRadioGroupItem from './GhostRadioGroupItem.vue'
import type { GhostRadioGroupExposed } from './ghost-radio-group'

function mountGroup(
  props: Record<string, unknown> = {},
  attrs: Record<string, unknown> = {},
) {
  return mount(
    defineComponent({
      components: { GhostRadioGroup, GhostRadioGroupItem },
      setup() {
        return () =>
          h(GhostRadioGroup, props, {
            default: () => [
              h(GhostRadioGroupItem, { value: 'a', id: 'radio-a' }),
              h(GhostRadioGroupItem, { value: 'b', id: 'radio-b' }),
            ],
          })
      },
    }),
    { attrs },
  )
}

describe('GhostRadioGroup', () => {
  it('leaves nothing checked when uncontrolled without defaultValue', () => {
    const wrapper = mountGroup()
    expect((wrapper.get('#radio-a').element as HTMLInputElement).checked).toBe(
      false,
    )
    expect((wrapper.get('#radio-b').element as HTMLInputElement).checked).toBe(
      false,
    )
  })

  it('seeds from defaultValue when uncontrolled', () => {
    const wrapper = mountGroup({ defaultValue: 'b' })

    expect((wrapper.get('#radio-a').element as HTMLInputElement).checked).toBe(
      false,
    )
    expect((wrapper.get('#radio-b').element as HTMLInputElement).checked).toBe(
      true,
    )
  })

  it('updates selection on change and emits update:modelValue', async () => {
    const wrapper = mountGroup()
    await wrapper.get('#radio-b').setValue()
    await nextTick()

    expect(
      wrapper.findComponent(GhostRadioGroup).emitted('update:modelValue'),
    ).toEqual([['b']])
    expect((wrapper.get('#radio-b').element as HTMLInputElement).checked).toBe(
      true,
    )
  })

  it('follows a controlled v-model from the parent', async () => {
    const model = ref('a')
    const wrapper = mount(
      defineComponent({
        components: { GhostRadioGroup, GhostRadioGroupItem },
        setup() {
          return () =>
            h(
              GhostRadioGroup,
              {
                modelValue: model.value,
                'onUpdate:modelValue': (value: string) => {
                  model.value = value
                },
              },
              {
                default: () => [
                  h(GhostRadioGroupItem, { value: 'a', id: 'radio-a' }),
                  h(GhostRadioGroupItem, { value: 'b', id: 'radio-b' }),
                ],
              },
            )
        },
      }),
    )

    await wrapper.get('#radio-b').setValue()
    expect(model.value).toBe('b')
  })

  it('restores native checked when a controlled parent ignores the emit', async () => {
    const wrapper = mount(GhostRadioGroup, {
      attachTo: document.body,
      props: { modelValue: 'a' },
      slots: {
        default: () => [
          h(GhostRadioGroupItem, { value: 'a', id: 'radio-a' }),
          h(GhostRadioGroupItem, { value: 'b', id: 'radio-b' }),
        ],
      },
    })
    await wrapper.get('#radio-b').setValue(true)
    await nextTick()

    expect((wrapper.get('#radio-b').element as HTMLInputElement).checked).toBe(
      false,
    )
    expect((wrapper.get('#radio-a').element as HTMLInputElement).checked).toBe(
      true,
    )
    wrapper.unmount()
  })

  it('exposes focus and blur without throwing', () => {
    const group = ref<GhostRadioGroupExposed | null>(null)
    const wrapper = mount(
      defineComponent({
        components: { GhostRadioGroup, GhostRadioGroupItem },
        setup() {
          return () =>
            h(
              GhostRadioGroup,
              { ref: group, defaultValue: 'b' },
              {
                default: () => [
                  h(GhostRadioGroupItem, { value: 'a', id: 'radio-a' }),
                  h(GhostRadioGroupItem, { value: 'b', id: 'radio-b' }),
                ],
              },
            )
        },
      }),
      { attachTo: document.body },
    )
    expect(() => {
      group.value?.focus()
      group.value?.blur()
    }).not.toThrow()
    wrapper.unmount()
  })

  it('skips disabled items during selection', async () => {
    const wrapper = mount(
      defineComponent({
        components: { GhostRadioGroup, GhostRadioGroupItem },
        setup: () => () =>
          h(
            GhostRadioGroup,
            { defaultValue: 'a' },
            {
              default: () => [
                h(GhostRadioGroupItem, { value: 'a', id: 'radio-a' }),
                h(GhostRadioGroupItem, {
                  value: 'b',
                  id: 'radio-b',
                  disabled: true,
                }),
                h(GhostRadioGroupItem, { value: 'c', id: 'radio-c' }),
              ],
            },
          ),
      }),
    )
    await wrapper.get('#radio-c').setValue()
    expect((wrapper.get('#radio-c').element as HTMLInputElement).checked).toBe(
      true,
    )
    expect(
      wrapper.findComponent(GhostRadioGroup).emitted('update:modelValue'),
    ).toEqual([['c']])
  })

  it('propagates an explicit name to items', () => {
    const wrapper = mountGroup({ name: 'plan' })
    expect(wrapper.get('#radio-a').attributes('name')).toBe('plan')
    expect(wrapper.get('#radio-b').attributes('name')).toBe('plan')
  })

  it('generates a shared name when the name prop is omitted', () => {
    const wrapper = mountGroup()
    const firstName = wrapper.get('#radio-a').attributes('name')
    const secondName = wrapper.get('#radio-b').attributes('name')
    expect(firstName).toBeTruthy()
    expect(firstName).toBe(secondName)
  })

  it('clears selection when the selected item unmounts', async () => {
    const showB = ref(true)
    const model = ref<string | undefined>('b')
    const wrapper = mount(
      defineComponent({
        components: { GhostRadioGroup, GhostRadioGroupItem },
        setup() {
          return () =>
            h(
              GhostRadioGroup,
              {
                modelValue: model.value,
                'onUpdate:modelValue': (value: string) => {
                  model.value = value
                },
              },
              {
                default: () => [
                  h(GhostRadioGroupItem, { value: 'a', id: 'radio-a' }),
                  showB.value
                    ? h(GhostRadioGroupItem, { value: 'b', id: 'radio-b' })
                    : null,
                ],
              },
            )
        },
      }),
    )

    expect((wrapper.get('#radio-b').element as HTMLInputElement).checked).toBe(
      true,
    )
    showB.value = false
    await nextTick()
    expect(model.value).toBe('b')
    expect((wrapper.get('#radio-a').element as HTMLInputElement).checked).toBe(
      false,
    )
    expect(
      wrapper.findComponent(GhostRadioGroup).emitted('update:modelValue'),
    ).toBeUndefined()
  })

  it('clears uncontrolled selection when the selected item unmounts', async () => {
    const showB = ref(true)
    const wrapper = mount(
      defineComponent({
        components: { GhostRadioGroup, GhostRadioGroupItem },
        setup() {
          return () =>
            h(
              GhostRadioGroup,
              { defaultValue: 'b' },
              {
                default: () => [
                  h(GhostRadioGroupItem, { value: 'a', id: 'radio-a' }),
                  showB.value
                    ? h(GhostRadioGroupItem, { value: 'b', id: 'radio-b' })
                    : null,
                ],
              },
            )
        },
      }),
    )

    showB.value = false
    await nextTick()

    expect((wrapper.get('#radio-a').element as HTMLInputElement).checked).toBe(
      false,
    )
    expect(
      wrapper.findComponent(GhostRadioGroup).emitted('update:modelValue'),
    ).toBeUndefined()
  })

  it('disables items when the group is disabled', () => {
    const wrapper = mountGroup({ disabled: true })
    expect(wrapper.get('#radio-a').attributes('disabled')).toBeDefined()
    expect(wrapper.get('#radio-b').attributes('disabled')).toBeDefined()
  })

  it('uses fieldset semantics by default', () => {
    const wrapper = mountGroup()
    expect(wrapper.find('fieldset.ghost-radio-group').exists()).toBe(true)
  })

  it('sets radiogroup role when as is not fieldset', () => {
    const wrapper = mountGroup({ as: 'div' })
    expect(wrapper.get('div.ghost-radio-group').attributes('role')).toBe(
      'radiogroup',
    )
  })

  it('forwards aria-invalid and describedby to the root', () => {
    const wrapper = mountGroup(
      { invalid: true },
      { 'aria-describedby': 'desc-1', id: 'group-1' },
    )
    const root = wrapper.get('fieldset')

    expect(root.attributes('aria-invalid')).toBe('true')
    expect(root.attributes('aria-describedby')).toBe('desc-1')
    expect(root.attributes('id')).toBe('group-1')
    expect(root.attributes('data-state')).toBe('invalid')
  })

  it('exposes the root element through a template ref', () => {
    const host = defineComponent({
      components: { GhostRadioGroup, GhostRadioGroupItem },
      setup() {
        const group = ref<GhostRadioGroupExposed | null>(null)
        return () =>
          h(
            GhostRadioGroup,
            { ref: group },
            {
              default: () => h(GhostRadioGroupItem, { value: 'a' }),
            },
          )
      },
    })
    const wrapper = mount(host)
    const exposed = wrapper.findComponent(GhostRadioGroup).vm as unknown as {
      element: HTMLElement | null
    }
    expect(exposed.element).toBe(wrapper.get('fieldset').element)
  })

  it('restores the mounted default on native form reset', async () => {
    const form = document.createElement('form')
    document.body.append(form)

    const wrapper = mount(
      defineComponent({
        components: { GhostRadioGroup, GhostRadioGroupItem },
        setup() {
          return () =>
            h(
              GhostRadioGroup,
              { defaultValue: 'a', name: 'tier' },
              {
                default: () => [
                  h(GhostRadioGroupItem, { value: 'a', id: 'radio-a' }),
                  h(GhostRadioGroupItem, { value: 'b', id: 'radio-b' }),
                ],
              },
            )
        },
      }),
      { attachTo: form },
    )

    await wrapper.get('#radio-b').setValue()
    form.reset()
    await waitForFormResetDeferral()

    expect((wrapper.get('#radio-a').element as HTMLInputElement).checked).toBe(
      true,
    )
    expect((wrapper.get('#radio-b').element as HTMLInputElement).checked).toBe(
      false,
    )

    wrapper.unmount()
    form.remove()
  })
})

describe('GhostRadioGroupItem', () => {
  it('throws when rendered outside a group', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => mount(GhostRadioGroupItem, { props: { value: 'x' } })).toThrow(
      'GhostRadioGroupItem must be used inside GhostRadioGroup',
    )
  })
})
