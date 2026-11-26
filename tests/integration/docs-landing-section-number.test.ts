import { mount, type VueWrapper } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import type {
  LandingMotionMode,
  LandingSectionId,
} from '../../apps/docs/.vitepress/theme/landing-motion'
import LandingSectionNumber from '../../apps/docs/.vitepress/theme/LandingSectionNumber.vue'

/*
 * Issue 353: the landing page's background section number. These tests cover
 * the flip state machine and the split-flap markup; how it looks and where it
 * sits are covered by the landing e2e and visual specs.
 */

function mountNumber(
  activeId: LandingSectionId = 'hero',
  motionMode: LandingMotionMode = 'timeline',
) {
  return mount(LandingSectionNumber, { props: { activeId, motionMode } })
}

function number(wrapper: VueWrapper) {
  return wrapper.get('[data-testid="landing-section-number"]')
}

function flaps(wrapper: VueWrapper) {
  return wrapper.findAll('.ghost-landing-number__flap')
}

/** Text of the fixed halves of each digit, as `top/bottom`. */
function fixedHalves(wrapper: VueWrapper): string[] {
  return wrapper.findAll('.ghost-landing-number__digit').map((digit) => {
    const halves = digit
      .findAll('.ghost-landing-number__half')
      .filter((half) => !half.classes('ghost-landing-number__flap'))
    return halves.map((half) => half.text()).join('/')
  })
}

/** Ends the running flip the way the browser does. */
async function finishFlip(wrapper: VueWrapper): Promise<void> {
  await wrapper
    .get('.ghost-landing-number__flap--in')
    .trigger('animationend', { animationName: 'ghost-landing-number-flap' })
}

describe('LandingSectionNumber', () => {
  it('renders the active section number at rest with no flaps', () => {
    const wrapper = mountNumber('progression')
    expect(number(wrapper).attributes('data-value')).toBe('03')
    expect(number(wrapper).attributes('data-flip')).toBeUndefined()
    expect(fixedHalves(wrapper)).toEqual(['0/0', '3/3'])
    expect(flaps(wrapper)).toHaveLength(0)
  })

  it('is hidden from assistive technology', () => {
    const wrapper = mountNumber()
    expect(wrapper.attributes('aria-hidden')).toBe('true')
    expect(wrapper.find('a, button, [tabindex]').exists()).toBe(false)
  })

  it('flips forward: the old top folds away and the new bottom lands', async () => {
    const wrapper = mountNumber('hero')
    await wrapper.setProps({ activeId: 'layers' })

    expect(number(wrapper).attributes('data-flip')).toBe('forward')
    expect(number(wrapper).attributes('data-value')).toBe('02')
    // New character already behind the falling flap; old one still below.
    expect(fixedHalves(wrapper)).toEqual(['0/0', '2/1'])
    const out = wrapper.get('.ghost-landing-number__flap--out')
    const landing = wrapper.get('.ghost-landing-number__flap--in')
    expect(out.classes()).toContain('ghost-landing-number__half--top')
    expect(out.text()).toBe('1')
    expect(landing.classes()).toContain('ghost-landing-number__half--bottom')
    expect(landing.text()).toBe('2')
  })

  it('flips backward as the mirror image', async () => {
    const wrapper = mountNumber('theming')
    await wrapper.setProps({ activeId: 'progression' })

    expect(number(wrapper).attributes('data-flip')).toBe('backward')
    expect(fixedHalves(wrapper)).toEqual(['0/0', '4/3'])
    const out = wrapper.get('.ghost-landing-number__flap--out')
    const landing = wrapper.get('.ghost-landing-number__flap--in')
    expect(out.classes()).toContain('ghost-landing-number__half--bottom')
    expect(out.text()).toBe('4')
    expect(landing.classes()).toContain('ghost-landing-number__half--top')
    expect(landing.text()).toBe('3')
  })

  it('gives flaps only to the digit that changes', async () => {
    const wrapper = mountNumber('hero')
    await wrapper.setProps({ activeId: 'layers' })

    const [tens, ones] = wrapper.findAll('.ghost-landing-number__digit')
    expect(tens?.findAll('.ghost-landing-number__flap')).toHaveLength(0)
    expect(ones?.findAll('.ghost-landing-number__flap')).toHaveLength(2)
  })

  it('comes to rest on the new number when the flip ends', async () => {
    const wrapper = mountNumber('hero')
    await wrapper.setProps({ activeId: 'layers' })
    await finishFlip(wrapper)

    expect(number(wrapper).attributes('data-flip')).toBeUndefined()
    expect(fixedHalves(wrapper)).toEqual(['0/0', '2/2'])
    expect(flaps(wrapper)).toHaveLength(0)
  })

  it('does not restart a running flip, then flips once to the latest section', async () => {
    const wrapper = mountNumber('hero')
    await wrapper.setProps({ activeId: 'layers' })
    const running = wrapper.get('.ghost-landing-number__flap--in').element

    // The reader keeps moving while 01 -> 02 is still in the air.
    await wrapper.setProps({ activeId: 'progression' })
    await wrapper.setProps({ activeId: 'tooling' })
    expect(number(wrapper).attributes('data-value')).toBe('02')
    expect(wrapper.get('.ghost-landing-number__flap--in').element).toBe(running)

    // One follow-up flip, straight from 02 to 06, skipping 03..05.
    await finishFlip(wrapper)
    expect(number(wrapper).attributes('data-value')).toBe('06')
    expect(number(wrapper).attributes('data-flip')).toBe('forward')
    expect(wrapper.get('.ghost-landing-number__flap--out').text()).toBe('2')
    expect(wrapper.get('.ghost-landing-number__flap--in').text()).toBe('6')
    expect(wrapper.get('.ghost-landing-number__flap--in').element).not.toBe(
      running,
    )

    await finishFlip(wrapper)
    expect(fixedHalves(wrapper)).toEqual(['0/0', '6/6'])
    expect(flaps(wrapper)).toHaveLength(0)
  })

  it('takes the follow-up direction from where the number actually is', async () => {
    const wrapper = mountNumber('layers')
    await wrapper.setProps({ activeId: 'theming' })
    // Reverses past the starting point while 02 -> 04 is running.
    await wrapper.setProps({ activeId: 'hero' })
    await finishFlip(wrapper)

    expect(number(wrapper).attributes('data-value')).toBe('01')
    expect(number(wrapper).attributes('data-flip')).toBe('backward')
  })

  it('needs no follow-up when the reader returns to the flip target', async () => {
    const wrapper = mountNumber('hero')
    await wrapper.setProps({ activeId: 'layers' })
    await wrapper.setProps({ activeId: 'progression' })
    await wrapper.setProps({ activeId: 'layers' })
    await finishFlip(wrapper)

    expect(number(wrapper).attributes('data-value')).toBe('02')
    expect(flaps(wrapper)).toHaveLength(0)
  })

  it('swaps without flaps in static mode', async () => {
    const wrapper = mountNumber('hero', 'static')
    await wrapper.setProps({ activeId: 'components' })

    expect(number(wrapper).attributes('data-value')).toBe('05')
    expect(number(wrapper).attributes('data-flip')).toBeUndefined()
    expect(fixedHalves(wrapper)).toEqual(['0/0', '5/5'])
    expect(flaps(wrapper)).toHaveLength(0)
  })

  it('finishes a running flip when motion turns static', async () => {
    const wrapper = mountNumber('hero')
    await wrapper.setProps({ activeId: 'layers' })
    await wrapper.setProps({ activeId: 'theming' })
    // Reduced motion switched on: the flaps go, so no animationend arrives.
    await wrapper.setProps({ motionMode: 'static' })

    expect(number(wrapper).attributes('data-value')).toBe('04')
    expect(fixedHalves(wrapper)).toEqual(['0/0', '4/4'])
    expect(flaps(wrapper)).toHaveLength(0)
  })
})
