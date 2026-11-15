import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import GhostAvatar from './GhostAvatar.vue'
import { deriveGhostAvatarInitials } from './use-ghost-avatar'

class DeferredImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  src = ''
  complete = false
  naturalWidth = 0
}

describe('deriveGhostAvatarInitials', () => {
  it('returns empty for blank input', () => {
    expect(deriveGhostAvatarInitials('')).toBe('')
    expect(deriveGhostAvatarInitials('   ')).toBe('')
  })

  it('uses two words when present', () => {
    expect(deriveGhostAvatarInitials('Jane Doe')).toBe('JD')
  })

  it('uses the first two code points for a single word', () => {
    expect(deriveGhostAvatarInitials('Ghost')).toBe('GH')
  })

  it('does not split non-BMP code points across words', () => {
    expect(deriveGhostAvatarInitials('𠮷 太郎')).toBe('𠮷太')
    expect(deriveGhostAvatarInitials('😀 Smith')).toBe('😀S')
  })
})

describe('useGhostAvatar image probe', () => {
  const OriginalImage = globalThis.Image
  const created: DeferredImage[] = []

  afterEach(() => {
    globalThis.Image = OriginalImage
    created.length = 0
    vi.restoreAllMocks()
  })

  function installDeferredImages(): void {
    globalThis.Image = class {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      src = ''
      complete = false
      naturalWidth = 0

      constructor() {
        created.push(this)
      }
    } as unknown as typeof Image
  }

  const ProbedAvatar = defineComponent({
    props: {
      src: { type: String, required: true },
    },
    setup(props) {
      return () => h(GhostAvatar, { src: props.src, name: 'Avatar' })
    },
  })

  it('ignores stale onload when src changes before the prior probe finishes', async () => {
    installDeferredImages()

    const wrapper = mount(ProbedAvatar, {
      props: { src: 'https://example.com/a.png' },
    })

    expect(created).toHaveLength(1)
    const first = created[0]
    if (!first) throw new Error('expected first image probe')
    expect(wrapper.get('[data-part="root"]').attributes('data-state')).toBe(
      'loading',
    )

    await wrapper.setProps({ src: 'https://example.com/b.png' })
    expect(created).toHaveLength(2)
    expect(wrapper.get('[data-part="root"]').attributes('data-state')).toBe(
      'loading',
    )

    const staleOnload = first.onload
    staleOnload?.()
    await nextTick()
    expect(wrapper.get('[data-part="root"]').attributes('data-state')).toBe(
      'loading',
    )
    expect(wrapper.find('img').exists()).toBe(false)

    const second = created[1]
    if (!second) throw new Error('expected second image probe')
    second.onerror?.()
    await nextTick()
    expect(wrapper.get('[data-part="root"]').attributes('data-state')).toBe(
      'error',
    )

    wrapper.unmount()
  })

  it('applies error only for the active src after an earlier probe had loaded', async () => {
    installDeferredImages()

    const wrapper = mount(ProbedAvatar, {
      props: { src: 'https://example.com/a.png' },
    })

    const first = created[0]
    if (!first) throw new Error('expected first image probe')
    first.complete = true
    first.naturalWidth = 1
    first.onload?.()
    await nextTick()

    expect(wrapper.get('[data-part="root"]').attributes('data-state')).toBe(
      'loaded',
    )

    await wrapper.setProps({ src: 'https://example.com/b.png' })
    expect(wrapper.get('[data-part="root"]').attributes('data-state')).toBe(
      'loading',
    )

    const second = created[1]
    if (!second) throw new Error('expected second image probe')
    second.onerror?.()
    await nextTick()

    expect(wrapper.get('[data-part="root"]').attributes('data-state')).toBe(
      'error',
    )
    expect(wrapper.find('img').exists()).toBe(false)

    wrapper.unmount()
  })
})
