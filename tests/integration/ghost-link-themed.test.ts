import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import {
  GhostLink,
  type GhostLinkExposed,
} from '../../packages/themes/src/ghost-link'

describe('themed GhostLink', () => {
  it('renders inside a theme scope with default data hooks omitted', () => {
    const wrapper = mount(GhostLink, {
      attrs: { href: '/docs' },
      slots: { default: 'Docs' },
    })
    const root = wrapper.get('.ghost-link')

    expect(root.attributes('data-variant')).toBeUndefined()
    expect(root.attributes('data-tone')).toBeUndefined()
    expect(root.attributes('href')).toBe('/docs')
  })

  it('maps visual props to data attributes', () => {
    const wrapper = mount(GhostLink, {
      props: { variant: 'subtle', tone: 'neutral' },
      attrs: { href: '/docs' },
      slots: { default: 'Docs' },
    })
    const root = wrapper.get('.ghost-link')

    expect(root.attributes('data-variant')).toBe('subtle')
    expect(root.attributes('data-tone')).toBe('neutral')
  })

  it('keeps inline as the default variant hook', () => {
    const defaultLink = mount(GhostLink, {
      attrs: { href: '/docs' },
      slots: { default: 'Inline default' },
    })
    const explicitInline = mount(GhostLink, {
      props: { variant: 'inline' },
      attrs: { href: '/docs' },
      slots: { default: 'Inline explicit' },
    })

    expect(
      defaultLink.get('.ghost-link').attributes('data-variant'),
    ).toBeUndefined()
    expect(
      explicitInline.get('.ghost-link').attributes('data-variant'),
    ).toBeUndefined()
    defaultLink.unmount()
    explicitInline.unmount()
  })

  it('forwards expose methods to the inner link', () => {
    const wrapper = mount(GhostLink, {
      attachTo: document.body,
      attrs: { href: '/docs' },
      slots: { default: 'Docs' },
    })
    const exposed = wrapper.vm as unknown as GhostLinkExposed
    const root = wrapper.get('.ghost-link')

    exposed.focus()
    expect(exposed.element).toBe(root.element)
    expect(document.activeElement).toBe(root.element)

    exposed.blur()
    expect(document.activeElement).not.toBe(root.element)
    wrapper.unmount()
  })

  it('supports button appearance with GhostButton visual props and link disabled semantics', () => {
    const defaultButtonLink = mount(GhostLink, {
      props: { appearance: 'button' },
      attrs: { href: '/getting-started' },
      slots: { default: 'Get started' },
    })
    const defaultRoot = defaultButtonLink.get('.ghost-link')
    expect(defaultRoot.element.tagName).toBe('A')
    expect(defaultRoot.attributes('data-appearance')).toBe('button')
    expect(defaultRoot.attributes('data-variant')).toBeUndefined()
    expect(defaultRoot.attributes('data-tone')).toBeUndefined()
    expect(defaultRoot.attributes('data-size')).toBeUndefined()
    expect(defaultRoot.attributes('href')).toBe('/getting-started')

    const customButtonLink = mount(GhostLink, {
      props: {
        appearance: 'button',
        variant: 'outline',
        tone: 'danger',
        size: 'lg',
        disabled: true,
      },
      attrs: { href: '/deprecated' },
      slots: { default: 'Unavailable' },
    })
    const customRoot = customButtonLink.get('.ghost-link')
    expect(customRoot.attributes('data-appearance')).toBe('button')
    expect(customRoot.attributes('data-variant')).toBe('outline')
    expect(customRoot.attributes('data-tone')).toBe('danger')
    expect(customRoot.attributes('data-size')).toBe('lg')
    expect(customRoot.attributes('data-state')).toBe('disabled')
    expect(customRoot.attributes('aria-disabled')).toBe('true')
    expect(customRoot.attributes('tabindex')).toBe('-1')
    expect(customRoot.attributes('href')).toBeUndefined()

    defaultButtonLink.unmount()
    customButtonLink.unmount()
  })
})
