import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'

import GhostAvatar from './GhostAvatar.vue'
import type { GhostAvatarExposed } from './ghost-avatar'

class MockImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  src = ''
  complete = false
  naturalWidth = 0
}

describe('GhostAvatar', () => {
  const OriginalImage = globalThis.Image

  afterEach(() => {
    globalThis.Image = OriginalImage
    vi.restoreAllMocks()
  })

  it('renders initials without src and omits data-state', () => {
    const wrapper = mount(GhostAvatar, { props: { name: 'Jane Doe' } })
    const root = wrapper.get('[data-part="root"]')

    expect(root.classes()).toContain('ghost-avatar')
    expect(root.attributes('data-state')).toBeUndefined()
    expect(wrapper.get('[data-part="fallback"]').text()).toBe('JD')
    expect(wrapper.find('[data-part="image"]').exists()).toBe(false)
  })

  it('shows loading fallback when src is provided before mount completes', () => {
    globalThis.Image = MockImage as unknown as typeof Image

    const wrapper = mount(GhostAvatar, {
      props: { src: 'https://example.com/a.png', name: 'Jane Doe' },
    })
    const root = wrapper.get('[data-part="root"]')

    expect(root.attributes('data-state')).toBe('loading')
    expect(wrapper.get('[data-part="fallback"]').text()).toBe('JD')
    expect(wrapper.find('img').exists()).toBe(false)
  })

  it('shows the image after a successful client probe', async () => {
    globalThis.Image = class extends MockImage {
      constructor() {
        super()
        queueMicrotask(() => {
          this.complete = true
          this.naturalWidth = 1
          this.onload?.()
        })
      }
    } as unknown as typeof Image

    const wrapper = mount(GhostAvatar, {
      props: {
        src: 'https://example.com/photo.png',
        name: 'Jane Doe',
        alt: 'Jane',
      },
    })

    await nextTick()
    await nextTick()

    expect(wrapper.get('[data-part="root"]').attributes('data-state')).toBe(
      'loaded',
    )
    const img = wrapper.get('[data-part="image"]')
    expect(img.attributes('src')).toBe('https://example.com/photo.png')
    expect(img.attributes('alt')).toBe('Jane')
    expect(wrapper.find('[data-part="fallback"]').exists()).toBe(false)
  })

  it('falls back when the image probe errors', async () => {
    globalThis.Image = class extends MockImage {
      constructor() {
        super()
        queueMicrotask(() => {
          this.onerror?.()
        })
      }
    } as unknown as typeof Image

    const wrapper = mount(GhostAvatar, {
      props: { src: 'https://example.com/missing.png', name: 'Jane Doe' },
    })

    await nextTick()
    await nextTick()

    expect(wrapper.get('[data-part="root"]').attributes('data-state')).toBe(
      'error',
    )
    expect(wrapper.get('[data-part="fallback"]').text()).toBe('JD')
  })

  it('uses the fallback slot', () => {
    const wrapper = mount(GhostAvatar, {
      props: { name: 'Jane Doe' },
      slots: { fallback: '<span data-testid="custom">X</span>' },
    })

    expect(wrapper.get('[data-testid="custom"]').text()).toBe('X')
  })

  it('forwards native attributes to the root host', () => {
    const wrapper = mount(GhostAvatar, {
      props: { name: 'Jane Doe', as: 'div' },
      attrs: { id: 'profile-avatar', title: 'Profile' },
    })

    const root = wrapper.get('div.ghost-avatar')
    expect(root.attributes('id')).toBe('profile-avatar')
    expect(root.attributes('title')).toBe('Profile')
  })

  it('exposes the native element after mount', () => {
    const wrapper = mount(GhostAvatar, {
      attachTo: document.body,
      props: { name: 'Jane Doe' },
    })
    const exposed = wrapper.vm as unknown as GhostAvatarExposed

    expect(exposed.element).toBe(wrapper.get('.ghost-avatar').element)
    wrapper.unmount()
    expect(exposed.element).toBeNull()
  })

  it('renders deterministic SSR markup with loading state and no img', async () => {
    const html = await renderToString(
      h(GhostAvatar, {
        src: 'https://example.com/a.png',
        name: 'Jane Doe',
      }),
    )

    expect(html).toContain('class="ghost-avatar"')
    expect(html).toContain('data-state="loading"')
    expect(html).toContain('JD')
    expect(html).not.toContain('<img')
  })
})
