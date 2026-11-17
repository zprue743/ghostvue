import { mount } from '@vue/test-utils'
import { defineComponent, h, markRaw } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it, vi } from 'vitest'

import GhostLink from './GhostLink.vue'
import type { GhostLinkExposed } from './ghost-link'

const MockRouterLink = defineComponent({
  name: 'MockRouterLink',
  props: {
    to: { type: String, required: true },
    disabled: { type: Boolean, default: false },
  },
  setup(props, { slots }) {
    return () =>
      h(
        'a',
        {
          href: props.disabled ? undefined : props.to,
          'data-mock-router': '',
        },
        slots['default']?.(),
      )
  },
})

describe('GhostLink', () => {
  it('renders native anchor semantics with styling hooks', () => {
    const wrapper = mount(GhostLink, {
      attrs: { href: '/docs' },
      slots: { default: 'Read docs' },
    })

    const link = wrapper.get('a')
    expect(link.classes()).toContain('ghost-link')
    expect(link.attributes('data-part')).toBe('root')
    expect(link.attributes('href')).toBe('/docs')
    expect(link.text()).toContain('Read docs')
  })

  it('forwards native listeners to the host', () => {
    const onClick = vi.fn()
    const onAuxclick = vi.fn()
    const wrapper = mount(GhostLink, {
      attrs: { href: '/docs', onClick, onAuxclick },
      slots: { default: 'Read docs' },
    })

    const link = wrapper.get('a').element
    link.click()
    const auxEvent = new MouseEvent('auxclick', {
      button: 1,
      bubbles: true,
      cancelable: true,
    })
    link.dispatchEvent(auxEvent)

    expect(onClick).toHaveBeenCalledOnce()
    expect(onAuxclick).toHaveBeenCalledOnce()
    expect(auxEvent.defaultPrevented).toBe(false)
  })

  it('prevents activation while disabled and drops href', () => {
    const onClick = vi.fn()
    const onAuxclick = vi.fn()
    const wrapper = mount(GhostLink, {
      attrs: { href: '/docs', onClick, onAuxclick },
      props: { disabled: true },
      slots: { default: 'Read docs' },
    })

    const link = wrapper.get('a')
    link.element.click()
    const auxEvent = new MouseEvent('auxclick', {
      button: 1,
      bubbles: true,
      cancelable: true,
    })
    link.element.dispatchEvent(auxEvent)

    expect(link.attributes('href')).toBeUndefined()
    expect(link.attributes('aria-disabled')).toBe('true')
    expect(link.attributes('tabindex')).toBe('-1')
    expect(link.attributes('data-state')).toBe('disabled')
    expect(onClick).not.toHaveBeenCalled()
    expect(onAuxclick).not.toHaveBeenCalled()
    expect(auxEvent.defaultPrevented).toBe(true)
  })

  it('blocks click and auxclick on disabled component hosts that still render href', () => {
    const RouterWithHref = defineComponent({
      name: 'RouterWithHref',
      props: { to: { type: String, required: true } },
      setup(props, { slots }) {
        return () => h('a', { href: props.to }, slots['default']?.())
      },
    })
    const onClick = vi.fn()
    const onAuxclick = vi.fn()
    const wrapper = mount(GhostLink, {
      props: { as: markRaw(RouterWithHref), disabled: true },
      attrs: { to: '/settings', onClick, onAuxclick },
      slots: { default: 'Settings' },
    })

    const link = wrapper.get('a').element
    const ctrlClick = new MouseEvent('click', {
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    })
    const metaClick = new MouseEvent('click', {
      metaKey: true,
      bubbles: true,
      cancelable: true,
    })
    const middleAuxClick = new MouseEvent('auxclick', {
      button: 1,
      bubbles: true,
      cancelable: true,
    })

    link.dispatchEvent(ctrlClick)
    link.dispatchEvent(metaClick)
    link.dispatchEvent(middleAuxClick)

    expect(ctrlClick.defaultPrevented).toBe(true)
    expect(metaClick.defaultPrevented).toBe(true)
    expect(middleAuxClick.defaultPrevented).toBe(true)
    expect(onClick).not.toHaveBeenCalled()
    expect(onAuxclick).not.toHaveBeenCalled()
  })

  it('augments rel and announces new-tab intent for target=_blank', () => {
    const wrapper = mount(GhostLink, {
      attrs: {
        href: 'https://example.com',
        target: '_blank',
      },
      slots: { default: 'Example' },
    })

    const link = wrapper.get('a')
    expect(link.attributes('rel')).toBe('noopener noreferrer')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.find('[data-part="external-icon"]').exists()).toBe(true)
    expect(wrapper.text()).toMatch(/Example\s+\(Opens in new tab\)/)
    expect(wrapper.text()).not.toMatch(/ExampleOpens/)
  })

  it('composes with a router link component without importing vue-router', () => {
    const wrapper = mount(GhostLink, {
      props: { as: markRaw(MockRouterLink) },
      attrs: { to: '/settings' },
      slots: { default: 'Settings' },
    })

    const link = wrapper.get('[data-mock-router]')
    expect(link.attributes('href')).toBe('/settings')
    expect(link.classes()).toContain('ghost-link')
  })

  it('exposes the host element and focus controls', () => {
    const wrapper = mount(GhostLink, {
      attachTo: document.body,
      attrs: { href: '/docs' },
      slots: { default: 'Read' },
    })
    const exposed = wrapper.vm as unknown as GhostLinkExposed

    exposed.focus()
    expect(exposed.element).toBe(wrapper.get('a').element)
    expect(document.activeElement).toBe(exposed.element)

    exposed.blur()
    expect(document.activeElement).not.toBe(exposed.element)
    wrapper.unmount()
  })

  it('does not focus when disabled', () => {
    const wrapper = mount(GhostLink, {
      attachTo: document.body,
      attrs: { href: '/docs' },
      props: { disabled: true },
      slots: { default: 'Read' },
    })
    const exposed = wrapper.vm as unknown as GhostLinkExposed

    exposed.focus()
    expect(document.activeElement).not.toBe(wrapper.get('a').element)
    wrapper.unmount()
  })

  it('renders deterministic markup during SSR', async () => {
    const html = await renderToString(
      h(
        GhostLink,
        {
          disabled: true,
          href: '/docs',
          target: '_blank',
        },
        () => 'Read',
      ),
    )

    expect(html).toContain('class="ghost-link"')
    expect(html).toContain('aria-disabled="true"')
    expect(html).not.toContain('href=')
    expect(html).not.toContain('Opens in new tab')
  })
})
