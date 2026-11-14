import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  GHOST_KBD_SSR_PLATFORM,
  ghostKbdNavigator,
  isAppleNavigator,
  resolveGhostKbdKey,
  useGhostKbd,
} from './use-ghost-kbd'

function mountComposable<Value>(setup: () => Value) {
  let result!: Value
  const wrapper = mount(
    defineComponent({
      setup() {
        result = setup()
        return () => h('div')
      },
    }),
  )
  return { result, wrapper }
}

describe('resolveGhostKbdKey', () => {
  it('treats mod as the platform primary modifier and meta as Meta/Win', () => {
    expect(resolveGhostKbdKey('mod', 'pc')).toMatchObject({ label: 'Ctrl' })
    expect(resolveGhostKbdKey('mod', 'apple')).toMatchObject({
      label: '⌘',
      abbrTitle: 'Command',
    })
    expect(resolveGhostKbdKey('meta', 'pc')).toMatchObject({ label: 'Win' })
    expect(resolveGhostKbdKey('command', 'apple')).toMatchObject({
      token: 'meta',
      label: '⌘',
    })
  })

  it('uppercases a single unknown letter and preserves longer custom tokens', () => {
    expect(resolveGhostKbdKey('k', 'pc')).toMatchObject({
      token: 'k',
      label: 'K',
    })
    expect(resolveGhostKbdKey('F5', 'pc')).toMatchObject({
      token: 'f5',
      label: 'F5',
    })
  })
})

describe('isAppleNavigator', () => {
  it('detects Apple platform strings and ignores missing navigator', () => {
    expect(isAppleNavigator(undefined)).toBe(false)
    expect(isAppleNavigator({ platform: 'MacIntel', userAgent: '' })).toBe(true)
    expect(
      isAppleNavigator({
        platform: 'Win32',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0)',
      }),
    ).toBe(false)
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('useGhostKbd', () => {
  it('defaults auto to the SSR PC platform and sets root hooks', () => {
    const { result, wrapper } = mountComposable(() => useGhostKbd())

    expect(GHOST_KBD_SSR_PLATFORM).toBe('pc')
    expect(result.rootProps.value.class).toBe('ghost-kbd')
    expect(result.rootProps.value['data-part']).toBe('root')
    expect(result.rootProps.value['data-platform']).toBe('pc')
    expect(result.keyItems.value).toEqual([])
    wrapper.unmount()
  })

  it('honors an explicit apple platform without waiting for detection', () => {
    const { result, wrapper } = mountComposable(() =>
      useGhostKbd({ keys: ['mod', 'k'], platform: 'apple' }),
    )

    expect(result.resolvedPlatform.value).toBe('apple')
    expect(result.keyItems.value.map((item) => item.label)).toEqual(['⌘', 'K'])
    wrapper.unmount()
  })

  it('updates key items when the keys getter changes', () => {
    const keys = ref<string | string[]>('shift')
    const { result, wrapper } = mountComposable(() => useGhostKbd({ keys }))

    expect(result.keyItems.value).toHaveLength(1)
    keys.value = ['ctrl', 'k']
    expect(result.keyItems.value.map((item) => item.label)).toEqual([
      'Ctrl',
      'K',
    ])
    wrapper.unmount()
  })

  it('does not read navigator during setup, so SSR auto stays on PC', async () => {
    const read = vi.spyOn(ghostKbdNavigator, 'read').mockReturnValue({
      platform: 'MacIntel',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    })

    const html = await renderToString(
      h(
        defineComponent({
          setup() {
            const { rootProps, keyItems } = useGhostKbd({
              keys: 'mod',
              platform: 'auto',
            })
            return () =>
              h(
                'kbd',
                rootProps.value,
                keyItems.value.map((item) => item.label).join(),
              )
          },
        }),
      ),
    )

    expect(read).not.toHaveBeenCalled()
    expect(html).toContain('data-platform="pc"')
    expect(html).toContain('Ctrl')
  })
})
