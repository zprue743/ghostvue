import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'

import GhostKbd from './GhostKbd.vue'
import { ghostKbdNavigator } from './use-ghost-kbd'

function stubAppleNavigator() {
  return vi.spyOn(ghostKbdNavigator, 'read').mockReturnValue({
    platform: 'MacIntel',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('GhostKbd', () => {
  it('renders native kbd semantics for slot content', () => {
    const wrapper = mount(GhostKbd, { slots: { default: 'F5' } })
    const root = wrapper.get('kbd')

    expect(root.classes()).toContain('ghost-kbd')
    expect(root.attributes('data-part')).toBe('root')
    expect(root.attributes('data-platform')).toBe('pc')
    expect(root.text()).toBe('F5')
    expect(wrapper.find('[data-part="key"]').exists()).toBe(false)
  })

  it('forwards native attributes and listeners to the root kbd', () => {
    const onClick = vi.fn()
    const wrapper = mount(GhostKbd, {
      attrs: {
        'aria-label': 'Reload shortcut',
        class: 'docs-kbd',
        id: 'reload',
        lang: 'en',
        onClick,
        title: 'Reload',
      },
      slots: { default: 'R' },
    })

    const root = wrapper.get('kbd')
    root.element.click()

    expect(root.attributes('aria-label')).toBe('Reload shortcut')
    expect(root.attributes('id')).toBe('reload')
    expect(root.attributes('lang')).toBe('en')
    expect(root.attributes('title')).toBe('Reload')
    expect(root.classes()).toContain('ghost-kbd')
    expect(root.classes()).toContain('docs-kbd')
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('renders key combinations as nested kbd elements with plus separators', () => {
    const wrapper = mount(GhostKbd, {
      props: { keys: ['mod', 'k'], platform: 'pc' },
    })

    const keys = wrapper.findAll('[data-part="key"]')
    const separators = wrapper.findAll('[data-part="separator"]')

    expect(wrapper.get('kbd').element.tagName).toBe('KBD')
    expect(keys).toHaveLength(2)
    expect(keys[0]?.element.tagName).toBe('KBD')
    expect(keys[0]?.text()).toBe('Ctrl')
    expect(keys[1]?.text()).toBe('K')
    expect(separators).toHaveLength(1)
    expect(separators[0]?.text()).toBe('+')
    expect(separators[0]?.attributes('aria-hidden')).toBeUndefined()
    expect(wrapper.get('kbd').text()).toBe('Ctrl+K')
  })

  it('appends slot content after keys as extra combination content', () => {
    const wrapper = mount(GhostKbd, {
      props: { keys: ['shift'], platform: 'pc' },
      slots: { default: 'Enter' },
    })

    expect(wrapper.get('kbd').text()).toBe('Shift+Enter')
    expect(wrapper.findAll('[data-part="key"]')).toHaveLength(1)
  })

  it('uses Apple symbol labels with abbr titles when platform is apple', () => {
    const wrapper = mount(GhostKbd, {
      props: { keys: ['mod', 'alt', 'k'], platform: 'apple' },
    })

    const abbrs = wrapper.findAll('abbr')
    expect(abbrs[0]?.text()).toBe('⌘')
    expect(abbrs[0]?.attributes('title')).toBe('Command')
    expect(abbrs[1]?.text()).toBe('⌥')
    expect(abbrs[1]?.attributes('title')).toBe('Option')
    expect(wrapper.text()).toContain('K')
  })

  it('renders deterministic PC markup during SSR even with an Apple navigator stub', async () => {
    const read = stubAppleNavigator()

    const html = await renderToString(
      h(GhostKbd, { keys: ['mod', 'k'], platform: 'auto' }),
    )

    expect(read).not.toHaveBeenCalled()
    expect(html).toContain('data-platform="pc"')
    expect(html).toContain('Ctrl')
    expect(html).not.toContain('⌘')
    expect(html).toContain('data-part="key"')
  })

  it('renders explicit apple labels during SSR without reading navigator', async () => {
    const html = await renderToString(
      h(GhostKbd, { keys: 'mod', platform: 'apple' }),
    )

    expect(html).toContain('data-platform="apple"')
    expect(html).toContain('⌘')
    expect(html).toContain('title="Command"')
  })

  it('switches auto to apple after mount when navigator looks like Apple', async () => {
    const read = stubAppleNavigator()

    const wrapper = mount(GhostKbd, {
      props: { keys: 'mod', platform: 'auto' },
    })
    await nextTick()

    expect(read).toHaveBeenCalled()
    expect(wrapper.get('kbd').attributes('data-platform')).toBe('apple')
    expect(wrapper.text()).toContain('⌘')
  })

  it('keeps explicit pc labels after mount on an Apple navigator', () => {
    stubAppleNavigator()

    const wrapper = mount(GhostKbd, {
      props: { keys: 'mod', platform: 'pc' },
    })

    expect(wrapper.get('kbd').attributes('data-platform')).toBe('pc')
    expect(wrapper.text()).toBe('Ctrl')
  })
})
