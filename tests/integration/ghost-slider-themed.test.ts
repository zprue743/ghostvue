import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'

import {
  GhostSlider,
  type GhostSliderExposed,
} from '../../packages/themes/src/index'

describe('themed GhostSlider', () => {
  it('scopes recipe CSS and forwards v-model updates', async () => {
    const wrapper = mount(GhostSlider, {
      props: {
        modelValue: 30,
        size: 'sm',
        tone: 'danger',
        'aria-label': 'Gain',
        'onUpdate:modelValue': (next) => {
          if (typeof next === 'number') {
            void wrapper.setProps({ modelValue: next })
          }
        },
      },
    })
    const scope = wrapper.get('span')
    const root = wrapper.get('[data-part="root"]')

    expect(scope.classes()).toContain('ghost-themed-scope')
    expect(root.attributes('data-size')).toBe('sm')
    expect(root.attributes('data-tone')).toBe('danger')

    await wrapper
      .get('[role="slider"]')
      .trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.get('[role="slider"]').attributes('aria-valuenow')).toBe(
      '31',
    )
  })

  it('omits default size and tone data attributes', () => {
    const wrapper = mount(GhostSlider, {
      props: { modelValue: 10, 'aria-label': 'Level' },
    })
    const root = wrapper.get('[data-part="root"]')

    expect(root.attributes('data-size')).toBeUndefined()
    expect(root.attributes('data-tone')).toBeUndefined()
  })

  it('forwards focus, blur, and value from the unstyled instance', async () => {
    const host = ref<GhostSliderExposed | null>(null)
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostSlider, {
              ref: host,
              modelValue: 20,
              'aria-label': 'Fader',
            })
        },
      }),
      { attachTo: document.body },
    )
    await nextTick()
    expect(host.value?.value).toBe(20)
    host.value?.focus()
    host.value?.blur()
    wrapper.unmount()
  })

  it('forwards range mode and external form association', () => {
    const wrapper = mount(GhostSlider, {
      props: {
        range: true,
        modelValue: [5, 95] as const,
        name: 'low',
        nameMax: 'high',
        form: 'filter-form',
        'aria-label': 'Budget band',
      },
    })
    const inputs = wrapper.findAll('input[type="hidden"]')
    expect(inputs[0]?.attributes('form')).toBe('filter-form')
    expect(inputs).toHaveLength(2)
  })

  it('exposes the unstyled root through the themed export', () => {
    const component = ref<GhostSliderExposed | null>(null)
    const host = defineComponent({
      setup: () => () =>
        h(GhostSlider, {
          ref: component,
          'aria-label': 'Level',
          modelValue: 40,
        }),
    })
    const wrapper = mount(host)
    const exposed = component.value
    expect(exposed?.element).toBe(wrapper.get('[data-part="root"]').element)
    expect(exposed?.element).not.toBe(wrapper.element)
    wrapper.unmount()
    expect(exposed?.element).toBeNull()
  })
})
