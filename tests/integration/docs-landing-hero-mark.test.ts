import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import type { LandingMotionMode } from '../../apps/docs/.vitepress/theme/landing-motion'
import LandingHeroMark from '../../apps/docs/.vitepress/theme/LandingHeroMark.vue'

/*
 * The hero logo's twirl and wink are CSS animations that start when one
 * attribute appears (issue #354). These tests pin when that attribute is
 * present; the motion itself is covered in `tests/e2e/docs-landing.spec.ts`.
 */

function mountMark(active: boolean, motionMode: LandingMotionMode) {
  return mount(LandingHeroMark, { props: { active, motionMode } })
}

describe('LandingHeroMark', () => {
  it('renders the resting logo for the server render and reduced motion', () => {
    const mark = mountMark(true, 'static')
    expect(mark.attributes('data-landing-mark')).toBeUndefined()
  })

  it.each<LandingMotionMode>(['timeline', 'observer'])(
    'plays while the hero is active and motion is %s',
    (motionMode) => {
      const mark = mountMark(true, motionMode)
      expect(mark.attributes('data-landing-mark')).toBe('playing')
    },
  )

  it('does not play while another section is active', () => {
    const mark = mountMark(false, 'timeline')
    expect(mark.attributes('data-landing-mark')).toBeUndefined()
  })

  it('resets on leaving the hero and replays on coming back', async () => {
    const mark = mountMark(true, 'timeline')
    expect(mark.attributes('data-landing-mark')).toBe('playing')

    await mark.setProps({ active: false })
    expect(mark.attributes('data-landing-mark')).toBeUndefined()

    // Re-adding the attribute is what restarts the CSS animations.
    await mark.setProps({ active: true })
    expect(mark.attributes('data-landing-mark')).toBe('playing')
  })

  it('stops when reduced motion turns on mid-visit', async () => {
    const mark = mountMark(true, 'timeline')
    await mark.setProps({ motionMode: 'static' })
    expect(mark.attributes('data-landing-mark')).toBeUndefined()
  })

  it('exposes one labelled image and hides both faces from assistive tech', () => {
    const mark = mountMark(true, 'timeline')
    const images = mark.findAll('[role="img"]')
    expect(images).toHaveLength(1)
    expect(images[0]?.attributes('aria-label')).toBe('GhostVue Phantom V logo')

    const faces = mark.findAll('svg')
    expect(faces).toHaveLength(2)
    for (const face of faces) {
      expect(face.attributes('aria-hidden')).toBe('true')
    }
  })

  it('draws eyes and the V on the front face only', () => {
    const mark = mountMark(true, 'timeline')
    const front = mark.get('.ghost-landing-mark__face--front')
    const back = mark.get('.ghost-landing-mark__face--back')
    expect(front.findAll('circle')).toHaveLength(2)
    expect(front.findAll('path')).toHaveLength(2)
    expect(back.findAll('circle')).toHaveLength(0)
    expect(back.findAll('path')).toHaveLength(1)
    // Only one eye winks.
    expect(mark.findAll('.ghost-landing-mark__wink')).toHaveLength(1)
  })
})
