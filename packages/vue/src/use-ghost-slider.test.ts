import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import type { GhostSliderValue } from './ghost-slider'
import GhostSlider from './GhostSlider.vue'

describe('useGhostSlider (via GhostSlider)', () => {
  it('snaps pointer-free writes to the configured step', async () => {
    let modelValue = 0
    const wrapper = mount(GhostSlider, {
      props: {
        modelValue,
        step: 5,
        'onUpdate:modelValue': (next: GhostSliderValue) => {
          if (typeof next === 'number') {
            modelValue = next
            void wrapper.setProps({ modelValue: next })
          }
        },
      },
      attrs: { 'aria-label': 'Gain' },
    })

    const thumb = wrapper.get('[role="slider"]')
    await thumb.trigger('keydown', { key: 'End' })
    expect(thumb.attributes('aria-valuenow')).toBe('100')
    await thumb.trigger('keydown', { key: 'ArrowLeft' })
    expect(thumb.attributes('aria-valuenow')).toBe('95')
  })

  it('does not let the low range thumb pass the high thumb', async () => {
    const modelValue: GhostSliderValue = [20, 80]
    const wrapper = mount(GhostSlider, {
      props: {
        range: true,
        modelValue,
        step: 5,
        'onUpdate:modelValue': (next: GhostSliderValue) => {
          if (Array.isArray(next)) {
            void wrapper.setProps({ modelValue: [next[0], next[1]] as const })
          }
        },
      },
      attrs: { 'aria-label': 'Band' },
    })

    const low = wrapper.findAll('[role="slider"]')[0]
    await low?.trigger('keydown', { key: 'End' })
    const high = wrapper.findAll('[role="slider"]')[1]
    expect(low?.attributes('aria-valuenow')).toBe('80')
    expect(high?.attributes('aria-valuenow')).toBe('80')
  })
})
