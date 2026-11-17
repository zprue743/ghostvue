import { mount } from '@vue/test-utils'
import { h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it, vi } from 'vitest'

import GhostButton from './GhostButton.vue'
import type { GhostButtonExposed } from './ghost-button'

describe('GhostButton', () => {
  it('renders native button semantics and defaults to a non-submitting type', () => {
    const wrapper = mount(GhostButton, { slots: { default: 'Save' } })

    expect(wrapper.get('button').attributes('type')).toBe('button')
    expect(wrapper.get('button').classes()).toContain('ghost-button')
    expect(wrapper.get('button').attributes('data-part')).toBe('root')
    expect(wrapper.text()).toBe('Save')
  })

  // The styling contract (docs/architecture/styling.md): data-part and
  // data-state are the public styling API. Absent data-state means the idle
  // state, so `[data-state]` selectors never match an idle button. The
  // manifest cross-check lives in tests/integration/component-manifest.test.ts.
  it('exposes the documented data-part and data-state hooks in every state', () => {
    const cases = [
      { props: {}, state: undefined, disabled: undefined },
      { props: { disabled: true }, state: 'disabled', disabled: '' },
      { props: { loading: true }, state: 'loading', disabled: undefined },
      // Loading wins data-state; native disabled still reports unavailability.
      {
        props: { disabled: true, loading: true },
        state: 'loading',
        disabled: '',
      },
    ] as const

    for (const { props, state, disabled } of cases) {
      const button = mount(GhostButton, {
        props,
        slots: { default: 'Save' },
      }).get('button')

      expect(button.attributes('data-part')).toBe('root')
      expect(button.attributes('data-state')).toBe(state)
      expect(button.attributes('disabled')).toBe(disabled)
      // Button has no extra data-* hooks; disabled is native plus data-state.
      expect(button.attributes('data-disabled')).toBeUndefined()
    }
  })

  it('forwards native attributes and listeners to the button', () => {
    const onClick = vi.fn()
    const wrapper = mount(GhostButton, {
      attrs: {
        'aria-describedby': 'save-help',
        class: 'action',
        formaction: '/settings',
        name: 'intent',
        onClick,
        value: 'save',
      },
      slots: { default: 'Save' },
    })

    const button = wrapper.get('button')
    button.element.click()

    expect(button.attributes('aria-describedby')).toBe('save-help')
    expect(button.attributes('formaction')).toBe('/settings')
    expect(button.attributes('name')).toBe('intent')
    expect(button.attributes('value')).toBe('save')
    expect(button.classes()).toContain('ghost-button')
    expect(button.classes()).toContain('action')
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('prevents activation while disabled', () => {
    const onClick = vi.fn()
    const wrapper = mount(GhostButton, {
      attrs: { onClick },
      props: { disabled: true },
      slots: { default: 'Save' },
    })

    const button = wrapper.get('button')
    button.element.click()

    expect(button.attributes()).toHaveProperty('disabled')
    expect(button.attributes('data-state')).toBe('disabled')
    expect(onClick).not.toHaveBeenCalled()
  })

  it('prevents loading activation without discarding focus', async () => {
    const onClick = vi.fn()
    const wrapper = mount(GhostButton, {
      attachTo: document.body,
      attrs: { onClick },
      slots: { default: 'Save' },
    })
    const button = wrapper.get('button')

    button.element.focus()
    await wrapper.setProps({ loading: true })
    button.element.click()

    expect(button.attributes()).not.toHaveProperty('disabled')
    expect(button.attributes('aria-disabled')).toBe('true')
    expect(button.attributes('data-state')).toBe('loading')
    expect(document.activeElement).toBe(button.element)
    expect(onClick).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('prevents native form submission while loading', () => {
    const onSubmit = vi.fn((event: Event) => {
      event.preventDefault()
    })
    const wrapper = mount({
      setup() {
        return () =>
          h('form', { onSubmit }, [
            h(GhostButton, { loading: true, type: 'submit' }, () => 'Save'),
          ])
      },
    })

    wrapper.get('button').element.click()

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('marks loading state without replacing the accessible content', () => {
    const wrapper = mount(GhostButton, {
      props: { loading: true },
      slots: { default: 'Save changes' },
    })

    const button = wrapper.get('button')
    expect(button.attributes('aria-busy')).toBe('true')
    expect(button.attributes('aria-disabled')).toBe('true')
    expect(button.attributes('data-state')).toBe('loading')
    expect(button.text()).toBe('Save changes')
  })

  it('supports an icon-only accessible name through forwarded attributes', () => {
    const wrapper = mount(GhostButton, {
      attrs: { 'aria-label': 'Close dialog' },
      slots: { default: '<svg aria-hidden="true"></svg>' },
    })

    expect(wrapper.get('button').attributes('aria-label')).toBe('Close dialog')
  })

  it('exposes the native element and focus controls', () => {
    const wrapper = mount(GhostButton, {
      attachTo: document.body,
      slots: { default: 'Save' },
    })
    const exposed = wrapper.vm as unknown as GhostButtonExposed

    exposed.focus()
    expect(exposed.element).toBe(wrapper.get('button').element)
    expect(document.activeElement).toBe(exposed.element)

    exposed.blur()
    expect(document.activeElement).not.toBe(exposed.element)
    wrapper.unmount()
  })

  it('renders deterministic native markup during SSR', async () => {
    const html = await renderToString(
      h(GhostButton, { disabled: true, type: 'submit' }),
    )

    expect(html).toContain('class="ghost-button"')
    expect(html).toContain('type="submit"')
    expect(html).toContain('disabled')
    expect(html).not.toContain('aria-busy')
  })
})
