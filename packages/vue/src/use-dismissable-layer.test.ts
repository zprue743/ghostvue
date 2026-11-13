import { mount } from '@vue/test-utils'
import { createSSRApp, defineComponent, h, nextTick, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  useDismissableLayer,
  type DismissReason,
} from './use-dismissable-layer'

const attached: ReturnType<typeof mount>[] = []

afterEach(() => {
  for (const wrapper of attached) {
    wrapper.unmount()
  }
  attached.length = 0
})

function mountLayer(setup: () => unknown, render: () => ReturnType<typeof h>) {
  const wrapper = mount(
    defineComponent({
      setup() {
        setup()
        return render
      },
    }),
    { attachTo: document.body },
  )
  attached.push(wrapper)
  return wrapper
}

function pressKey(
  key: string,
  options: { defaultPrevented?: boolean; isComposing?: boolean } = {},
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    isComposing: options.isComposing ?? false,
  })
  if (options.defaultPrevented) {
    event.preventDefault()
  }
  document.dispatchEvent(event)
  return event
}

function pointerDown(target: EventTarget): PointerEvent {
  const event = new PointerEvent('pointerdown', {
    bubbles: true,
    cancelable: true,
  })
  target.dispatchEvent(event)
  return event
}

describe('useDismissableLayer', () => {
  it('does not attach document listeners during SSR renderToString', async () => {
    const add = vi.spyOn(document, 'addEventListener')
    const onDismiss = vi.fn()

    const Comp = defineComponent({
      setup() {
        const layer = ref<HTMLElement | null>(null)
        useDismissableLayer(layer, { onDismiss })
        return () => h('div', { ref: layer }, 'Overlay')
      },
    })

    const html = await renderToString(createSSRApp(Comp))
    expect(html).toContain('Overlay')
    expect(add).not.toHaveBeenCalledWith(
      'keydown',
      expect.any(Function),
      expect.anything(),
    )
    expect(add).not.toHaveBeenCalledWith(
      'pointerdown',
      expect.any(Function),
      expect.anything(),
    )
    expect(onDismiss).not.toHaveBeenCalled()
    add.mockRestore()
  })

  it('dismisses on Escape and ignores non-Escape, prevented, or composing events', () => {
    const layer = ref<HTMLElement | null>(null)
    const reasons: DismissReason[] = []
    const onDismiss = vi.fn((reason: DismissReason) => {
      reasons.push(reason)
    })

    mountLayer(
      () => {
        useDismissableLayer(layer, { onDismiss })
      },
      () => h('div', { ref: layer }, [h('button', { type: 'button' }, 'In')]),
    )

    pressKey('Enter')
    pressKey('Escape', { defaultPrevented: true })
    pressKey('Escape', { isComposing: true })
    expect(onDismiss).not.toHaveBeenCalled()

    pressKey('Escape')
    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect(reasons).toEqual(['escape'])
  })

  it('dismisses on pointerdown outside the layer but not inside it', () => {
    const layer = ref<HTMLElement | null>(null)
    const onDismiss = vi.fn()

    const wrapper = mountLayer(
      () => {
        useDismissableLayer(layer, { onDismiss })
      },
      () =>
        h('div', { ref: layer, 'data-testid': 'layer' }, [
          h('button', { type: 'button', 'data-testid': 'inside' }, 'Inside'),
        ]),
    )

    pointerDown(wrapper.get('[data-testid="inside"]').element)
    pointerDown(wrapper.get('[data-testid="layer"]').element)
    expect(onDismiss).not.toHaveBeenCalled()

    const outside = document.createElement('button')
    document.body.append(outside)
    pointerDown(outside)
    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect(onDismiss).toHaveBeenCalledWith(
      'outside-pointer',
      expect.any(PointerEvent),
    )
    outside.remove()
  })

  it('never counts elements in ignore (including trigger descendants) as outside', async () => {
    const layer = ref<HTMLElement | null>(null)
    const trigger = ref<HTMLElement | null>(null)
    const extraIgnored = ref<HTMLElement | null>(null)
    const includeExtra = ref(false)
    const onDismiss = vi.fn()

    const wrapper = mountLayer(
      () => {
        useDismissableLayer(layer, {
          onDismiss,
          ignore: () =>
            includeExtra.value ? [trigger, extraIgnored] : trigger,
        })
      },
      () =>
        h('div', [
          h('button', { ref: trigger, type: 'button' }, [
            h('span', { 'data-testid': 'trigger-icon' }, 'Toggle'),
          ]),
          h(
            'button',
            { ref: extraIgnored, type: 'button', 'data-testid': 'extra' },
            'Extra',
          ),
          h('div', { ref: layer, 'data-testid': 'layer' }, 'Panel'),
        ]),
    )

    pointerDown(wrapper.get('[data-testid="trigger-icon"]').element)
    expect(onDismiss).not.toHaveBeenCalled()

    pointerDown(wrapper.get('[data-testid="extra"]').element)
    expect(onDismiss).toHaveBeenCalledTimes(1)

    onDismiss.mockClear()
    includeExtra.value = true
    await nextTick()
    pointerDown(wrapper.get('[data-testid="extra"]').element)
    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('respects reactive disableEscape and disableOutsidePointer options', async () => {
    const layer = ref<HTMLElement | null>(null)
    const disableEscape = ref(true)
    const disableOutsidePointer = ref(true)
    const onDismiss = vi.fn()

    mountLayer(
      () => {
        useDismissableLayer(layer, {
          onDismiss,
          disableEscape,
          disableOutsidePointer,
        })
      },
      () => h('div', { ref: layer }, 'Layer'),
    )

    pressKey('Escape')
    pointerDown(document.body)
    expect(onDismiss).not.toHaveBeenCalled()

    disableEscape.value = false
    disableOutsidePointer.value = false
    await nextTick()

    pressKey('Escape')
    pointerDown(document.body)
    expect(onDismiss).toHaveBeenCalledTimes(2)
  })

  it('dismisses only the topmost layer in a stack and blocks fallthrough when disabled', async () => {
    const outer = ref<HTMLElement | null>(null)
    const inner = ref<HTMLElement | null>(null)
    const innerOpen = ref(true)
    const innerDisableEscape = ref(false)
    const onOuterDismiss = vi.fn()
    const onInnerDismiss = vi.fn()

    const wrapper = mount(
      defineComponent({
        setup() {
          useDismissableLayer(outer, { onDismiss: onOuterDismiss })
          useDismissableLayer(inner, {
            onDismiss: onInnerDismiss,
            disableEscape: innerDisableEscape,
          })
          return () =>
            h('div', { ref: outer, 'data-testid': 'outer' }, [
              h(
                'button',
                { type: 'button', 'data-testid': 'outer-btn' },
                'Out',
              ),
              innerOpen.value
                ? h('div', { ref: inner, 'data-testid': 'inner' }, 'Inner')
                : null,
            ])
        },
      }),
      { attachTo: document.body },
    )
    attached.push(wrapper)

    // Escape closes only the topmost layer.
    pressKey('Escape')
    expect(onInnerDismiss).toHaveBeenCalledTimes(1)
    expect(onOuterDismiss).not.toHaveBeenCalled()

    // Even when top layer disables Escape, Escape must not leak to lower layers.
    innerDisableEscape.value = true
    await nextTick()
    pressKey('Escape')
    expect(onInnerDismiss).toHaveBeenCalledTimes(1)
    expect(onOuterDismiss).not.toHaveBeenCalled()

    // Clicking on outer (outside inner) dismisses only inner.
    pointerDown(wrapper.get('[data-testid="outer-btn"]').element)
    expect(onInnerDismiss).toHaveBeenCalledTimes(2)
    expect(onOuterDismiss).not.toHaveBeenCalled()

    // Once inner closes, outer becomes topmost and dismisses next.
    innerOpen.value = false
    await nextTick()

    pressKey('Escape')
    expect(onOuterDismiss).toHaveBeenCalledTimes(1)
  })

  it('keeps nested child layers above parent layers even when child mounts first', () => {
    const onOuterDismiss = vi.fn()
    const onInnerDismiss = vi.fn()

    const Inner = defineComponent({
      setup() {
        const inner = ref<HTMLElement | null>(null)
        useDismissableLayer(inner, { onDismiss: onInnerDismiss })
        return () => h('div', { ref: inner }, 'Inner')
      },
    })

    const Outer = defineComponent({
      setup() {
        const outer = ref<HTMLElement | null>(null)
        useDismissableLayer(outer, { onDismiss: onOuterDismiss })
        return () => h('div', { ref: outer }, [h(Inner)])
      },
    })

    const wrapper = mount(Outer, { attachTo: document.body })
    attached.push(wrapper)

    pressKey('Escape')
    expect(onInnerDismiss).toHaveBeenCalledTimes(1)
    expect(onOuterDismiss).not.toHaveBeenCalled()
  })

  it('detaches document listeners when the last layer unmounts or clears', async () => {
    const remove = vi.spyOn(document, 'removeEventListener')
    const show = ref(true)
    const layer = ref<HTMLElement | null>(null)
    const onDismiss = vi.fn()

    const wrapper = mountLayer(
      () => {
        useDismissableLayer(() => (show.value ? layer.value : null), {
          onDismiss,
        })
      },
      () => h('div', { ref: layer }, 'Layer'),
    )

    show.value = false
    await nextTick()
    expect(remove).toHaveBeenCalledWith('keydown', expect.any(Function), true)
    expect(remove).toHaveBeenCalledWith(
      'pointerdown',
      expect.any(Function),
      true,
    )

    pressKey('Escape')
    pointerDown(document.body)
    expect(onDismiss).not.toHaveBeenCalled()

    show.value = true
    await nextTick()
    wrapper.unmount()

    pressKey('Escape')
    pointerDown(document.body)
    expect(onDismiss).not.toHaveBeenCalled()
    remove.mockRestore()
  })
})
