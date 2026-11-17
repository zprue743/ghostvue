import { mount } from '@vue/test-utils'
import { createSSRApp, defineComponent, h, nextTick, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useScrollLock } from './use-scroll-lock'

const attached: ReturnType<typeof mount>[] = []

afterEach(() => {
  for (const wrapper of attached) {
    wrapper.unmount()
  }
  attached.length = 0
  document.body.removeAttribute('style')
  document.documentElement.removeAttribute('style')
  vi.restoreAllMocks()
})

function mountLock(enabled: () => boolean) {
  const wrapper = mount(
    defineComponent({
      setup() {
        useScrollLock(enabled)
        return () => h('div', 'Lock host')
      },
    }),
    { attachTo: document.body },
  )
  attached.push(wrapper)
  return wrapper
}

describe('useScrollLock', () => {
  it('does not access window or document during SSR setup', async () => {
    const getComputedStyleSpy = vi.spyOn(window, 'getComputedStyle')
    const setPropertySpy = vi.spyOn(document.body.style, 'setProperty')

    const Comp = defineComponent({
      setup() {
        useScrollLock(true)
        return () => h('div', 'SSR')
      },
    })

    const html = await renderToString(createSSRApp(Comp))
    expect(html).toContain('SSR')
    expect(document.body.style.overflow).toBe('')
    expect(getComputedStyleSpy).not.toHaveBeenCalled()
    expect(setPropertySpy).not.toHaveBeenCalled()
  })

  it('locks body overflow on enable and restores original inline styles exactly', async () => {
    document.body.setAttribute(
      'style',
      'color: rgb(10, 20, 30); overflow: auto !important; padding-right: 12px;',
    )
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1024)
    vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(
      1009,
    )

    const enabled = ref(false)
    mountLock(() => enabled.value)

    expect(document.body.style.overflow).toBe('auto')
    expect(document.body.style.paddingRight).toBe('12px')

    enabled.value = true
    await nextTick()
    expect(document.body.style.overflow).toBe('hidden')
    // Existing 12px inline padding + 15px scrollbar compensation.
    expect(document.body.style.paddingRight).toBe('27px')
    expect(document.body.style.color).toBe('rgb(10, 20, 30)')

    enabled.value = false
    await nextTick()
    expect(document.body.style.getPropertyValue('overflow')).toBe('auto')
    expect(document.body.style.getPropertyPriority('overflow')).toBe(
      'important',
    )
    expect(document.body.style.paddingRight).toBe('12px')
    expect(document.body.style.color).toBe('rgb(10, 20, 30)')
  })

  it('removes the style attribute when body originally had none', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(800)
    vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(
      785,
    )

    const enabled = ref(true)
    const wrapper = mountLock(() => enabled.value)

    expect(document.body.style.overflow).toBe('hidden')
    expect(document.body.style.paddingRight).toBe('15px')

    wrapper.unmount()
    expect(document.body.hasAttribute('style')).toBe(false)
  })

  it('ref-counts across nested users and restores only on the final unlock', async () => {
    document.body.style.overflow = 'scroll'
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1000)
    vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(
      984,
    )

    const first = ref(true)
    const second = ref(true)

    const firstWrapper = mountLock(() => first.value)
    const secondWrapper = mountLock(() => second.value)

    expect(document.body.style.overflow).toBe('hidden')
    expect(document.body.style.paddingRight).toBe('16px')

    // Unlocking the second user keeps the lock active without recomputing padding.
    second.value = false
    await nextTick()
    expect(document.body.style.overflow).toBe('hidden')
    expect(document.body.style.paddingRight).toBe('16px')

    // Re-enabling and unmounting the second user still preserves the first lock.
    second.value = true
    await nextTick()
    secondWrapper.unmount()
    expect(document.body.style.overflow).toBe('hidden')
    expect(document.body.style.paddingRight).toBe('16px')

    // Unmounting an already-disabled user must not double-decrement.
    const disabledWrapper = mountLock(() => false)
    disabledWrapper.unmount()
    expect(document.body.style.overflow).toBe('hidden')

    firstWrapper.unmount()
    expect(document.body.style.overflow).toBe('scroll')
    expect(document.body.style.paddingRight).toBe('')
  })

  it('skips padding-right compensation when documentElement has scrollbar-gutter: stable', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1200)
    vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(
      1185,
    )
    const originalGetComputedStyle = window.getComputedStyle.bind(window)
    vi.spyOn(window, 'getComputedStyle').mockImplementation((target) => {
      const style = originalGetComputedStyle(target)
      if (target === document.documentElement) {
        return {
          scrollbarGutter: 'stable',
          getPropertyValue: (prop: string) =>
            prop === 'scrollbar-gutter'
              ? 'stable'
              : style.getPropertyValue(prop),
        } as unknown as CSSStyleDeclaration
      }
      return style
    })

    const wrapper = mountLock(() => true)
    expect(document.body.style.overflow).toBe('hidden')
    expect(document.body.style.paddingRight).toBe('')

    wrapper.unmount()
    expect(document.body.hasAttribute('style')).toBe(false)
  })

  it('skips padding-right compensation when scrollbar-gutter: stable is set on root inline style', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1200)
    vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(
      1185,
    )
    document.documentElement.style.setProperty(
      'scrollbar-gutter',
      'stable both-edges',
    )

    const wrapper = mountLock(() => true)
    expect(document.body.style.overflow).toBe('hidden')
    expect(document.body.style.paddingRight).toBe('')

    wrapper.unmount()
  })

  it('skips padding-right when scrollbar width is zero', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1000)
    vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(
      1000,
    )

    const wrapper = mountLock(() => true)
    expect(document.body.style.overflow).toBe('hidden')
    expect(document.body.style.paddingRight).toBe('')
    wrapper.unmount()
  })

  it('locks documentElement instead of body when html has overflow-y: scroll and restores inline properties and priorities', async () => {
    document.documentElement.setAttribute(
      'style',
      'color: rgb(1, 2, 3); overflow-y: scroll !important; padding-right: 8px !important;',
    )
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1200)
    vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(
      1185,
    )

    const enabled = ref(false)
    mountLock(() => enabled.value)

    enabled.value = true
    await nextTick()

    expect(document.body.hasAttribute('style')).toBe(false)
    expect(document.documentElement.style.overflow).toBe('hidden')
    expect(document.documentElement.style.paddingRight).toBe('23px')
    expect(document.documentElement.style.color).toBe('rgb(1, 2, 3)')

    enabled.value = false
    await nextTick()

    expect(document.documentElement.style.getPropertyValue('overflow-y')).toBe(
      'scroll',
    )
    expect(
      document.documentElement.style.getPropertyPriority('overflow-y'),
    ).toBe('important')
    expect(document.documentElement.style.getPropertyValue('overflow-x')).toBe(
      '',
    )
    expect(
      document.documentElement.style.getPropertyValue('padding-right'),
    ).toBe('8px')
    expect(
      document.documentElement.style.getPropertyPriority('padding-right'),
    ).toBe('important')
    expect(document.documentElement.style.color).toBe('rgb(1, 2, 3)')
  })

  it('locks documentElement when root computed overflow-y is scroll without inline style and removes style attribute on release', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1000)
    vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(
      985,
    )
    const originalGetComputedStyle = window.getComputedStyle.bind(window)
    vi.spyOn(window, 'getComputedStyle').mockImplementation((target) => {
      const style = originalGetComputedStyle(target)
      if (target === document.documentElement) {
        return {
          overflowX: 'visible',
          overflowY: 'scroll',
          paddingRight: '0px',
          scrollbarGutter: '',
          getPropertyValue: (prop: string) => {
            if (prop === 'overflow-x') return 'visible'
            if (prop === 'overflow-y') return 'scroll'
            if (prop === 'padding-right') return '0px'
            if (prop === 'scrollbar-gutter') return ''
            return style.getPropertyValue(prop)
          },
        } as unknown as CSSStyleDeclaration
      }
      return style
    })

    const wrapper = mountLock(() => true)
    expect(document.body.hasAttribute('style')).toBe(false)
    expect(document.documentElement.style.overflow).toBe('hidden')
    expect(document.documentElement.style.paddingRight).toBe('15px')

    wrapper.unmount()
    expect(document.documentElement.hasAttribute('style')).toBe(false)
  })

  it('locks documentElement when root has non-visible overflow-x and preserves out-of-order ref counting', () => {
    document.documentElement.style.setProperty('overflow-x', 'hidden')
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1000)
    vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(
      984,
    )

    const firstWrapper = mountLock(() => true)
    const secondWrapper = mountLock(() => true)

    expect(document.body.hasAttribute('style')).toBe(false)
    expect(document.documentElement.style.overflow).toBe('hidden')
    expect(document.documentElement.style.paddingRight).toBe('16px')

    // Out-of-order release: first unlocks before second.
    firstWrapper.unmount()
    expect(document.documentElement.style.overflow).toBe('hidden')
    expect(document.documentElement.style.paddingRight).toBe('16px')

    secondWrapper.unmount()
    expect(document.documentElement.style.getPropertyValue('overflow-x')).toBe(
      'hidden',
    )
    expect(document.documentElement.style.getPropertyValue('overflow-y')).toBe(
      '',
    )
    expect(document.documentElement.style.paddingRight).toBe('')
  })

  it('skips padding-right compensation on documentElement when scrollbar-gutter: stable is set', () => {
    document.documentElement.style.setProperty('overflow-y', 'scroll')
    document.documentElement.style.setProperty('scrollbar-gutter', 'stable')
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1200)
    vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(
      1185,
    )

    const wrapper = mountLock(() => true)
    expect(document.documentElement.style.overflow).toBe('hidden')
    expect(document.documentElement.style.paddingRight).toBe('')
    expect(document.body.hasAttribute('style')).toBe(false)

    wrapper.unmount()
    expect(document.documentElement.style.getPropertyValue('overflow-y')).toBe(
      'scroll',
    )
    expect(
      document.documentElement.style.getPropertyValue('scrollbar-gutter'),
    ).toBe('stable')
  })
})
