import { mount } from '@vue/test-utils'
import { h, nextTick, ref } from 'vue'
import { describe, expect, it } from 'vitest'

import { waitForFormResetDeferral } from './form-reset'
import GhostSlider from './GhostSlider.vue'
import type { GhostSliderExposed } from './ghost-slider'

describe('GhostSlider', () => {
  it('exposes slider thumbs with APG value attributes', () => {
    const wrapper = mount(GhostSlider, {
      props: { modelValue: 40, min: 0, max: 100 },
      attrs: { 'aria-label': 'Amount' },
    })

    const root = wrapper.get('[data-part="root"]')
    expect(root.classes()).toContain('ghost-slider')
    const thumb = wrapper.get('[role="slider"]')
    expect(thumb.attributes('aria-valuemin')).toBe('0')
    expect(thumb.attributes('aria-valuemax')).toBe('100')
    expect(thumb.attributes('aria-valuenow')).toBe('40')
    expect(thumb.attributes('tabindex')).toBe('0')
  })

  it('updates from keyboard arrows', async () => {
    const model = ref(50)
    const wrapper = mount({
      setup() {
        return () =>
          h(GhostSlider, {
            'aria-label': 'Amount',
            modelValue: model.value,
            step: 10,
            'onUpdate:modelValue': (next) => {
              if (typeof next === 'number') model.value = next
            },
          })
      },
    })

    const thumb = wrapper.get('[role="slider"]')
    await thumb.trigger('keydown', { key: 'ArrowRight' })
    expect(model.value).toBe(60)
    await thumb.trigger('keydown', { key: 'Home' })
    expect(model.value).toBe(0)
    await thumb.trigger('keydown', { key: 'End' })
    expect(model.value).toBe(100)
  })

  it('keeps range thumbs ordered', async () => {
    const model = ref<readonly [number, number]>([30, 70])
    const wrapper = mount({
      setup() {
        return () =>
          h(GhostSlider, {
            'aria-label': 'Band',
            range: true,
            step: 10,
            modelValue: model.value,
            'onUpdate:modelValue': (next) => {
              if (Array.isArray(next)) model.value = [next[0], next[1]]
            },
          })
      },
    })

    const thumbs = wrapper.findAll('[role="slider"]')
    expect(thumbs).toHaveLength(2)
    expect(thumbs[0]?.attributes('aria-valuenow')).toBe('30')
    expect(thumbs[1]?.attributes('aria-valuenow')).toBe('70')
    await thumbs[1]?.trigger('keydown', { key: 'ArrowLeft' })
    expect(model.value[1]).toBe(60)
    expect(model.value[0]).toBeLessThanOrEqual(model.value[1])
  })

  it('restores the mounted default on native form reset', async () => {
    const wrapper = mount(
      {
        setup() {
          return () =>
            h('form', [
              h(GhostSlider, {
                'aria-label': 'Amount',
                name: 'amount',
                defaultValue: 25,
              }),
            ])
        },
      },
      { attachTo: document.body },
    )

    const thumb = wrapper.get('[role="slider"]')
    await thumb.trigger('keydown', { key: 'ArrowRight' })
    expect(thumb.attributes('aria-valuenow')).toBe('26')

    const form = wrapper.find('form').element as HTMLFormElement
    form.reset()
    await waitForFormResetDeferral()
    await nextTick()

    expect(thumb.attributes('aria-valuenow')).toBe('25')
    expect(new FormData(form).get('amount')).toBe('25')
    wrapper.unmount()
  })

  it('omits tabindex on disabled thumbs', () => {
    const wrapper = mount(GhostSlider, {
      props: { disabled: true },
      attrs: { 'aria-label': 'Amount' },
    })
    expect(wrapper.get('[role="slider"]').attributes('tabindex')).toBe('-1')
  })

  it('maps vertical arrow keys to value changes', async () => {
    const model = ref(50)
    const wrapper = mount({
      setup() {
        return () =>
          h(GhostSlider, {
            'aria-label': 'Gain',
            orientation: 'vertical',
            modelValue: model.value,
            'onUpdate:modelValue': (next) => {
              if (typeof next === 'number') model.value = next
            },
          })
      },
    })
    await wrapper.get('[role="slider"]').trigger('keydown', { key: 'ArrowUp' })
    expect(model.value).toBe(51)
  })

  it('applies root aria-label to thumb sliders', () => {
    const wrapper = mount(GhostSlider, {
      attrs: { 'aria-label': 'Price' },
    })
    expect(wrapper.get('[role="slider"]').attributes('aria-label')).toBe(
      'Price',
    )
  })

  it('updates from track pointer coordinates', async () => {
    const wrapper = mount(GhostSlider, {
      attachTo: document.body,
      attrs: { 'aria-label': 'Price' },
      props: { min: 0, max: 100, step: 1 },
    })
    const track = wrapper.get('[data-part="track"]')
    track.element.getBoundingClientRect = () => ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      width: 200,
      height: 8,
      right: 200,
      bottom: 8,
      toJSON: () => ({}),
    })

    track.element.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: 120,
        clientY: 4,
        button: 0,
        bubbles: true,
      }),
    )
    await nextTick()
    expect(wrapper.get('[role="slider"]').attributes('aria-valuenow')).toBe(
      '60',
    )
    wrapper.unmount()
  })

  it('flips horizontal arrows in rtl', async () => {
    const model = ref(50)
    const wrapper = mount({
      setup() {
        return () =>
          h(
            'div',
            { dir: 'rtl' },
            h(GhostSlider, {
              'aria-label': 'Amount',
              modelValue: model.value,
              'onUpdate:modelValue': (next) => {
                if (typeof next === 'number') model.value = next
              },
            }),
          )
      },
    })
    await wrapper
      .get('[role="slider"]')
      .trigger('keydown', { key: 'ArrowLeft' })
    expect(model.value).toBe(51)
  })

  it('submits range values through paired hidden inputs', () => {
    const wrapper = mount(GhostSlider, {
      props: {
        range: true,
        modelValue: [10, 90] as const,
        name: 'min',
        nameMax: 'max',
      },
      attrs: { 'aria-label': 'Band' },
    })
    const inputs = wrapper.findAll('input[type="hidden"]')
    expect(inputs).toHaveLength(2)
    expect(inputs[0]?.attributes('name')).toBe('min')
    expect(inputs[0]?.attributes('value')).toBe('10')
    expect(inputs[1]?.attributes('name')).toBe('max')
    expect(inputs[1]?.attributes('value')).toBe('90')
  })

  it('exposes the root element from a template ref', () => {
    const host = ref<GhostSliderExposed | null>(null)
    const wrapper = mount({
      setup() {
        return () =>
          h(GhostSlider, {
            ref: host,
            'aria-label': 'Amount',
          })
      },
    })
    expect(host.value?.element).toBe(wrapper.get('[data-part="root"]').element)
  })
})
