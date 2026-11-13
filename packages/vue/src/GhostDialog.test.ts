import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import GhostButton from './GhostButton.vue'
import GhostDialog from './GhostDialog.vue'
import GhostDialogClose from './GhostDialogClose.vue'
import GhostDialogContent from './GhostDialogContent.vue'
import GhostDialogDescription from './GhostDialogDescription.vue'
import GhostDialogOverlay from './GhostDialogOverlay.vue'
import GhostDialogTitle from './GhostDialogTitle.vue'
import GhostDialogTrigger from './GhostDialogTrigger.vue'
import GhostPopover from './GhostPopover.vue'
import GhostPopoverClose from './GhostPopoverClose.vue'
import GhostPopoverContent from './GhostPopoverContent.vue'
import GhostPopoverTrigger from './GhostPopoverTrigger.vue'
import type {
  GhostDialogCloseExposed,
  GhostDialogContentExposed,
  GhostDialogDescriptionExposed,
  GhostDialogOverlayExposed,
  GhostDialogSlotProps,
  GhostDialogTitleExposed,
  GhostDialogTriggerExposed,
} from './ghost-dialog'
import { useGhostDialog } from './use-ghost-dialog'

const attached: ReturnType<typeof mount>[] = []

function mountAttached(component: Parameters<typeof mount>[0]) {
  const wrapper = mount(component, { attachTo: document.body })
  attached.push(wrapper)
  return wrapper
}

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

function pressKey(
  key: string,
  target: EventTarget = document,
  options: { shiftKey?: boolean } = {},
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    shiftKey: options.shiftKey ?? false,
    bubbles: true,
    cancelable: true,
  })
  target.dispatchEvent(event)
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

afterEach(() => {
  for (const wrapper of attached) {
    wrapper.unmount()
  }
  attached.length = 0
  document.body.style.overflow = ''
  document.body.style.paddingRight = ''
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('useGhostDialog', () => {
  it('manages uncontrolled state, controlled state, modal flag, and deterministic IDs', () => {
    const changes: boolean[] = []
    let uncontrolled!: ReturnType<typeof useGhostDialog>
    let controlled!: ReturnType<typeof useGhostDialog>
    const open = ref(false)
    const modal = ref(false)
    const controlledChanges: boolean[] = []

    mountAttached(
      defineComponent({
        setup() {
          uncontrolled = useGhostDialog({
            defaultOpen: false,
            onOpenChange: (next) => changes.push(next),
          })
          controlled = useGhostDialog({
            open,
            modal,
            onOpenChange: (next) => controlledChanges.push(next),
          })
          return () => h('div')
        },
      }),
    )

    expect(uncontrolled.isOpen.value).toBe(false)
    expect(uncontrolled.isModal.value).toBe(true)
    expect(uncontrolled.triggerId.value).toContain('ghost-dialog-trigger')
    expect(uncontrolled.contentId.value).toContain('ghost-dialog-content')
    expect(uncontrolled.titleId.value).toContain('ghost-dialog-title')
    expect(uncontrolled.descriptionId.value).toContain(
      'ghost-dialog-description',
    )

    uncontrolled.open()
    uncontrolled.open()
    expect(uncontrolled.isOpen.value).toBe(true)
    expect(changes).toEqual([true])

    uncontrolled.close()
    uncontrolled.close()
    expect(uncontrolled.isOpen.value).toBe(false)
    expect(changes).toEqual([true, false])

    uncontrolled.toggle()
    expect(uncontrolled.isOpen.value).toBe(true)
    expect(changes).toEqual([true, false, true])

    expect(controlled.isModal.value).toBe(false)
    controlled.open()
    expect(controlled.isOpen.value).toBe(false)
    expect(controlledChanges).toEqual([true])
    open.value = true
    expect(controlled.isOpen.value).toBe(true)
  })
})

describe('GhostDialog', () => {
  it('supports uncontrolled, controlled/v-model, slot props, and v-if unmounting', async () => {
    const uncontrolledUpdates: boolean[] = []
    let slotState: GhostDialogSlotProps | undefined

    const uncontrolled = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDialog,
              {
                defaultOpen: false,
                'onUpdate:open': (next: boolean) =>
                  uncontrolledUpdates.push(next),
              },
              {
                default: (slot: GhostDialogSlotProps) => {
                  slotState = slot
                  return [
                    h(GhostDialogTrigger, null, () => 'Open dialog'),
                    h(GhostDialogOverlay, { 'data-testid': 'overlay' }),
                    h(GhostDialogContent, { 'data-testid': 'content' }, () => [
                      h(GhostDialogTitle, null, () => 'Title'),
                      h(
                        GhostDialogDescription,
                        null,
                        () => 'Details for this dialog.',
                      ),
                      h(GhostDialogClose, null, () => 'Done'),
                    ]),
                  ]
                },
              },
            )
        },
      }),
    )

    const trigger = uncontrolled.get('[data-part="trigger"]')
    expect(trigger.attributes('data-state')).toBe('closed')
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(trigger.attributes('aria-haspopup')).toBe('dialog')
    expect(document.querySelector('[data-testid="overlay"]')).toBeNull()
    expect(document.querySelector('[data-testid="content"]')).toBeNull()
    expect(slotState?.open).toBe(false)

    await trigger.trigger('click')
    await flushPromises()
    expect(uncontrolledUpdates).toEqual([true])
    expect(slotState?.open).toBe(true)
    expect(trigger.attributes('data-state')).toBe('open')
    expect(trigger.attributes('aria-expanded')).toBe('true')
    expect(document.querySelector('[data-testid="overlay"]')).not.toBeNull()
    expect(document.querySelector('[data-testid="content"]')).not.toBeNull()

    slotState?.close()
    await flushPromises()
    expect(uncontrolledUpdates).toEqual([true, false])
    expect(document.querySelector('[data-testid="overlay"]')).toBeNull()
    expect(document.querySelector('[data-testid="content"]')).toBeNull()
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
                'onUpdate:open': (next: boolean) =>
                  controlledUpdates.push(next),
              },
              {
                default: () => [
                  h(GhostDialogTrigger, null, () => 'Controlled open'),
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
    expect(document.querySelector('[data-part="content"]')).not.toBeNull()
  })

  it('links Title/Description IDs, honors custom IDs/explicit labels, and exposes refs on all parts', async () => {
    const triggerRef = ref<GhostDialogTriggerExposed | null>(null)
    const overlayRef = ref<GhostDialogOverlayExposed | null>(null)
    const contentRef = ref<GhostDialogContentExposed | null>(null)
    const titleRef = ref<GhostDialogTitleExposed | null>(null)
    const descRef = ref<GhostDialogDescriptionExposed | null>(null)
    const closeRef = ref<GhostDialogCloseExposed | null>(null)

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
                    { ref: triggerRef, id: 'custom-trigger' },
                    () => 'Open',
                  ),
                  h(GhostDialogOverlay, {
                    ref: overlayRef,
                    'data-testid': 'dlg-overlay',
                  }),
                  h(
                    GhostDialogContent,
                    {
                      ref: contentRef,
                      id: 'custom-content',
                      'data-testid': 'dlg-content',
                    },
                    () => [
                      h(
                        GhostDialogTitle,
                        { ref: titleRef, id: 'custom-title' },
                        () => 'Custom Title',
                      ),
                      h(
                        GhostDialogDescription,
                        { ref: descRef, id: 'custom-desc' },
                        () => 'Custom description',
                      ),
                      h(GhostDialogClose, { ref: closeRef }, () => 'Close'),
                    ],
                  ),
                ],
              },
            )
        },
      }),
    )

    await flushPromises()
    const trigger = wrapper.get('#custom-trigger')
    expect(trigger.attributes('aria-controls')).toBe('custom-content')
    expect(triggerRef.value?.element).toBe(trigger.element)

    const overlayEl = document.querySelector('[data-testid="dlg-overlay"]')
    const contentEl = document.querySelector('[data-testid="dlg-content"]')
    expect(overlayEl).not.toBeNull()
    expect(overlayEl?.getAttribute('aria-hidden')).toBe('true')
    expect(overlayEl?.getAttribute('data-part')).toBe('overlay')
    expect(overlayEl?.getAttribute('data-state')).toBe('open')
    expect(overlayRef.value?.element).toBe(overlayEl)

    expect(contentEl).not.toBeNull()
    expect(contentEl?.getAttribute('role')).toBe('dialog')
    expect(contentEl?.getAttribute('aria-modal')).toBe('true')
    expect(contentEl?.getAttribute('aria-labelledby')).toBe('custom-title')
    expect(contentEl?.getAttribute('aria-describedby')).toBe('custom-desc')
    expect(contentRef.value?.element).toBe(contentEl)
    expect(titleRef.value?.element?.tagName).toBe('H2')
    expect(descRef.value?.element?.tagName).toBe('P')
    expect(closeRef.value?.element?.tagName).toBe('BUTTON')

    // Focus and blur delegates on all exposed refs.
    for (const part of [
      triggerRef,
      overlayRef,
      contentRef,
      titleRef,
      descRef,
      closeRef,
    ]) {
      const el = requireHtmlElement(part.value?.element)
      const focusSpy = vi.spyOn(el, 'focus')
      const blurSpy = vi.spyOn(el, 'blur')
      part.value?.focus({ preventScroll: true })
      part.value?.blur()
      expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true })
      expect(blurSpy).toHaveBeenCalledOnce()
    }
  })

  it('autofocuses defaultOpen modal dialogs on mount, while modal=false respects openedAtMount', async () => {
    const outsideButton = document.createElement('button')
    outsideButton.textContent = 'Outside'
    document.body.append(outsideButton)
    outsideButton.focus()

    const modalDefaultOpen = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDialog,
              { defaultOpen: true, modal: true },
              {
                default: () => [
                  h(GhostDialogContent, { 'aria-label': 'Auto modal' }, () => [
                    h(
                      'button',
                      { type: 'button', 'data-testid': 'auto-btn' },
                      'First',
                    ),
                  ]),
                ],
              },
            )
        },
      }),
    )
    await flushPromises()
    expect(document.activeElement).toBe(
      document.querySelector('[data-testid="auto-btn"]'),
    )
    modalDefaultOpen.unmount()

    outsideButton.focus()
    const nonModalDefaultOpen = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDialog,
              { defaultOpen: true, modal: false },
              {
                default: () => [
                  h(GhostDialogTrigger, null, () => 'Toggle'),
                  h(
                    GhostDialogContent,
                    { 'aria-label': 'Non-modal auto' },
                    () => [
                      h(
                        'button',
                        { type: 'button', 'data-testid': 'nonmodal-auto-btn' },
                        'Inside',
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
    expect(document.activeElement).toBe(outsideButton)

    // Closing and reopening transitions from closed -> open and autofocuses.
    await nonModalDefaultOpen.get('[data-part="trigger"]').trigger('click')
    await flushPromises()
    expect(document.querySelector('[data-part="content"]')).toBeNull()

    await nonModalDefaultOpen.get('[data-part="trigger"]').trigger('click')
    await flushPromises()
    expect(document.activeElement).toBe(
      document.querySelector('[data-testid="nonmodal-auto-btn"]'),
    )
  })

  it('handles modal behavior: Tab/Shift+Tab loop, scroll lock, inert background (keeping overlay & content), and restores focus after inert release', async () => {
    const siblingWrapper = document.createElement('div')
    siblingWrapper.setAttribute('data-testid', 'bg-root')
    const bgButton = document.createElement('button')
    bgButton.textContent = 'Background action'
    siblingWrapper.append(bgButton)

    const liveRegion = document.createElement('div')
    liveRegion.setAttribute('data-ghost-live', '')
    document.body.append(siblingWrapper, liveRegion)

    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(GhostDialog, null, {
              default: () => [
                h(
                  GhostDialogTrigger,
                  { 'data-testid': 'dlg-trigger' },
                  () => 'Open modal',
                ),
                // Put Overlay BEFORE Content to verify both are in elements kept non-inert.
                h(GhostDialogOverlay, { 'data-testid': 'dlg-overlay' }),
                h(GhostDialogContent, { 'aria-label': 'Modal dialog' }, () => [
                  h(
                    'button',
                    { type: 'button', 'data-testid': 'first' },
                    'First',
                  ),
                  h(GhostDialogClose, { 'data-testid': 'last' }, () => 'Close'),
                ]),
              ],
            })
        },
      }),
    )

    const trigger = wrapper.get('[data-testid="dlg-trigger"]')
    await trigger.trigger('click')
    await flushPromises()

    const first = queryHtml('[data-testid="first"]')
    const last = queryHtml('[data-testid="last"]')
    const overlay = queryHtml('[data-testid="dlg-overlay"]')
    const content = queryHtml('[data-part="content"]')

    expect(document.activeElement).toBe(first)
    expect(document.body.style.overflow).toBe('hidden')
    expect(siblingWrapper.hasAttribute('inert')).toBe(true)
    expect(liveRegion.hasAttribute('inert')).toBe(false)
    expect(overlay.hasAttribute('inert')).toBe(false)
    expect(content.hasAttribute('inert')).toBe(false)

    // Forward wrap from last -> first; backward wrap from first -> last.
    last.focus()
    pressKey('Tab', last)
    expect(document.activeElement).toBe(first)
    pressKey('Tab', first, { shiftKey: true })
    expect(document.activeElement).toBe(last)

    // Clicking overlay closes dialog, clears inert & scroll lock, and restores focus to trigger.
    pointerDown(overlay)
    await flushPromises()
    expect(document.querySelector('[data-part="content"]')).toBeNull()
    expect(document.body.style.overflow).toBe('')
    expect(siblingWrapper.hasAttribute('inert')).toBe(false)
    expect(document.activeElement).toBe(trigger.element)
  })

  it('disables trap, scroll lock, inert background, and overlay when modal=false, and skips restore when clicking outside focusable control', async () => {
    const siblingWrapper = document.createElement('div')
    const outsideBtn = document.createElement('button')
    outsideBtn.textContent = 'Outside clickable'
    siblingWrapper.append(outsideBtn)
    document.body.append(siblingWrapper)

    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDialog,
              { modal: false },
              {
                default: () => [
                  h(
                    GhostDialogTrigger,
                    { 'data-testid': 'nonmodal-trigger' },
                    () => 'Open non-modal',
                  ),
                  h(GhostDialogOverlay, { 'data-testid': 'nonmodal-overlay' }),
                  h(
                    GhostDialogContent,
                    { 'aria-label': 'Non-modal dialog' },
                    () => [
                      h(
                        'button',
                        { type: 'button', 'data-testid': 'nonmodal-first' },
                        'Inside',
                      ),
                    ],
                  ),
                ],
              },
            )
        },
      }),
    )

    await wrapper.get('[data-testid="nonmodal-trigger"]').trigger('click')
    await flushPromises()

    expect(
      document.querySelector('[data-testid="nonmodal-overlay"]'),
    ).toBeNull()
    const content = document.querySelector('[data-part="content"]')
    expect(content?.hasAttribute('aria-modal')).toBe(false)
    expect(document.body.style.overflow).toBe('')
    expect(siblingWrapper.hasAttribute('inert')).toBe(false)

    // Tabbing from last tabbable item in non-modal dialog is NOT intercepted by trap.
    const first = queryHtml('[data-testid="nonmodal-first"]')
    first.focus()
    const tabEvent = pressKey('Tab', first)
    expect(tabEvent.defaultPrevented).toBe(false)

    // Pointerdown on focusable outside control closes without stealing focus back to trigger.
    outsideBtn.focus()
    pointerDown(outsideBtn)
    await flushPromises()
    expect(document.querySelector('[data-part="content"]')).toBeNull()
    expect(document.activeElement).toBe(outsideBtn)
  })

  it('respects closeOnEscape=false and closeOnOutsideClick=false overrides, and role="alertdialog" defaults', async () => {
    const alertWrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDialog,
              { defaultOpen: true },
              {
                default: () => [
                  h(GhostDialogOverlay, { 'data-testid': 'alert-overlay' }),
                  h(
                    GhostDialogContent,
                    {
                      role: 'alertdialog',
                      closeOnEscape: false,
                    },
                    () => [
                      h(GhostDialogTitle, null, () => 'Delete item'),
                      h(
                        GhostDialogDescription,
                        null,
                        () => 'This action cannot be undone.',
                      ),
                      h(
                        GhostDialogClose,
                        { 'data-testid': 'alert-confirm' },
                        () => 'Confirm',
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
    const content = document.querySelector('[data-part="content"]')
    expect(content?.getAttribute('role')).toBe('alertdialog')

    // Outside click (overlay) does NOT dismiss alertdialog by default.
    pointerDown(queryHtml('[data-testid="alert-overlay"]'))
    await flushPromises()
    expect(document.querySelector('[data-part="content"]')).not.toBeNull()

    // Escape blocked when closeOnEscape=false.
    pressKey('Escape')
    await flushPromises()
    expect(document.querySelector('[data-part="content"]')).not.toBeNull()

    // Explicit close button still dismisses.
    queryHtml('[data-testid="alert-confirm"]').click()
    await flushPromises()
    expect(document.querySelector('[data-part="content"]')).toBeNull()
    alertWrapper.unmount()

    // Explicit closeOnOutsideClick=true overrides alertdialog default.
    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDialog,
              { defaultOpen: true },
              {
                default: () => [
                  h(GhostDialogOverlay, {
                    'data-testid': 'alert-override-overlay',
                  }),
                  h(
                    GhostDialogContent,
                    {
                      role: 'alertdialog',
                      closeOnOutsideClick: true,
                    },
                    () => [
                      h(GhostDialogTitle, null, () => 'Title'),
                      h(GhostDialogDescription, null, () => 'Desc'),
                    ],
                  ),
                ],
              },
            )
        },
      }),
    )
    await flushPromises()
    pointerDown(queryHtml('[data-testid="alert-override-overlay"]'))
    await flushPromises()
    expect(document.querySelector('[data-part="content"]')).toBeNull()
  })

  it('logs GHOST002 when Content has no accessible name and GHOST003 when alertdialog has no Description', async () => {
    const warnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined)

    const unnamed = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDialog,
              { defaultOpen: true },
              {
                default: () => [
                  h(GhostDialogContent, null, () => 'Unnamed body'),
                ],
              },
            )
        },
      }),
    )
    await flushPromises()
    expect(
      warnSpy.mock.calls.some((args) => String(args[0]).includes('GHOST002')),
    ).toBe(true)
    unnamed.unmount()
    warnSpy.mockClear()

    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDialog,
              { defaultOpen: true },
              {
                default: () => [
                  h(GhostDialogContent, { role: 'alertdialog' }, () => [
                    h(GhostDialogTitle, null, () => 'Warning only'),
                  ]),
                ],
              },
            )
        },
      }),
    )
    await flushPromises()
    expect(
      warnSpy.mock.calls.some((args) => String(args[0]).includes('GHOST003')),
    ).toBe(true)
  })

  it('dismisses nested modal dialogs one layer at a time on Escape', async () => {
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(GhostDialog, null, {
              default: () => [
                h(
                  GhostDialogTrigger,
                  { 'data-testid': 'outer-trigger' },
                  () => 'Open outer',
                ),
                h(GhostDialogOverlay, { 'data-testid': 'outer-overlay' }),
                h(
                  GhostDialogContent,
                  { 'data-testid': 'outer-content', 'aria-label': 'Outer' },
                  () => [
                    h(GhostDialog, null, {
                      default: () => [
                        h(
                          GhostDialogTrigger,
                          { 'data-testid': 'inner-trigger' },
                          () => 'Open inner',
                        ),
                        h(GhostDialogOverlay, {
                          'data-testid': 'inner-overlay',
                        }),
                        h(
                          GhostDialogContent,
                          {
                            'data-testid': 'inner-content',
                            'aria-label': 'Inner',
                          },
                          () => [
                            h(
                              GhostDialogClose,
                              { 'data-testid': 'inner-close' },
                              () => 'Close inner',
                            ),
                          ],
                        ),
                      ],
                    }),
                    h(
                      GhostDialogClose,
                      { 'data-testid': 'outer-close' },
                      () => 'Close outer',
                    ),
                  ],
                ),
              ],
            })
        },
      }),
    )

    const outerTrigger = wrapper.get('[data-testid="outer-trigger"]')
    await outerTrigger.trigger('click')
    await flushPromises()

    const innerTrigger = queryHtml('[data-testid="inner-trigger"]')
    expect(
      document.querySelector('[data-testid="outer-content"]'),
    ).not.toBeNull()

    innerTrigger.click()
    await flushPromises()
    expect(
      document.querySelector('[data-testid="inner-content"]'),
    ).not.toBeNull()

    // Outer content becomes inert while inner modal is active.
    const outerContent = queryHtml('[data-testid="outer-content"]')
    expect(outerContent.hasAttribute('inert')).toBe(true)

    pressKey('Escape')
    await flushPromises()
    expect(document.querySelector('[data-testid="inner-content"]')).toBeNull()
    expect(
      document.querySelector('[data-testid="outer-content"]'),
    ).not.toBeNull()
    expect(outerContent.hasAttribute('inert')).toBe(false)
    expect(document.activeElement).toBe(innerTrigger)

    pressKey('Escape')
    await flushPromises()
    expect(document.querySelector('[data-testid="outer-content"]')).toBeNull()
    expect(document.activeElement).toBe(outerTrigger.element)
  })

  it('keeps Tab inside dialog when portal=false popover is nested inside a modal dialog, and lets Tab work freely in a portaled popover', async () => {
    // 1. portal=false inline popover inside modal dialog: Tab past last popover item wraps inside the dialog.
    const inlineWrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDialog,
              { defaultOpen: true },
              {
                default: () => [
                  h(
                    GhostDialogContent,
                    { 'aria-label': 'Dialog with inline popover' },
                    () => [
                      h(
                        'button',
                        { type: 'button', 'data-testid': 'dlg-first' },
                        'First',
                      ),
                      h(
                        GhostPopover,
                        { defaultOpen: true },
                        {
                          default: () => [
                            h(
                              GhostPopoverTrigger,
                              { 'data-testid': 'inline-pop-trigger' },
                              () => 'Popover',
                            ),
                            h(
                              GhostPopoverContent,
                              {
                                portal: false,
                                'data-testid': 'inline-pop-content',
                              },
                              () => [
                                h(
                                  GhostPopoverClose,
                                  { 'data-testid': 'inline-pop-close' },
                                  () => 'Done',
                                ),
                              ],
                            ),
                          ],
                        },
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
    const inlineClose = queryHtml('[data-testid="inline-pop-close"]')
    inlineClose.focus()
    pressKey('Tab', inlineClose)
    // Because inlineClose is the last tabbable element inside the dialog, Tab wraps back to dlg-first.
    expect(document.activeElement).toBe(
      document.querySelector('[data-testid="dlg-first"]'),
    )
    inlineWrapper.unmount()

    // 2. Portaled popover inside modal dialog: Tab within the portaled popover is not pulled back.
    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDialog,
              { defaultOpen: true },
              {
                default: () => [
                  h(
                    GhostDialogContent,
                    { 'aria-label': 'Dialog with portaled popover' },
                    () => [
                      h(
                        'button',
                        { type: 'button', 'data-testid': 'dlg-top' },
                        'Top',
                      ),
                      h(
                        GhostPopover,
                        { defaultOpen: true },
                        {
                          default: () => [
                            h(
                              GhostPopoverTrigger,
                              { 'data-testid': 'portaled-pop-trigger' },
                              () => 'Popover',
                            ),
                            h(
                              GhostPopoverContent,
                              {
                                portal: true,
                                'data-testid': 'portaled-pop-content',
                              },
                              () => [
                                h(
                                  'button',
                                  {
                                    type: 'button',
                                    'data-testid': 'portaled-pop-a',
                                  },
                                  'A',
                                ),
                                h(
                                  'button',
                                  {
                                    type: 'button',
                                    'data-testid': 'portaled-pop-b',
                                  },
                                  'B',
                                ),
                              ],
                            ),
                          ],
                        },
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
    const popB = queryHtml('[data-testid="portaled-pop-b"]')
    popB.focus()
    const tabInPortal = pressKey('Tab', popB)
    expect(tabInPortal.defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(popB)
  })

  it('supports as/disabled/keyboard activation on Trigger and Close and custom aria-label/aria-describedby', async () => {
    const disabledTrigger = ref(true)
    const preventClick = ref(true)
    const preventKey = ref(true)

    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(GhostDialog, null, {
              default: () => [
                h(
                  GhostDialogTrigger,
                  {
                    as: 'div',
                    disabled: disabledTrigger.value,
                    'data-testid': 'div-trigger',
                  },
                  () => 'Div trigger',
                ),
                h(
                  GhostDialogTrigger,
                  {
                    as: GhostButton,
                    'data-testid': 'comp-trigger',
                  },
                  () => 'Comp trigger',
                ),
                h(
                  GhostDialogContent,
                  {
                    portal: false,
                    'aria-label': 'Explicit label',
                    'aria-describedby': 'ext-desc',
                    'data-testid': 'custom-attrs-content',
                  },
                  () => [
                    h('p', { id: 'ext-desc' }, 'External description'),
                    h(
                      GhostDialogClose,
                      {
                        as: 'div',
                        disabled: true,
                        'data-testid': 'disabled-div-close',
                      },
                      () => 'Disabled close',
                    ),
                    h(
                      GhostDialogClose,
                      {
                        as: 'a',
                        href: '#close',
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
                  ],
                ),
              ],
            })
        },
      }),
    )

    const divTrigger = wrapper.get('[data-testid="div-trigger"]')
    expect(divTrigger.attributes('role')).toBe('button')
    expect(divTrigger.attributes('aria-disabled')).toBe('true')
    expect(divTrigger.attributes('tabindex')).toBeUndefined()

    await divTrigger.trigger('click')
    pressKey('Enter', divTrigger.element)
    await flushPromises()
    expect(wrapper.find('[data-testid="custom-attrs-content"]').exists()).toBe(
      false,
    )

    disabledTrigger.value = false
    await nextTick()
    expect(divTrigger.attributes('tabindex')).toBe('0')

    pressKey('Enter', divTrigger.element)
    await flushPromises()
    const content = wrapper.get('[data-testid="custom-attrs-content"]')
    expect(content.attributes('aria-label')).toBe('Explicit label')
    expect(content.attributes('aria-describedby')).toBe('ext-desc')

    // Disabled div close does not close.
    const disabledClose = wrapper.get('[data-testid="disabled-div-close"]')
    await disabledClose.trigger('click')
    pressKey(' ', disabledClose.element)
    await flushPromises()
    expect(wrapper.find('[data-testid="custom-attrs-content"]').exists()).toBe(
      true,
    )

    // Prevented click/key keep dialog open; unprevented Space closes.
    const linkClose = wrapper.get('[data-testid="link-close"]')
    await linkClose.trigger('click')
    pressKey(' ', linkClose.element)
    await flushPromises()
    expect(wrapper.find('[data-testid="custom-attrs-content"]').exists()).toBe(
      true,
    )

    preventKey.value = false
    const anchorEnter = pressKey('Enter', linkClose.element)
    expect(anchorEnter.defaultPrevented).toBe(false)
    pressKey(' ', linkClose.element)
    await flushPromises()
    expect(wrapper.find('[data-testid="custom-attrs-content"]').exists()).toBe(
      false,
    )
  })

  it('throws clear errors when dialog sub-parts are rendered outside GhostDialog', () => {
    for (const part of [
      GhostDialogTrigger,
      GhostDialogOverlay,
      GhostDialogContent,
      GhostDialogTitle,
      GhostDialogDescription,
      GhostDialogClose,
    ]) {
      expect(() =>
        mount(
          defineComponent({
            setup() {
              return () => h(part, null, () => 'Orphan')
            },
          }),
        ),
      ).toThrow(/must be used inside GhostDialog/)
    }
  })
})
