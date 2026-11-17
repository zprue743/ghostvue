import { mount } from '@vue/test-utils'
import { h, nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'

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

  it('marks disabled thumbs inert for assistive technology', () => {
    const wrapper = mount(GhostSlider, {
      props: { disabled: true },
      attrs: { 'aria-label': 'Amount' },
    })
    const thumb = wrapper.get('[role="slider"]')
    expect(thumb.attributes('tabindex')).toBe('-1')
    expect(thumb.attributes('aria-disabled')).toBe('true')
    expect(thumb.attributes('aria-label')).toBe('Amount')
  })

  it('keeps aria-label when valueText is set', () => {
    const wrapper = mount(GhostSlider, {
      props: { valueText: '72 percent match', modelValue: 72 },
      attrs: { 'aria-label': 'Match quality' },
    })
    const thumb = wrapper.get('[role="slider"]')
    expect(thumb.attributes('aria-label')).toBe('Match quality')
    expect(thumb.attributes('aria-valuetext')).toBe('72 percent match')
  })

  it('forwards aria-labelledby to the thumb', () => {
    const wrapper = mount(GhostSlider, {
      attrs: { 'aria-labelledby': 'price-label', id: 'price-slider' },
    })
    const thumb = wrapper.get('[role="slider"]')
    expect(thumb.attributes('aria-labelledby')).toBe('price-label')
    expect(thumb.attributes('aria-label')).toBeUndefined()
    expect(
      wrapper.get('[data-part="root"]').attributes('aria-labelledby'),
    ).toBe(undefined)
  })

  it('distinguishes range thumbs when aria-labelledby is set', () => {
    const wrapper = mount(GhostSlider, {
      props: { range: true, modelValue: [25, 75] as const },
      attrs: { 'aria-labelledby': 'price-range-label' },
    })
    const [low, high] = wrapper.findAll('[role="slider"]')
    const minHintId = wrapper
      .findAll('span')
      .find((node) => node.text() === 'minimum')
      ?.attributes('id')
    const maxHintId = wrapper
      .findAll('span')
      .find((node) => node.text() === 'maximum')
      ?.attributes('id')
    if (!minHintId || !maxHintId) {
      throw new Error('expected visually hidden range end label ids')
    }
    expect(low?.attributes('aria-labelledby')).toBe(
      `price-range-label ${minHintId}`,
    )
    expect(high?.attributes('aria-labelledby')).toBe(
      `price-range-label ${maxHintId}`,
    )
    expect(low?.attributes('aria-label')).toBeUndefined()
    expect(high?.attributes('aria-label')).toBeUndefined()
  })

  it('uses aria-label suffixes for range thumbs without aria-labelledby', () => {
    const wrapper = mount(GhostSlider, {
      props: { range: true, modelValue: [20, 80] as const },
      attrs: { 'aria-label': 'Price range' },
    })
    const [low, high] = wrapper.findAll('[role="slider"]')
    expect(low?.attributes('aria-label')).toBe('Price range minimum')
    expect(high?.attributes('aria-label')).toBe('Price range maximum')
    expect(
      wrapper.findAll('span').filter((node) => node.text() === 'minimum'),
    ).toHaveLength(0)
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

  it('focuses the dragged thumb after track press for keyboard input', async () => {
    const model = ref(50)
    const wrapper = mount({
      setup() {
        return () =>
          h(GhostSlider, {
            'aria-label': 'Price',
            modelValue: model.value,
            step: 1,
            'onUpdate:modelValue': (next) => {
              if (typeof next === 'number') model.value = next
            },
          })
      },
      attachTo: document.body,
    })

    const track = wrapper.get('[data-part="track"]')
    const thumb = wrapper.get('[role="slider"]')
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
    thumb.element.setPointerCapture = vi.fn()
    thumb.element.releasePointerCapture = vi.fn()

    const focusSpy = vi.spyOn(thumb.element as HTMLElement, 'focus')
    track.element.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: 100,
        clientY: 4,
        button: 0,
        bubbles: true,
        pointerId: 1,
      }),
    )
    await nextTick()
    expect(focusSpy).toHaveBeenCalled()

    HTMLElement.prototype.focus.call(thumb.element)
    await thumb.trigger('keydown', { key: 'ArrowRight' })
    expect(model.value).toBe(51)
    wrapper.unmount()
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

    const thumb = wrapper.get('[role="slider"]')
    thumb.element.setPointerCapture = vi.fn()
    thumb.element.releasePointerCapture = vi.fn()
    track.element.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: 120,
        clientY: 4,
        button: 0,
        bubbles: true,
        pointerId: 1,
      }),
    )
    thumb.element.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 160,
        clientY: 4,
        button: 0,
        bubbles: true,
        pointerId: 1,
      }),
    )
    await nextTick()
    expect(thumb.attributes('aria-valuenow')).toBe('80')
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

  it('preserves fractional defaultValue and restores it on form reset for single sliders', async () => {
    const wrapper = mount(
      {
        setup() {
          return () =>
            h('form', [
              h(GhostSlider, {
                'aria-label': 'Opacity',
                name: 'opacity',
                min: 0,
                max: 1,
                step: 0.1,
                defaultValue: 0.2,
              }),
            ])
        },
      },
      { attachTo: document.body },
    )

    const form = wrapper.find('form').element as HTMLFormElement
    const thumb = wrapper.get('[role="slider"]')
    expect(thumb.attributes('aria-valuenow')).toBe('0.2')
    expect(new FormData(form).get('opacity')).toBe('0.2')

    await thumb.trigger('keydown', { key: 'ArrowRight' })
    expect(thumb.attributes('aria-valuenow')).toBe('0.3')
    expect(new FormData(form).get('opacity')).toBe('0.3')

    form.reset()
    await waitForFormResetDeferral()
    await nextTick()

    expect(thumb.attributes('aria-valuenow')).toBe('0.2')
    expect(new FormData(form).get('opacity')).toBe('0.2')
    wrapper.unmount()
  })

  it('preserves fractional defaultValue and restores it on form reset for range sliders', async () => {
    const wrapper = mount(
      {
        setup() {
          return () =>
            h('form', [
              h(GhostSlider, {
                'aria-label': 'Band',
                range: true,
                name: 'minBand',
                nameMax: 'maxBand',
                min: 0,
                max: 1,
                step: 0.1,
                defaultValue: [0.2, 0.7] as const,
              }),
            ])
        },
      },
      { attachTo: document.body },
    )

    const form = wrapper.find('form').element as HTMLFormElement
    const thumbs = wrapper.findAll('[role="slider"]')
    expect(thumbs[0]?.attributes('aria-valuenow')).toBe('0.2')
    expect(thumbs[1]?.attributes('aria-valuenow')).toBe('0.7')
    expect(new FormData(form).get('minBand')).toBe('0.2')
    expect(new FormData(form).get('maxBand')).toBe('0.7')

    await thumbs[0]?.trigger('keydown', { key: 'ArrowRight' })
    await thumbs[1]?.trigger('keydown', { key: 'ArrowLeft' })
    expect(thumbs[0]?.attributes('aria-valuenow')).toBe('0.3')
    expect(thumbs[1]?.attributes('aria-valuenow')).toBe('0.6')

    form.reset()
    await waitForFormResetDeferral()
    await nextTick()

    expect(thumbs[0]?.attributes('aria-valuenow')).toBe('0.2')
    expect(thumbs[1]?.attributes('aria-valuenow')).toBe('0.7')
    expect(new FormData(form).get('minBand')).toBe('0.2')
    expect(new FormData(form).get('maxBand')).toBe('0.7')
    wrapper.unmount()
  })

  it('centers thumb and vertical rail according to resolved text direction', async () => {
    const dir = ref<'ltr' | 'rtl'>('ltr')
    const wrapper = mount(
      {
        setup() {
          return () =>
            h('div', { dir: dir.value }, [
              h(GhostSlider, {
                'aria-label': 'Horizontal',
                modelValue: 50,
                'data-testid': 'horizontal',
              }),
              h(GhostSlider, {
                'aria-label': 'Vertical',
                orientation: 'vertical',
                modelValue: 50,
                'data-testid': 'vertical',
              }),
            ])
        },
      },
      { attachTo: document.body },
    )

    const hThumb = wrapper.get('[data-testid="horizontal"] [role="slider"]')
    const vThumb = wrapper.get('[data-testid="vertical"] [role="slider"]')
    const vRail = wrapper.get('[data-testid="vertical"] [data-part="rail"]')

    expect(hThumb.attributes('style')).toContain('translate(-50%, -50%)')
    expect(vThumb.attributes('style')).toContain('translate(-50%, 50%)')
    expect(vRail.attributes('style')).toContain('translateX(-50%)')

    dir.value = 'rtl'
    await nextTick()
    await nextTick()

    expect(hThumb.attributes('style')).toContain('translate(50%, -50%)')
    expect(vThumb.attributes('style')).toContain('translate(50%, 50%)')
    expect(vRail.attributes('style')).toContain('translateX(50%)')

    dir.value = 'ltr'
    await nextTick()
    await nextTick()

    expect(hThumb.attributes('style')).toContain('translate(-50%, -50%)')
    expect(vThumb.attributes('style')).toContain('translate(-50%, 50%)')
    expect(vRail.attributes('style')).toContain('translateX(-50%)')
    wrapper.unmount()
  })

  it('updates centering when dir changes reactively on the slider root', async () => {
    const dir = ref<'ltr' | 'rtl'>('ltr')
    const wrapper = mount(
      {
        setup() {
          return () =>
            h(GhostSlider, {
              'aria-label': 'Reactive root dir',
              dir: dir.value,
              modelValue: 25,
            })
        },
      },
      { attachTo: document.body },
    )

    const thumb = wrapper.get('[role="slider"]')
    expect(thumb.attributes('style')).toContain('translate(-50%, -50%)')

    dir.value = 'rtl'
    await nextTick()
    await nextTick()

    expect(thumb.attributes('style')).toContain('translate(50%, -50%)')
    wrapper.unmount()
  })

  it('supports reactive non-English messages for both range naming routes without English fallback', async () => {
    const messages = ref<{
      minimum: string
      maximum: string
      formatMinimumLabel?: (label: string) => string
      formatMaximumLabel?: (label: string) => string
    }>({
      minimum: 'mínimo',
      maximum: 'máximo',
    })

    const ariaLabelWrapper = mount(
      {
        setup() {
          return () =>
            h(GhostSlider, {
              range: true,
              defaultValue: [10, 80] as const,
              'aria-label': 'Precio',
              messages: messages.value,
            })
        },
      },
      { attachTo: document.body },
    )

    const ariaThumbs = ariaLabelWrapper.findAll('[role="slider"]')
    expect(ariaThumbs[0]?.attributes('aria-label')).toBe('Precio mínimo')
    expect(ariaThumbs[1]?.attributes('aria-label')).toBe('Precio máximo')
    expect(ariaThumbs[0]?.attributes('aria-label')).not.toContain('minimum')
    expect(ariaThumbs[1]?.attributes('aria-label')).not.toContain('maximum')

    messages.value = {
      minimum: 'cota inferior',
      maximum: 'cota superior',
      formatMinimumLabel: (label) => `Mínimo de ${label}`,
      formatMaximumLabel: (label) => `Máximo de ${label}`,
    }
    await nextTick()
    expect(ariaThumbs[0]?.attributes('aria-label')).toBe('Mínimo de Precio')
    expect(ariaThumbs[1]?.attributes('aria-label')).toBe('Máximo de Precio')

    const labelledByWrapper = mount(
      {
        setup() {
          return () =>
            h('div', [
              h('span', { id: 'price-heading' }, 'Rango de precios'),
              h(GhostSlider, {
                range: true,
                defaultValue: [20, 70] as const,
                'aria-labelledby': 'price-heading',
                messages: messages.value,
              }),
            ])
        },
      },
      { attachTo: document.body },
    )

    const labelledThumbs = labelledByWrapper.findAll('[role="slider"]')
    const minIds =
      labelledThumbs[0]?.attributes('aria-labelledby')?.split(' ') ?? []
    const maxIds =
      labelledThumbs[1]?.attributes('aria-labelledby')?.split(' ') ?? []
    expect(minIds[0]).toBe('price-heading')
    expect(maxIds[0]).toBe('price-heading')
    const minHint = labelledByWrapper.get(`#${minIds[1] ?? ''}`)
    const maxHint = labelledByWrapper.get(`#${maxIds[1] ?? ''}`)
    expect(minHint.text()).toBe('cota inferior')
    expect(maxHint.text()).toBe('cota superior')
    expect(minHint.text()).not.toBe('minimum')
    expect(maxHint.text()).not.toBe('maximum')

    messages.value = {
      minimum: 'límite bajo',
      maximum: 'límite alto',
    }
    await nextTick()
    expect(minHint.text()).toBe('límite bajo')
    expect(maxHint.text()).toBe('límite alto')

    ariaLabelWrapper.unmount()
    labelledByWrapper.unmount()
  })
})
