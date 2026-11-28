import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import ActionBar from '../../examples/button/action-bar.vue'

function buttonNamed(wrapper: ReturnType<typeof mount>, name: string) {
  const button = wrapper
    .findAll('button')
    .find((candidate) => candidate.text() === name)
  if (!button) throw new Error(`No button named ${name}`)
  return button
}

describe('button/action-bar example', () => {
  beforeEach(() => {
    // Only fake setTimeout/clearTimeout so jsdom's internal setImmediate task
    // queue (used during focus and DOM updates in jsdom 31+) does not inflate
    // getTimerCount().
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders primary, secondary, and destructive actions in that hierarchy', () => {
    const wrapper = mount(ActionBar)
    const publish = buttonNamed(wrapper, 'Publish')
    const save = buttonNamed(wrapper, 'Save draft')
    const discard = buttonNamed(wrapper, 'Discard changes')

    // Solid accent is the default treatment, so the primary has no override.
    expect(publish.attributes('data-variant')).toBeUndefined()
    expect(publish.attributes('data-tone')).toBeUndefined()
    expect(save.attributes('data-variant')).toBe('outline')
    expect(save.attributes('data-tone')).toBe('neutral')
    expect(discard.attributes('data-variant')).toBe('ghost')
    expect(discard.attributes('data-tone')).toBe('danger')
    for (const button of [publish, save, discard]) {
      expect(button.attributes('type')).toBe('button')
    }
  })

  it('reports save and discard results in a polite status', async () => {
    const wrapper = mount(ActionBar)
    const status = wrapper.get('[role="status"]')
    expect(status.text()).toBe('Draft saved at 10:42')

    await buttonNamed(wrapper, 'Save draft').trigger('click')
    expect(status.text()).toBe('Draft saved at 10:43')

    await buttonNamed(wrapper, 'Discard changes').trigger('click')
    expect(status.text()).toBe('Changes discarded')
  })

  it('keeps Publish focusable and blocks repeat activation while pending', async () => {
    const wrapper = mount(ActionBar, { attachTo: document.body })
    const publish = buttonNamed(wrapper, 'Publish')
    const status = wrapper.get('[role="status"]')

    await publish.trigger('click')
    expect(publish.attributes('aria-busy')).toBe('true')
    expect(publish.attributes('aria-disabled')).toBe('true')
    expect(publish.attributes('disabled')).toBeUndefined()
    expect(publish.text()).toBe('Publish')
    expect(status.text()).toBe('Publishing to 3 channels…')

    publish.element.focus()
    expect(document.activeElement).toBe(publish.element)

    // A second click while pending must not schedule another publish.
    await publish.trigger('click')
    expect(vi.getTimerCount()).toBe(1)
    vi.advanceTimersByTime(1500)
    await nextTick()
    expect(publish.attributes('aria-busy')).toBeUndefined()
    expect(status.text()).toBe('Published to 3 channels')
    expect(vi.getTimerCount()).toBe(0)
    wrapper.unmount()
  })

  it('clears a pending publish when unmounted', async () => {
    const wrapper = mount(ActionBar)
    await buttonNamed(wrapper, 'Publish').trigger('click')
    expect(vi.getTimerCount()).toBe(1)
    wrapper.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('applies the size prop to every action and loading to Publish only', () => {
    const wrapper = mount(ActionBar, { props: { size: 'lg', loading: true } })
    for (const button of wrapper.findAll('button')) {
      expect(button.attributes('data-size')).toBe('lg')
    }
    expect(buttonNamed(wrapper, 'Publish').attributes('aria-busy')).toBe('true')
    expect(
      buttonNamed(wrapper, 'Save draft').attributes('aria-busy'),
    ).toBeUndefined()
  })
})
