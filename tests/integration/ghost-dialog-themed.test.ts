import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { GhostButton } from '../../packages/themes/src/ghost-button'
import {
  GhostDialog,
  type GhostDialogSlotProps,
} from '../../packages/themes/src/ghost-dialog'
import {
  GhostDialogClose,
  type GhostDialogCloseExposed,
} from '../../packages/themes/src/ghost-dialog-close'
import {
  GhostDialogContent,
  type GhostDialogContentExposed,
} from '../../packages/themes/src/ghost-dialog-content'
import {
  GhostDialogDescription,
  type GhostDialogDescriptionExposed,
} from '../../packages/themes/src/ghost-dialog-description'
import {
  GhostDialogOverlay,
  type GhostDialogOverlayExposed,
} from '../../packages/themes/src/ghost-dialog-overlay'
import {
  GhostDialogTitle,
  type GhostDialogTitleExposed,
} from '../../packages/themes/src/ghost-dialog-title'
import {
  GhostDialogTrigger,
  type GhostDialogTriggerExposed,
} from '../../packages/themes/src/ghost-dialog-trigger'

const attached: ReturnType<typeof mount>[] = []

function queryHtml(selector: string): HTMLElement {
  const element = document.querySelector(selector)
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Expected HTMLElement matching selector: ${selector}`)
  }
  return element
}

function requireHtmlElement(
  element: HTMLElement | null | undefined,
): HTMLElement {
  if (!(element instanceof HTMLElement)) {
    throw new Error('Expected exposed HTMLElement')
  }
  return element
}

function mountAttached(component: Parameters<typeof mount>[0]) {
  const wrapper = mount(component, { attachTo: document.body })
  attached.push(wrapper)
  return wrapper
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
  document.body.style.overflow = ''
  document.body.style.paddingRight = ''
  vi.restoreAllMocks()
})

describe('themed GhostDialog wrappers', () => {
  it('forwards controlled/uncontrolled open, modal, slot props, and update:open', async () => {
    const uncontrolledUpdates: boolean[] = []
    let latestSlot: GhostDialogSlotProps | undefined

    const uncontrolled = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDialog,
              {
                defaultOpen: true,
                'onUpdate:open': (next: boolean) =>
                  uncontrolledUpdates.push(next),
              },
              {
                default: (slotProps: GhostDialogSlotProps) => {
                  latestSlot = slotProps
                  return [
                    h(GhostDialogTrigger, null, () => 'Open'),
                    h(GhostDialogOverlay),
                    h(
                      GhostDialogContent,
                      { 'aria-label': 'Uncontrolled' },
                      () => 'Panel',
                    ),
                  ]
                },
              },
            )
        },
      }),
    )

    await flushPromises()
    expect(latestSlot?.open).toBe(true)
    expect(document.querySelector('[data-part="overlay"]')).not.toBeNull()
    expect(document.querySelector('[data-part="content"]')).not.toBeNull()

    latestSlot?.close()
    await flushPromises()
    expect(latestSlot?.open).toBe(false)
    expect(uncontrolledUpdates).toEqual([false])
    expect(document.querySelector('[data-part="overlay"]')).toBeNull()
    expect(document.querySelector('[data-part="content"]')).toBeNull()
    uncontrolled.unmount()

    const open = ref(false)
    const controlledUpdates: boolean[] = []
    const controlled = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDialog,
              {
                open: open.value,
                modal: false,
                'onUpdate:open': (next: boolean) =>
                  controlledUpdates.push(next),
              },
              {
                default: () => [
                  h(GhostDialogTrigger, null, () => 'Controlled'),
                  h(GhostDialogOverlay),
                  h(
                    GhostDialogContent,
                    { 'aria-label': 'Controlled dialog' },
                    () => 'Body',
                  ),
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
    expect(document.querySelector('[data-part="overlay"]')).toBeNull()
    expect(document.querySelector('[data-part="content"]')).not.toBeNull()
  })

  it('sets data-themed on overlay and content, passes attrs, and delegates element/focus/blur on every themed part', async () => {
    const triggerRef = ref<GhostDialogTriggerExposed | null>(null)
    const overlayRef = ref<GhostDialogOverlayExposed | null>(null)
    const contentRef = ref<GhostDialogContentExposed | null>(null)
    const titleRef = ref<GhostDialogTitleExposed | null>(null)
    const descriptionRef = ref<GhostDialogDescriptionExposed | null>(null)
    const closeRef = ref<GhostDialogCloseExposed | null>(null)

    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(GhostDialog, null, {
              default: () => [
                h(
                  GhostDialogTrigger,
                  {
                    ref: triggerRef,
                    as: GhostButton,
                    'data-testid': 'themed-dlg-trigger',
                  },
                  () => 'Open themed dialog',
                ),
                h(GhostDialogOverlay, {
                  ref: overlayRef,
                  as: 'div',
                  portal: false,
                  'data-testid': 'themed-dlg-overlay',
                }),
                h(
                  GhostDialogContent,
                  {
                    ref: contentRef,
                    as: 'section',
                    role: 'dialog',
                    closeOnEscape: true,
                    closeOnOutsideClick: true,
                    portal: false,
                    'data-testid': 'themed-dlg-content',
                  },
                  () => [
                    h(
                      GhostDialogTitle,
                      {
                        ref: titleRef,
                        as: 'h3',
                        'data-testid': 'themed-dlg-title',
                      },
                      () => 'Themed title',
                    ),
                    h(
                      GhostDialogDescription,
                      {
                        ref: descriptionRef,
                        as: 'p',
                        'data-testid': 'themed-dlg-desc',
                      },
                      () => 'Themed description',
                    ),
                    h(
                      GhostDialogClose,
                      {
                        ref: closeRef,
                        as: GhostButton,
                        'data-testid': 'themed-dlg-close',
                      },
                      () => 'Close',
                    ),
                  ],
                ),
              ],
            })
        },
      }),
    )

    const triggerEl = wrapper.get('[data-testid="themed-dlg-trigger"]')
      .element as HTMLElement
    expect(triggerRef.value?.element).toBe(triggerEl)
    expect(overlayRef.value?.element).toBeNull()
    expect(contentRef.value?.element).toBeNull()

    const triggerFocusSpy = vi.spyOn(triggerEl, 'focus')
    const triggerBlurSpy = vi.spyOn(triggerEl, 'blur')
    triggerRef.value?.focus({ preventScroll: true })
    triggerRef.value?.blur()
    expect(triggerFocusSpy).toHaveBeenCalledWith({ preventScroll: true })
    expect(triggerBlurSpy).toHaveBeenCalledOnce()

    await wrapper.get('[data-testid="themed-dlg-trigger"]').trigger('click')
    await flushPromises()

    const overlay = wrapper.get('[data-testid="themed-dlg-overlay"]')
    const content = wrapper.get('[data-testid="themed-dlg-content"]')
    const title = wrapper.get('[data-testid="themed-dlg-title"]')
    const description = wrapper.get('[data-testid="themed-dlg-desc"]')
    const close = wrapper.get('[data-testid="themed-dlg-close"]')

    expect(overlay.attributes('data-themed')).toBe('')
    expect(overlay.classes()).toContain('ghost-dialog-overlay')
    expect(content.element.tagName).toBe('SECTION')
    expect(content.attributes('data-themed')).toBe('')
    expect(content.classes()).toContain('ghost-dialog-content')
    expect(title.element.tagName).toBe('H3')
    expect(description.element.tagName).toBe('P')
    expect(close.element.tagName).toBe('BUTTON')

    for (const partRef of [
      overlayRef,
      contentRef,
      titleRef,
      descriptionRef,
      closeRef,
    ]) {
      const el = requireHtmlElement(partRef.value?.element)
      const focusSpy = vi.spyOn(el, 'focus')
      const blurSpy = vi.spyOn(el, 'blur')
      partRef.value?.focus({ preventScroll: true })
      partRef.value?.blur()
      expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true })
      expect(blurSpy).toHaveBeenCalledOnce()
    }

    await close.trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="themed-dlg-content"]').exists()).toBe(
      false,
    )
    expect(contentRef.value?.element).toBeNull()
  })

  it('forwards disabled state on Trigger/Close and role="alertdialog" defaults through themed wrappers', async () => {
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDialog,
              { defaultOpen: true },
              {
                default: () => [
                  h(
                    GhostDialogTrigger,
                    { disabled: true, 'data-testid': 'disabled-trigger' },
                    () => 'Disabled',
                  ),
                  h(GhostDialogOverlay, { 'data-testid': 'alert-overlay' }),
                  h(
                    GhostDialogContent,
                    {
                      role: 'alertdialog',
                      'data-testid': 'alert-content',
                    },
                    () => [
                      h(GhostDialogTitle, null, () => 'Delete'),
                      h(GhostDialogDescription, null, () => 'Irreversible'),
                      h(
                        GhostDialogClose,
                        { disabled: true, 'data-testid': 'disabled-close' },
                        () => 'Wait',
                      ),
                    ],
                  ),
                ],
              },
            )
        },
      }),
    )

    await flushPromises()
    expect(
      wrapper.get('[data-testid="disabled-trigger"]').attributes('disabled'),
    ).toBe('')
    const disabledClose = queryHtml('[data-testid="disabled-close"]')
    expect(disabledClose.hasAttribute('disabled')).toBe(true)

    // Escape still closes by default on alertdialog; outside pointerdown does not.
    const overlay = queryHtml('[data-testid="alert-overlay"]')
    overlay.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, cancelable: true }),
    )
    await flushPromises()
    expect(
      document.querySelector('[data-testid="alert-content"]'),
    ).not.toBeNull()

    pressKey('Escape')
    await flushPromises()
    expect(document.querySelector('[data-testid="alert-content"]')).toBeNull()
  })
})
