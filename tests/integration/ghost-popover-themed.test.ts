import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { GhostButton } from '../../packages/themes/src/ghost-button'
import {
  GhostPopover,
  type GhostPopoverSlotProps,
} from '../../packages/themes/src/ghost-popover'
import {
  GhostPopoverClose,
  type GhostPopoverCloseExposed,
} from '../../packages/themes/src/ghost-popover-close'
import {
  GhostPopoverContent,
  type GhostPopoverContentExposed,
} from '../../packages/themes/src/ghost-popover-content'
import {
  GhostPopoverTrigger,
  type GhostPopoverTriggerExposed,
} from '../../packages/themes/src/ghost-popover-trigger'

const attached: ReturnType<typeof mount>[] = []

function mountAttached(component: Parameters<typeof mount>[0]) {
  const wrapper = mount(component, { attachTo: document.body })
  attached.push(wrapper)
  return wrapper
}

function stubFinePointer() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    media: query,
  }))
  class IdleObserver {
    observe(target: Element): void {
      void target
    }
    disconnect(): void {
      return undefined
    }
  }
  vi.stubGlobal('IntersectionObserver', IdleObserver)
  vi.stubGlobal('ResizeObserver', IdleObserver)
}

function pressKey(key: string, target: EventTarget = document): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
  })
  target.dispatchEvent(event)
  return event
}

afterEach(() => {
  for (const wrapper of attached) {
    wrapper.unmount()
  }
  attached.length = 0
  vi.unstubAllGlobals()
})

describe('themed GhostPopover wrappers', () => {
  it('forwards controlled/uncontrolled open state, slot props, and update:open', async () => {
    const uncontrolledUpdates: boolean[] = []
    let latestSlot: GhostPopoverSlotProps | undefined

    const uncontrolled = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostPopover,
              {
                defaultOpen: true,
                'onUpdate:open': (next: boolean) =>
                  uncontrolledUpdates.push(next),
              },
              {
                default: (slotProps: GhostPopoverSlotProps) => {
                  latestSlot = slotProps
                  return [
                    h(GhostPopoverTrigger, null, () => 'Toggle'),
                    h(GhostPopoverContent, null, () => 'Panel'),
                  ]
                },
              },
            )
        },
      }),
    )

    await flushPromises()
    expect(latestSlot?.open).toBe(true)
    expect(document.querySelector('[data-part="content"]')).not.toBeNull()

    latestSlot?.close()
    await flushPromises()
    expect(latestSlot?.open).toBe(false)
    expect(uncontrolledUpdates).toEqual([false])
    expect(document.querySelector('[data-part="content"]')).toBeNull()
    uncontrolled.unmount()

    const open = ref(false)
    const controlledUpdates: boolean[] = []
    const controlled = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostPopover,
              {
                open: open.value,
                'onUpdate:open': (next: boolean) =>
                  controlledUpdates.push(next),
              },
              {
                default: () => [
                  h(GhostPopoverTrigger, null, () => 'Controlled'),
                  h(GhostPopoverContent, null, () => 'Controlled body'),
                ],
              },
            )
        },
      }),
    )

    await controlled.get('[data-part="trigger"]').trigger('click')
    await flushPromises()
    expect(controlledUpdates).toEqual([true])
    expect(document.querySelector('[data-part="content"]')).toBeNull()

    open.value = true
    await nextTick()
    await flushPromises()
    expect(document.querySelector('[data-part="content"]')).not.toBeNull()
  })

  it('passes attrs and delegates element/focus/blur on themed GhostPopoverTrigger and GhostPopoverContent', async () => {
    stubFinePointer()
    const triggerRef = ref<GhostPopoverTriggerExposed | null>(null)
    const contentRef = ref<GhostPopoverContentExposed | null>(null)
    const onTriggerClick = vi.fn()

    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(GhostPopover, null, {
              default: () => [
                h(
                  GhostPopoverTrigger,
                  {
                    ref: triggerRef,
                    as: GhostButton,
                    class: 'custom-trigger',
                    'data-testid': 'themed-trigger',
                    'aria-label': 'Open menu',
                    onClick: onTriggerClick,
                  },
                  () => 'Open',
                ),
                h(
                  GhostPopoverContent,
                  {
                    ref: contentRef,
                    as: 'section',
                    placement: 'top-start',
                    offset: 12,
                    flip: false,
                    shift: false,
                    strategy: 'fixed',
                    portal: false,
                    style: { zIndex: '50' },
                    'data-custom': 'panel-attr',
                    'data-testid': 'themed-content',
                    'aria-label': 'Settings panel',
                  },
                  () => h('p', 'Content body'),
                ),
              ],
            })
        },
      }),
    )

    const triggerEl = wrapper.get('[data-testid="themed-trigger"]').element
    expect(triggerEl.tagName).toBe('BUTTON')
    expect(triggerEl.classList.contains('custom-trigger')).toBe(true)
    expect(triggerEl.getAttribute('aria-label')).toBe('Open menu')
    expect(triggerRef.value?.element).toBe(triggerEl)
    expect(contentRef.value?.element).toBeNull()

    const triggerFocusSpy = vi.spyOn(triggerEl as HTMLElement, 'focus')
    const triggerBlurSpy = vi.spyOn(triggerEl as HTMLElement, 'blur')

    triggerRef.value?.focus({ preventScroll: true })
    expect(triggerFocusSpy).toHaveBeenCalledWith({ preventScroll: true })
    expect(document.activeElement).toBe(triggerEl)

    triggerRef.value?.blur()
    expect(triggerBlurSpy).toHaveBeenCalledOnce()

    await wrapper.get('[data-testid="themed-trigger"]').trigger('click')
    await flushPromises()
    expect(onTriggerClick).toHaveBeenCalledOnce()

    const content = wrapper.get('[data-testid="themed-content"]')
    const contentEl = content.element as HTMLElement
    expect(contentEl.tagName).toBe('SECTION')
    expect(content.attributes('data-themed')).toBe('')
    expect(content.attributes('data-custom')).toBe('panel-attr')
    expect(content.attributes('aria-label')).toBe('Settings panel')
    expect(content.classes()).toContain('ghost-popover-content')
    expect(contentEl.style.position).toBe('fixed')
    expect(contentEl.style.zIndex).toBe('50')
    expect(contentRef.value?.element).toBe(contentEl)

    const contentFocusSpy = vi.spyOn(contentEl, 'focus')
    const contentBlurSpy = vi.spyOn(contentEl, 'blur')

    contentRef.value?.focus({ preventScroll: true })
    expect(contentFocusSpy).toHaveBeenCalledWith({ preventScroll: true })
    expect(document.activeElement).toBe(contentEl)

    contentRef.value?.blur()
    expect(contentBlurSpy).toHaveBeenCalledOnce()

    const savedTriggerRef = triggerRef.value
    const savedContentRef = contentRef.value
    wrapper.unmount()
    expect(savedTriggerRef?.element).toBeNull()
    expect(savedContentRef?.element).toBeNull()
  })

  it('passes attrs and delegates element/focus/blur on themed GhostPopoverClose', async () => {
    const closeRef = ref<GhostPopoverCloseExposed | null>(null)
    const onCloseClick = vi.fn()

    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostPopover,
              { defaultOpen: true },
              {
                default: () => [
                  h(GhostPopoverTrigger, null, () => 'Open'),
                  h(GhostPopoverContent, { portal: false }, () => [
                    h(
                      GhostPopoverClose,
                      {
                        ref: closeRef,
                        class: 'custom-close',
                        'data-testid': 'themed-close',
                        'aria-label': 'Dismiss panel',
                        onClick: onCloseClick,
                      },
                      () => 'Close',
                    ),
                  ]),
                ],
              },
            )
        },
      }),
    )

    await flushPromises()
    const close = wrapper.get('[data-testid="themed-close"]')
    const closeEl = close.element as HTMLElement
    expect(closeEl.tagName).toBe('BUTTON')
    expect(close.attributes('type')).toBe('button')
    expect(close.attributes('data-part')).toBe('close')
    expect(close.attributes('aria-label')).toBe('Dismiss panel')
    expect(close.classes()).toContain('custom-close')
    expect(closeRef.value?.element).toBe(closeEl)

    const focusSpy = vi.spyOn(closeEl, 'focus')
    const blurSpy = vi.spyOn(closeEl, 'blur')

    closeRef.value?.focus({ preventScroll: true })
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true })
    expect(document.activeElement).toBe(closeEl)

    closeRef.value?.blur()
    expect(blurSpy).toHaveBeenCalledOnce()

    const savedCloseRef = closeRef.value
    await close.trigger('click')
    await flushPromises()
    expect(onCloseClick).toHaveBeenCalledOnce()
    expect(wrapper.find('[data-part="content"]').exists()).toBe(false)
    expect(savedCloseRef?.element).toBeNull()
  })

  it('supports GhostPopoverClose as, disabled, and keyboard activation paths', async () => {
    stubFinePointer()
    const disabled = ref(true)
    const componentCloseRef = ref<GhostPopoverCloseExposed | null>(null)
    const disabledClick = vi.fn()
    const disabledKeydown = vi.fn()

    // 1. Non-button tag (`as="div"`): disabled blocks click/Enter/Space; enabled supports Enter/Space.
    const divWrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostPopover,
              { defaultOpen: true },
              {
                default: () => [
                  h(
                    GhostPopoverTrigger,
                    { 'data-testid': 'div-trigger' },
                    () => 'Open',
                  ),
                  h(GhostPopoverContent, { portal: false }, () => [
                    h(
                      GhostPopoverClose,
                      {
                        as: 'div',
                        disabled: disabled.value,
                        'data-testid': 'div-close',
                        onClick: disabledClick,
                        onKeydown: disabledKeydown,
                      },
                      () => 'Close div',
                    ),
                  ]),
                ],
              },
            )
        },
      }),
    )

    await flushPromises()
    const divClose = divWrapper.get('[data-testid="div-close"]')
    expect(divClose.attributes('role')).toBe('button')
    expect(divClose.attributes('aria-disabled')).toBe('true')
    expect(divClose.attributes('tabindex')).toBeUndefined()

    await divClose.trigger('click')
    pressKey('Enter', divClose.element)
    pressKey(' ', divClose.element)
    await flushPromises()
    expect(disabledClick).not.toHaveBeenCalled()
    expect(disabledKeydown).not.toHaveBeenCalled()
    expect(divWrapper.find('[data-part="content"]').exists()).toBe(true)

    disabled.value = false
    await nextTick()
    expect(divClose.attributes('tabindex')).toBe('0')
    expect(divClose.attributes('aria-disabled')).toBeUndefined()

    // Non-activation key does not close.
    pressKey('ArrowDown', divClose.element)
    await flushPromises()
    expect(divWrapper.find('[data-part="content"]').exists()).toBe(true)

    // Enter closes when enabled.
    pressKey('Enter', divClose.element)
    await flushPromises()
    expect(divWrapper.find('[data-part="content"]').exists()).toBe(false)

    // Reopen and verify Space closes.
    await divWrapper.get('[data-testid="div-trigger"]').trigger('click')
    await flushPromises()
    pressKey(' ', divWrapper.get('[data-testid="div-close"]').element)
    await flushPromises()
    expect(divWrapper.find('[data-part="content"]').exists()).toBe(false)
    divWrapper.unmount()

    // 2. Anchor tag (`as="a"` with href) and component host (`as=GhostButton`) + prevented handlers.
    const preventClick = ref(true)
    const preventKey = ref(true)
    const anchorWrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostPopover,
              { defaultOpen: true },
              {
                default: () => [
                  h(GhostPopoverTrigger, null, () => 'Open'),
                  h(GhostPopoverContent, { portal: false }, () => [
                    h(
                      GhostPopoverClose,
                      {
                        as: 'a',
                        href: '#dismiss',
                        'data-testid': 'link-close',
                        onClick: (event: MouseEvent) => {
                          if (preventClick.value) {
                            event.preventDefault()
                          }
                        },
                        onKeydown: (event: KeyboardEvent) => {
                          if (preventKey.value) {
                            event.preventDefault()
                          }
                        },
                      },
                      () => 'Link close',
                    ),
                    h(
                      GhostPopoverClose,
                      {
                        ref: componentCloseRef,
                        as: GhostButton,
                        'data-testid': 'btn-close',
                      },
                      () => 'Button close',
                    ),
                  ]),
                ],
              },
            )
        },
      }),
    )

    await flushPromises()
    const linkClose = anchorWrapper.get('[data-testid="link-close"]')
    expect(componentCloseRef.value?.element).toBeInstanceOf(HTMLButtonElement)

    // Prevented click/keydown keep popover open.
    await linkClose.trigger('click')
    pressKey(' ', linkClose.element)
    await flushPromises()
    expect(anchorWrapper.find('[data-part="content"]').exists()).toBe(true)

    // Native button Enter passes through without calling context.close() twice; anchor Enter defers to native link unless clicked.
    preventKey.value = false
    const enterEvent = pressKey('Enter', linkClose.element)
    expect(enterEvent.defaultPrevented).toBe(false)
    pressKey('Enter', anchorWrapper.get('[data-testid="btn-close"]').element)
    await flushPromises()
    expect(anchorWrapper.find('[data-part="content"]').exists()).toBe(true)

    // Space on anchor closes.
    pressKey(' ', linkClose.element)
    await flushPromises()
    expect(anchorWrapper.find('[data-part="content"]').exists()).toBe(false)
    anchorWrapper.unmount()

    // 3. Disabled native button GhostPopoverClose blocks click and keyboard activation.
    const disabledBtnWrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostPopover,
              { defaultOpen: true },
              {
                default: () => [
                  h(GhostPopoverTrigger, null, () => 'Open'),
                  h(GhostPopoverContent, { portal: false }, () => [
                    h(
                      GhostPopoverClose,
                      {
                        disabled: true,
                        'data-testid': 'disabled-btn-close',
                      },
                      () => 'Disabled close',
                    ),
                  ]),
                ],
              },
            )
        },
      }),
    )

    await flushPromises()
    const disabledBtn = disabledBtnWrapper.get(
      '[data-testid="disabled-btn-close"]',
    )
    expect(disabledBtn.attributes('disabled')).toBe('')
    await disabledBtn.trigger('click')
    pressKey('Enter', disabledBtn.element)
    pressKey(' ', disabledBtn.element)
    await flushPromises()
    expect(disabledBtnWrapper.find('[data-part="content"]').exists()).toBe(true)
  })
})
