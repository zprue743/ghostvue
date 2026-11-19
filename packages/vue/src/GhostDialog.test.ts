import { flushPromises, mount } from '@vue/test-utils'
import { createSSRApp, defineComponent, h, nextTick, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
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

  it('reapplies restored focus when the overlay press drops focus to body (WebKit), but not when focus moved elsewhere', async () => {
    const outside = document.createElement('button')
    outside.textContent = 'Outside'
    document.body.append(outside)

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
                h(GhostDialogOverlay, { 'data-testid': 'dlg-overlay' }),
                h(GhostDialogContent, { 'aria-label': 'Modal dialog' }, () => [
                  h(GhostDialogClose, () => 'Close'),
                ]),
              ],
            })
        },
      }),
    )
    const trigger = wrapper.get('[data-testid="dlg-trigger"]')
    const nextTask = () =>
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, 0)
      })

    // WebKit: after the restore, the press default action blurs to <body>
    // without dispatching mousedown, so preventDefault cannot stop it.
    await trigger.trigger('click')
    await flushPromises()
    pointerDown(queryHtml('[data-testid="dlg-overlay"]'))
    // Only microtasks: the restore runs in Vue's flush, before the timer task.
    await nextTick()
    expect(document.activeElement).toBe(trigger.element)
    ;(trigger.element as HTMLElement).blur()
    expect(document.activeElement).toBe(document.body)
    await nextTask()
    expect(document.activeElement).toBe(trigger.element)

    // A deliberate move to another control before the next task is kept.
    await trigger.trigger('click')
    await flushPromises()
    pointerDown(queryHtml('[data-testid="dlg-overlay"]'))
    await nextTick()
    expect(document.activeElement).toBe(trigger.element)
    outside.focus()
    await nextTask()
    expect(document.activeElement).toBe(outside)
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

  it('refreshes inert isolation when portal or portalTo changes while open', async () => {
    const appRoot = document.createElement('div')
    appRoot.id = 'app-root'
    const customPortal = document.createElement('div')
    customPortal.id = 'custom-portal'
    document.body.append(appRoot, customPortal)

    const portal = ref(true)
    const portalTo = ref<string>('body')

    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h('div', { id: 'shell' }, [
              h('main', { 'data-testid': 'app-main' }, 'App main'),
              h(
                GhostDialog,
                { defaultOpen: true },
                {
                  default: () => [
                    h(GhostDialogOverlay, {
                      'data-testid': 'portal-toggle-overlay',
                      portal: portal.value,
                      portalTo: portalTo.value,
                    }),
                    h(
                      GhostDialogContent,
                      {
                        'aria-label': 'Portal toggle dialog',
                        'data-testid': 'portal-toggle-content',
                        portal: portal.value,
                        portalTo: portalTo.value,
                      },
                      () => [
                        h(
                          'button',
                          { type: 'button', 'data-testid': 'portal-btn' },
                          'Action',
                        ),
                        h(
                          GhostDialogClose,
                          { 'data-testid': 'portal-close' },
                          () => 'Close',
                        ),
                      ],
                    ),
                  ],
                },
              ),
            ])
        },
      }),
      { attachTo: appRoot },
    )
    attached.push(wrapper)
    await flushPromises()

    const appMain = wrapper.get('[data-testid="app-main"]').element
    const content = queryHtml('[data-testid="portal-toggle-content"]')
    const actionBtn = queryHtml('[data-testid="portal-btn"]')

    // Initially portaled to body: appRoot and customPortal are inert; content is not.
    expect(content.parentElement).toBe(document.body)
    expect(appRoot.hasAttribute('inert')).toBe(true)
    expect(customPortal.hasAttribute('inert')).toBe(true)
    expect(content.closest('[inert]')).toBeNull()
    expect(actionBtn.closest('[inert]')).toBeNull()

    // Toggle portal from true -> false while open: content moves inline under appRoot.
    portal.value = false
    await nextTick()

    expect(appRoot.contains(content)).toBe(true)
    expect(appRoot.hasAttribute('inert')).toBe(false)
    expect(appMain.hasAttribute('inert')).toBe(true)
    expect(customPortal.hasAttribute('inert')).toBe(true)
    expect(content.closest('[inert]')).toBeNull()
    expect(actionBtn.closest('[inert]')).toBeNull()

    // Toggle portal back from false -> true while open.
    portal.value = true
    await nextTick()

    expect(content.parentElement).toBe(document.body)
    expect(appRoot.hasAttribute('inert')).toBe(true)
    expect(appMain.hasAttribute('inert')).toBe(false)
    expect(customPortal.hasAttribute('inert')).toBe(true)
    expect(content.closest('[inert]')).toBeNull()

    // Change portalTo target while open.
    portalTo.value = '#custom-portal'
    await nextTick()

    expect(content.parentElement).toBe(customPortal)
    expect(appRoot.hasAttribute('inert')).toBe(true)
    expect(customPortal.hasAttribute('inert')).toBe(false)
    expect(content.closest('[inert]')).toBeNull()
    expect(actionBtn.closest('[inert]')).toBeNull()

    // Close dialog and verify all inert attributes are cleared.
    queryHtml('[data-testid="portal-close"]').click()
    await flushPromises()
    expect(appRoot.hasAttribute('inert')).toBe(false)
    expect(appMain.hasAttribute('inert')).toBe(false)
    expect(customPortal.hasAttribute('inert')).toBe(false)
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

describe('GhostDialogContent focus readiness and targets (GHO-209)', () => {
  interface HarnessOptions {
    open?: ReturnType<typeof ref<boolean>>
    onOpenChange?: (open: boolean) => void
    focusReady?: ReturnType<typeof ref<boolean>>
    initialFocus?: () => HTMLElement | null
    returnFocus?: () => HTMLElement | null
    showTrigger?: ReturnType<typeof ref<boolean>>
    triggerDisabled?: ReturnType<typeof ref<boolean>>
    portal?: boolean
    defaultOpen?: boolean
  }

  // A child that registers its own focus target through a callback ref, the
  // way the anchored DatePicker registers its Calendar grid cell.
  const registeredTarget = ref<HTMLElement | null>(null)
  const RegisteringChild = defineComponent({
    setup() {
      return () =>
        h(
          'button',
          {
            type: 'button',
            'data-testid': 'registered',
            ref: (el: unknown) => {
              registeredTarget.value = el instanceof HTMLElement ? el : null
            },
          },
          'Registered',
        )
    },
  })

  function mountHarness(options: HarnessOptions = {}) {
    return mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDialog,
              {
                ...(options.open
                  ? {
                      open: options.open.value,
                      'onUpdate:open': (value: boolean) => {
                        options.onOpenChange?.(value)
                      },
                    }
                  : {}),
                defaultOpen: options.defaultOpen ?? false,
              },
              {
                default: () => [
                  options.showTrigger?.value === false
                    ? null
                    : h(
                        GhostDialogTrigger,
                        {
                          'data-testid': 'trigger',
                          disabled: options.triggerDisabled?.value ?? false,
                        },
                        () => 'Open',
                      ),
                  h('input', { 'data-testid': 'input' }),
                  h(
                    GhostDialogContent,
                    {
                      'aria-label': 'Picker',
                      portal: options.portal ?? true,
                      focusReady: options.focusReady?.value ?? true,
                      initialFocus: options.initialFocus,
                      returnFocus: options.returnFocus,
                    },
                    () => [
                      h(
                        'button',
                        { type: 'button', 'data-testid': 'first' },
                        'First',
                      ),
                      h(RegisteringChild),
                      h(
                        GhostDialogClose,
                        { 'data-testid': 'close' },
                        () => 'X',
                      ),
                    ],
                  ),
                ],
              },
            )
        },
      }),
    )
  }

  it('defers focus entry until focusReady, then keeps the trap when readiness drops', async () => {
    const focusReady = ref(false)
    const initialFocus = vi.fn(() => registeredTarget.value)
    const wrapper = mountHarness({ focusReady, initialFocus })
    const trigger = wrapper.get<HTMLElement>('[data-testid="trigger"]').element

    await wrapper.get('[data-testid="trigger"]').trigger('click')
    await flushPromises()
    expect(queryHtml('[data-part="content"]')).toBeTruthy()
    // Modal isolation applies immediately; focus entry waits.
    expect(document.body.style.overflow).toBe('hidden')
    expect(document.activeElement).toBe(trigger)
    expect(initialFocus).not.toHaveBeenCalled()

    focusReady.value = true
    await flushPromises()
    expect(initialFocus).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(queryHtml('[data-testid="registered"]'))

    // Readiness flipping back off does not release the trap or refocus.
    focusReady.value = false
    await flushPromises()
    const close = queryHtml('[data-testid="close"]')
    close.focus()
    expect(pressKey('Tab', close).defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(queryHtml('[data-testid="first"]'))
    expect(initialFocus).toHaveBeenCalledTimes(1)

    pressKey('Escape')
    await flushPromises()
    expect(document.querySelector('[data-part="content"]')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('gates each opening separately', async () => {
    const focusReady = ref(true)
    const wrapper = mountHarness({ focusReady })
    const trigger = wrapper.get('[data-testid="trigger"]')

    await trigger.trigger('click')
    await flushPromises()
    expect(document.activeElement).toBe(queryHtml('[data-testid="first"]'))
    pressKey('Escape')
    await flushPromises()
    expect(document.activeElement).toBe(trigger.element)

    focusReady.value = false
    await flushPromises()
    await trigger.trigger('click')
    await flushPromises()
    expect(document.activeElement).toBe(trigger.element)
    focusReady.value = true
    await flushPromises()
    expect(document.activeElement).toBe(queryHtml('[data-testid="first"]'))
  })

  it('returns focus to the saved opener when deferred entry closes before activation', async () => {
    const focusReady = ref(false)
    const wrapper = mountHarness({ focusReady })
    const trigger = wrapper.get<HTMLElement>('[data-testid="trigger"]').element

    await wrapper.get('[data-testid="trigger"]').trigger('click')
    await flushPromises()
    // Browsers blur an element once it becomes inert; jsdom does not, so
    // simulate that drop explicitly.
    trigger.blur()
    expect(document.activeElement).toBe(document.body)

    pressKey('Escape')
    await flushPromises()
    expect(document.querySelector('[data-part="content"]')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('falls back from an invalid initialFocus target to the default autofocus order', async () => {
    const detached = document.createElement('button')
    const wrapper = mountHarness({ initialFocus: () => detached })
    await wrapper.get('[data-testid="trigger"]').trigger('click')
    await flushPromises()
    expect(document.activeElement).toBe(queryHtml('[data-testid="first"]'))
  })

  it('returns focus to an enabled trigger, else the input, when the opener is disabled or removed', async () => {
    const showTrigger = ref(true)
    const triggerDisabled = ref(false)
    let triggerEl: HTMLElement | null = null
    let inputEl: HTMLElement | null = null
    const returnFocus = vi.fn(() =>
      triggerEl?.isConnected && !triggerEl.hasAttribute('disabled')
        ? triggerEl
        : inputEl,
    )
    const wrapper = mountHarness({ showTrigger, triggerDisabled, returnFocus })
    triggerEl = wrapper.get<HTMLElement>('[data-testid="trigger"]').element
    inputEl = wrapper.get<HTMLElement>('[data-testid="input"]').element

    await wrapper.get('[data-testid="trigger"]').trigger('click')
    await flushPromises()
    expect(returnFocus).not.toHaveBeenCalled()
    pressKey('Escape')
    await flushPromises()
    expect(returnFocus).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(triggerEl)

    // Disabled opener: resolver chooses the input.
    await wrapper.get('[data-testid="trigger"]').trigger('click')
    await flushPromises()
    triggerDisabled.value = true
    await flushPromises()
    pressKey('Escape')
    await flushPromises()
    expect(document.activeElement).toBe(inputEl)

    // Removed opener: resolver chooses the input.
    triggerDisabled.value = false
    await flushPromises()
    await wrapper.get('[data-testid="trigger"]').trigger('click')
    await flushPromises()
    showTrigger.value = false
    await flushPromises()
    queryHtml('[data-testid="close"]').click()
    await flushPromises()
    expect(document.querySelector('[data-part="content"]')).toBeNull()
    expect(document.activeElement).toBe(inputEl)
  })

  it('keeps the saved opener when returnFocus resolves an invalid target', async () => {
    const wrapper = mountHarness({ returnFocus: () => null })
    const trigger = wrapper.get<HTMLElement>('[data-testid="trigger"]').element
    await wrapper.get('[data-testid="trigger"]').trigger('click')
    await flushPromises()
    pressKey('Escape')
    await flushPromises()
    expect(document.activeElement).toBe(trigger)
  })

  it('does not restore focus or call returnFocus when a controlled parent ignores close', async () => {
    const open = ref(true)
    const onOpenChange = vi.fn()
    const returnFocus = vi.fn(() => null)
    mountHarness({ open, onOpenChange, returnFocus })
    await flushPromises()
    const first = queryHtml('[data-testid="first"]')
    expect(document.activeElement).toBe(first)

    pressKey('Escape')
    await flushPromises()
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(queryHtml('[data-part="content"]')).toBeTruthy()
    expect(returnFocus).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(first)
    // Trap is still active.
    const close = queryHtml('[data-testid="close"]')
    close.focus()
    expect(pressKey('Tab', close).defaultPrevented).toBe(true)
  })

  it('renders on the server without invoking resolvers and hydrates an initially open, not-yet-ready dialog', async () => {
    const initialFocus = vi.fn(() => registeredTarget.value)
    const returnFocus = vi.fn(() => null)
    const focusReady = ref(false)
    const App = defineComponent({
      setup() {
        return () =>
          h(
            GhostDialog,
            { defaultOpen: true },
            {
              default: () =>
                h(
                  GhostDialogContent,
                  {
                    'aria-label': 'SSR picker',
                    portal: false,
                    focusReady: focusReady.value,
                    initialFocus,
                    returnFocus,
                  },
                  () => [
                    h('button', { type: 'button' }, 'First'),
                    h(RegisteringChild),
                  ],
                ),
            },
          )
      },
    })

    const html = await renderToString(createSSRApp(App))
    expect(html).toContain('SSR picker')
    expect(initialFocus).not.toHaveBeenCalled()
    expect(returnFocus).not.toHaveBeenCalled()

    const container = document.createElement('div')
    container.innerHTML = html
    document.body.append(container)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const app = createSSRApp(App)
    app.mount(container)
    await flushPromises()
    const messages = [...warn.mock.calls, ...error.mock.calls]
      .flat()
      .map(String)
      .filter((text) => text.toLowerCase().includes('hydration'))
    expect(messages).toEqual([])
    expect(initialFocus).not.toHaveBeenCalled()

    focusReady.value = true
    await flushPromises()
    expect(initialFocus).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(
      container.querySelector('[data-testid="registered"]'),
    )

    // Unmount releases trap listeners, inert, and scroll lock.
    const remove = vi.spyOn(document, 'removeEventListener')
    app.unmount()
    expect(remove).toHaveBeenCalledWith('keydown', expect.any(Function), true)
    expect(document.body.style.overflow).toBe('')
    container.remove()
  })

  it('keeps nested dialogs layered when the inner one defers focus entry', async () => {
    const innerReady = ref(false)
    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDialog,
              { defaultOpen: true },
              {
                default: () =>
                  h(GhostDialogContent, { 'aria-label': 'Outer' }, () => [
                    h('button', { 'data-testid': 'outer-first' }, 'Outer'),
                    h(GhostDialog, null, {
                      default: () => [
                        h(
                          GhostDialogTrigger,
                          { 'data-testid': 'inner-trigger' },
                          () => 'Inner',
                        ),
                        h(
                          GhostDialogContent,
                          {
                            'aria-label': 'Inner',
                            focusReady: innerReady.value,
                          },
                          () => [
                            h(
                              'button',
                              { 'data-testid': 'inner-first' },
                              'Inner first',
                            ),
                          ],
                        ),
                      ],
                    }),
                  ]),
              },
            )
        },
      }),
    )
    await flushPromises()
    const innerTrigger = queryHtml('[data-testid="inner-trigger"]')
    innerTrigger.click()
    await flushPromises()
    expect(document.activeElement).toBe(innerTrigger)

    innerReady.value = true
    await flushPromises()
    const innerFirst = queryHtml('[data-testid="inner-first"]')
    expect(document.activeElement).toBe(innerFirst)
    expect(pressKey('Tab', innerFirst).defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(innerFirst)

    pressKey('Escape')
    await flushPromises()
    expect(document.querySelector('[data-testid="inner-first"]')).toBeNull()
    expect(document.activeElement).toBe(innerTrigger)
    expect(queryHtml('[data-testid="outer-first"]')).toBeTruthy()
  })
})
