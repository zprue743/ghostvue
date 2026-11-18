import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import GhostDialog from './GhostDialog.vue'
import GhostDialogClose from './GhostDialogClose.vue'
import GhostDialogContent from './GhostDialogContent.vue'
import GhostDialogTitle from './GhostDialogTitle.vue'
import GhostDialogTrigger from './GhostDialogTrigger.vue'
import GhostDrawer from './GhostDrawer.vue'
import GhostDrawerClose from './GhostDrawerClose.vue'
import GhostDrawerContent from './GhostDrawerContent.vue'
import GhostDrawerDescription from './GhostDrawerDescription.vue'
import GhostDrawerOverlay from './GhostDrawerOverlay.vue'
import GhostDrawerTitle from './GhostDrawerTitle.vue'
import GhostDrawerTrigger from './GhostDrawerTrigger.vue'
import {
  resolveDrawerDir,
  type GhostDrawerCloseExposed,
  type GhostDrawerContentExposed,
  type GhostDrawerDescriptionExposed,
  type GhostDrawerOverlayExposed,
  type GhostDrawerSide,
  type GhostDrawerSlotProps,
  type GhostDrawerTitleExposed,
  type GhostDrawerTriggerExposed,
} from './ghost-drawer'
import { useGhostDrawer } from './use-ghost-drawer'

const attached: ReturnType<typeof mount>[] = []

function mountAttached(
  component: Parameters<typeof mount>[0],
  attachTo: Element = document.body,
) {
  const wrapper = mount(component, { attachTo })
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

function pointerDown(target: EventTarget): void {
  target.dispatchEvent(
    new PointerEvent('pointerdown', { bubbles: true, cancelable: true }),
  )
}

async function settle(): Promise<void> {
  await nextTick()
  await nextTick()
  await nextTick()
}

/** Minimal labelled drawer with two focusable controls. */
function drawerFixture(
  rootProps: Record<string, unknown> = {},
  contentProps: Record<string, unknown> = {},
  slotSpy?: (props: GhostDrawerSlotProps) => void,
) {
  return defineComponent({
    setup() {
      return () =>
        h(GhostDrawer, rootProps, {
          default: (slotProps: GhostDrawerSlotProps) => {
            slotSpy?.(slotProps)
            return [
              h(GhostDrawerTrigger, { 'data-testid': 'trigger' }, () => 'Open'),
              h(GhostDrawerOverlay, { 'data-testid': 'overlay' }),
              h(
                GhostDrawerContent,
                { 'data-testid': 'content', ...contentProps },
                () => [
                  h(GhostDrawerTitle, null, () => 'Filters'),
                  h(GhostDrawerDescription, null, () => 'Narrow results'),
                  h('button', { 'data-testid': 'first' }, 'Apply'),
                  h(
                    GhostDrawerClose,
                    { 'data-testid': 'close' },
                    () => 'Close',
                  ),
                ],
              ),
            ]
          },
        })
    },
  })
}

afterEach(() => {
  for (const wrapper of attached) {
    wrapper.unmount()
  }
  attached.length = 0
  document.body.style.overflow = ''
  document.body.style.paddingRight = ''
  document.body.innerHTML = ''
  document.documentElement.removeAttribute('dir')
  vi.restoreAllMocks()
})

describe('resolveDrawerDir', () => {
  it('prefers explicit dir, then content ancestor, then trigger ancestor, then <html dir>', () => {
    const html = document.createElement('html')
    html.setAttribute('dir', 'ltr')
    const body = document.createElement('body')
    html.append(body)
    const rtlHost = document.createElement('div')
    rtlHost.setAttribute('dir', 'rtl')
    const trigger = document.createElement('button')
    rtlHost.append(trigger)
    const content = document.createElement('div')
    // The content's own dir attribute is a resolver output, never an input.
    content.setAttribute('dir', 'ltr')
    body.append(rtlHost, content)

    expect(
      resolveDrawerDir({
        dir: 'ltr',
        contentElement: content,
        triggerElement: trigger,
        documentElement: html,
      }),
    ).toBe('ltr')

    // Portaled content (parent <body>) skips <html dir> and falls through to
    // the trigger's localized subtree.
    expect(
      resolveDrawerDir({
        contentElement: content,
        triggerElement: trigger,
        documentElement: html,
      }),
    ).toBe('rtl')

    const ltrSection = document.createElement('section')
    ltrSection.setAttribute('dir', 'LTR')
    const inlineContent = document.createElement('div')
    ltrSection.append(inlineContent)
    rtlHost.append(ltrSection)
    expect(
      resolveDrawerDir({
        contentElement: inlineContent,
        triggerElement: trigger,
        documentElement: html,
      }),
    ).toBe('ltr')

    html.setAttribute('dir', 'rtl')
    expect(resolveDrawerDir({ documentElement: html })).toBe('rtl')
  })

  it('ignores dir="auto" and falls back to ltr during SSR (no document)', () => {
    const auto = document.createElement('div')
    auto.setAttribute('dir', 'auto')
    const trigger = document.createElement('button')
    auto.append(trigger)

    expect(
      resolveDrawerDir({ triggerElement: trigger, documentElement: null }),
    ).toBe('ltr')
    expect(resolveDrawerDir({ documentElement: null })).toBe('ltr')
    expect(resolveDrawerDir({ dir: 'rtl', documentElement: null })).toBe('rtl')

    document.documentElement.setAttribute('dir', 'rtl')
    expect(resolveDrawerDir()).toBe('rtl')
  })
})

describe('useGhostDrawer', () => {
  it('manages open state, modal, side, dir, and ghost-drawer-* IDs', () => {
    let drawer!: ReturnType<typeof useGhostDrawer>
    let controlled!: ReturnType<typeof useGhostDrawer>
    const changes: boolean[] = []
    const open = ref(false)
    const side = ref<GhostDrawerSide>('top')

    mountAttached(
      defineComponent({
        setup() {
          drawer = useGhostDrawer({
            onOpenChange: (next) => changes.push(next),
          })
          controlled = useGhostDrawer({
            open,
            modal: false,
            side,
            dir: 'rtl',
          })
          return () => h('div')
        },
      }),
    )

    expect(drawer.isModal.value).toBe(true)
    expect(drawer.side.value).toBe('end')
    expect(drawer.dir.value).toBeUndefined()
    expect(drawer.triggerId.value).toContain('ghost-drawer-trigger')
    expect(drawer.contentId.value).toContain('ghost-drawer-content')
    expect(drawer.titleId.value).toContain('ghost-drawer-title')
    expect(drawer.descriptionId.value).toContain('ghost-drawer-description')

    drawer.open()
    drawer.open()
    drawer.toggle()
    drawer.close()
    expect(changes).toEqual([true, false])

    expect(controlled.isModal.value).toBe(false)
    expect(controlled.side.value).toBe('top')
    expect(controlled.dir.value).toBe('rtl')
    side.value = 'bottom'
    expect(controlled.side.value).toBe('bottom')
    controlled.open()
    expect(controlled.isOpen.value).toBe(false)
  })
})

describe('GhostDrawer', () => {
  it('renders only the trigger while closed and links ARIA, side, and dir hooks when open', async () => {
    const slots: GhostDrawerSlotProps[] = []
    mountAttached(drawerFixture({}, {}, (props) => slots.push({ ...props })))
    await settle()

    const trigger = queryHtml('[data-testid="trigger"]')
    expect(document.querySelector('[data-testid="content"]')).toBeNull()
    expect(document.querySelector('[data-testid="overlay"]')).toBeNull()
    expect(trigger.getAttribute('type')).toBe('button')
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(trigger.getAttribute('data-state')).toBe('closed')
    expect(trigger.getAttribute('data-side')).toBe('end')
    expect(slots.at(-1)).toMatchObject({ open: false, side: 'end' })

    trigger.click()
    await settle()

    const content = queryHtml('[data-testid="content"]')
    const overlay = queryHtml('[data-testid="overlay"]')
    expect(content.parentElement).toBe(document.body)
    expect(content.classList.contains('ghost-drawer-content')).toBe(true)
    expect(overlay.classList.contains('ghost-drawer-overlay')).toBe(true)
    expect(content.getAttribute('role')).toBe('dialog')
    expect(content.getAttribute('aria-modal')).toBe('true')
    expect(content.getAttribute('tabindex')).toBe('-1')
    expect(content.getAttribute('data-part')).toBe('content')
    expect(content.getAttribute('data-state')).toBe('open')
    expect(content.getAttribute('data-side')).toBe('end')
    expect(content.getAttribute('data-dir')).toBe('ltr')
    // Plain LTR drawers keep inheriting direction rather than pinning it.
    expect(content.hasAttribute('dir')).toBe(false)
    expect(overlay.getAttribute('aria-hidden')).toBe('true')
    expect(overlay.getAttribute('data-side')).toBe('end')
    expect(trigger.getAttribute('aria-controls')).toBe(content.id)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')

    const title = queryHtml('[data-part="title"]')
    const description = queryHtml('[data-part="description"]')
    expect(title.tagName).toBe('H2')
    expect(description.tagName).toBe('P')
    expect(content.getAttribute('aria-labelledby')).toBe(title.id)
    expect(content.getAttribute('aria-describedby')).toBe(description.id)
    expect(title.id).toContain('ghost-drawer-title')
    expect(slots.at(-1)).toMatchObject({ open: true, side: 'end' })
  })

  it('lets GhostDrawerContent override side for every part and the slot', async () => {
    const slots: GhostDrawerSlotProps[] = []
    const contentSide = ref<GhostDrawerSide | undefined>('bottom')
    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDrawer,
              { side: 'start', defaultOpen: true },
              {
                default: (props: GhostDrawerSlotProps) => {
                  slots.push({ ...props })
                  return [
                    h(GhostDrawerTrigger, null, () => 'Open'),
                    h(GhostDrawerOverlay),
                    h(GhostDrawerContent, { side: contentSide.value }, () =>
                      h(GhostDrawerTitle, null, () => 'Sheet'),
                    ),
                  ]
                },
              },
            )
        },
      }),
    )
    await settle()

    expect(queryHtml('[data-part="content"]').dataset['side']).toBe('bottom')
    expect(queryHtml('[data-part="overlay"]').dataset['side']).toBe('bottom')
    expect(queryHtml('[data-part="trigger"]').dataset['side']).toBe('bottom')
    expect(slots.at(-1)?.side).toBe('bottom')

    contentSide.value = undefined
    await settle()
    expect(queryHtml('[data-part="content"]').dataset['side']).toBe('start')
    expect(queryHtml('[data-part="trigger"]').dataset['side']).toBe('start')
    expect(slots.at(-1)?.side).toBe('start')
  })

  it('resolves RTL from a localized subtree even when portaled to <body>', async () => {
    const host = document.createElement('div')
    host.setAttribute('dir', 'rtl')
    document.body.append(host)
    mountAttached(drawerFixture({ side: 'start' }), host)
    await settle()

    queryHtml('[data-testid="trigger"]').click()
    await settle()

    const content = queryHtml('[data-testid="content"]')
    expect(content.parentElement).toBe(document.body)
    expect(content.getAttribute('data-dir')).toBe('rtl')
    expect(content.getAttribute('dir')).toBe('rtl')
    expect(content.getAttribute('data-side')).toBe('start')
  })

  it('honors explicit dir on content over root and over the document', async () => {
    document.documentElement.setAttribute('dir', 'rtl')
    const contentDir = ref<'ltr' | 'rtl' | undefined>('ltr')
    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDrawer,
              { dir: 'rtl', defaultOpen: true },
              {
                default: () => [
                  h(GhostDrawerTrigger, null, () => 'Open'),
                  h(GhostDrawerContent, { dir: contentDir.value }, () =>
                    h(GhostDrawerTitle, null, () => 'Explicit'),
                  ),
                ],
              },
            )
        },
      }),
    )
    await settle()

    const content = queryHtml('[data-part="content"]')
    expect(content.getAttribute('data-dir')).toBe('ltr')
    // An explicit LTR request is written so the surface does not inherit RTL.
    expect(content.getAttribute('dir')).toBe('ltr')

    contentDir.value = undefined
    await settle()
    expect(content.getAttribute('data-dir')).toBe('rtl')
    expect(content.getAttribute('dir')).toBe('rtl')
  })

  it('falls back to <html dir> when no ancestor declares a direction', async () => {
    document.documentElement.setAttribute('dir', 'rtl')
    mountAttached(drawerFixture({ defaultOpen: true }))
    await settle()
    expect(queryHtml('[data-testid="content"]').getAttribute('data-dir')).toBe(
      'rtl',
    )
  })

  it('traps Tab, locks scroll, inerts the background, and restores focus on Escape', async () => {
    const outside = document.createElement('button')
    outside.textContent = 'Outside'
    document.body.append(outside)
    mountAttached(drawerFixture())
    await settle()

    const trigger = queryHtml('[data-testid="trigger"]')
    trigger.click()
    await settle()

    const first = queryHtml('[data-testid="first"]')
    const close = queryHtml('[data-testid="close"]')
    expect(document.activeElement).toBe(first)
    expect(document.body.style.overflow).toBe('hidden')
    expect(outside.hasAttribute('inert')).toBe(true)
    expect(queryHtml('[data-testid="content"]').hasAttribute('inert')).toBe(
      false,
    )
    expect(queryHtml('[data-testid="overlay"]').hasAttribute('inert')).toBe(
      false,
    )

    close.focus()
    const tab = pressKey('Tab', close)
    expect(tab.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(first)
    pressKey('Tab', first, { shiftKey: true })
    expect(document.activeElement).toBe(close)

    pressKey('Escape')
    await settle()
    expect(document.querySelector('[data-testid="content"]')).toBeNull()
    expect(document.body.style.overflow).toBe('')
    expect(outside.hasAttribute('inert')).toBe(false)
    expect(document.activeElement).toBe(trigger)
  })

  it('closes on overlay pointerdown and via GhostDrawerClose', async () => {
    mountAttached(drawerFixture())
    await settle()
    const trigger = queryHtml('[data-testid="trigger"]')

    trigger.click()
    await settle()
    pointerDown(queryHtml('[data-testid="overlay"]'))
    await settle()
    expect(document.querySelector('[data-testid="content"]')).toBeNull()
    expect(document.activeElement).toBe(trigger)

    trigger.click()
    await settle()
    queryHtml('[data-testid="close"]').click()
    await settle()
    expect(document.querySelector('[data-testid="content"]')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('keeps the drawer open, locked, and isolated when a controlled parent ignores update:open(false)', async () => {
    const outside = document.createElement('button')
    document.body.append(outside)
    const updates: boolean[] = []
    mountAttached(
      drawerFixture({
        open: true,
        'onUpdate:open': (next: boolean) => updates.push(next),
      }),
    )
    await settle()

    pressKey('Escape')
    await settle()
    queryHtml('[data-testid="close"]').click()
    await settle()
    pointerDown(queryHtml('[data-testid="overlay"]'))
    await settle()

    expect(updates).toEqual([false, false, false])
    const content = queryHtml('[data-testid="content"]')
    expect(content.contains(document.activeElement)).toBe(true)
    expect(document.body.style.overflow).toBe('hidden')
    expect(outside.hasAttribute('inert')).toBe(true)
  })

  it('drops the overlay, aria-modal, scroll lock, inert, and trap when modal=false', async () => {
    const outside = document.createElement('button')
    outside.textContent = 'Outside'
    document.body.append(outside)
    mountAttached(drawerFixture({ modal: false }))
    await settle()

    queryHtml('[data-testid="trigger"]').click()
    await settle()

    const content = queryHtml('[data-testid="content"]')
    expect(document.querySelector('[data-testid="overlay"]')).toBeNull()
    expect(content.hasAttribute('aria-modal')).toBe(false)
    expect(document.body.style.overflow).toBe('')
    expect(outside.hasAttribute('inert')).toBe(false)
    expect(document.activeElement).toBe(queryHtml('[data-testid="first"]'))

    const close = queryHtml('[data-testid="close"]')
    close.focus()
    expect(pressKey('Tab', close).defaultPrevented).toBe(false)

    // Clicking an outside focusable control dismisses without stealing focus back.
    pointerDown(outside)
    outside.focus()
    await settle()
    expect(document.querySelector('[data-testid="content"]')).toBeNull()
    expect(document.activeElement).toBe(outside)
  })

  it('does not steal focus from a non-modal drawer that starts open', async () => {
    const outside = document.createElement('button')
    document.body.append(outside)
    outside.focus()
    mountAttached(drawerFixture({ modal: false, defaultOpen: true }))
    await settle()
    expect(queryHtml('[data-testid="content"]')).toBeTruthy()
    expect(document.activeElement).toBe(outside)
  })

  it('honors closeOnEscape=false, closeOnOutsideClick=false, and alertdialog defaults', async () => {
    mountAttached(
      drawerFixture({}, { closeOnEscape: false, closeOnOutsideClick: false }),
    )
    await settle()
    queryHtml('[data-testid="trigger"]').click()
    await settle()
    pressKey('Escape')
    pointerDown(queryHtml('[data-testid="overlay"]'))
    await settle()
    expect(queryHtml('[data-testid="content"]')).toBeTruthy()

    attached.pop()?.unmount()
    document.body.innerHTML = ''

    mountAttached(drawerFixture({}, { role: 'alertdialog' }))
    await settle()
    queryHtml('[data-testid="trigger"]').click()
    await settle()
    expect(queryHtml('[data-testid="content"]').getAttribute('role')).toBe(
      'alertdialog',
    )
    pointerDown(queryHtml('[data-testid="overlay"]'))
    await settle()
    expect(queryHtml('[data-testid="content"]')).toBeTruthy()
    pressKey('Escape')
    await settle()
    expect(document.querySelector('[data-testid="content"]')).toBeNull()
  })

  it('stacks a nested GhostDialog above the drawer with an independent context', async () => {
    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDrawer,
              { defaultOpen: true },
              {
                default: () => [
                  h(GhostDrawerTrigger, null, () => 'Filters'),
                  h(GhostDrawerOverlay),
                  h(GhostDrawerContent, { 'data-testid': 'drawer' }, () => [
                    h(GhostDrawerTitle, null, () => 'Filters'),
                    h(GhostDialog, null, {
                      default: () => [
                        h(
                          GhostDialogTrigger,
                          { 'data-testid': 'dialog-trigger' },
                          () => 'Reset',
                        ),
                        h(
                          GhostDialogContent,
                          { 'data-testid': 'dialog' },
                          () => [
                            h(GhostDialogTitle, null, () => 'Reset filters?'),
                            h(GhostDialogClose, null, () => 'Cancel'),
                          ],
                        ),
                      ],
                    }),
                  ]),
                ],
              },
            )
        },
      }),
    )
    await settle()

    const drawer = queryHtml('[data-testid="drawer"]')
    const drawerTitle = queryHtml('[data-testid="drawer"] [data-part="title"]')
    expect(drawer.getAttribute('aria-labelledby')).toBe(drawerTitle.id)

    const dialogTrigger = queryHtml('[data-testid="dialog-trigger"]')
    dialogTrigger.click()
    await settle()
    const dialog = queryHtml('[data-testid="dialog"]')
    const dialogTitle = queryHtml('[data-testid="dialog"] [data-part="title"]')
    expect(dialog.getAttribute('aria-labelledby')).toBe(dialogTitle.id)
    expect(dialogTitle.id).toContain('ghost-dialog-title')
    // The dialog title must not have re-registered as the drawer's name.
    expect(drawer.getAttribute('aria-labelledby')).toBe(drawerTitle.id)
    expect(dialog.contains(document.activeElement)).toBe(true)

    pressKey('Escape')
    await settle()
    expect(document.querySelector('[data-testid="dialog"]')).toBeNull()
    expect(queryHtml('[data-testid="drawer"]')).toBeTruthy()
    expect(document.activeElement).toBe(dialogTrigger)

    pressKey('Escape')
    await settle()
    expect(document.querySelector('[data-testid="drawer"]')).toBeNull()
  })

  it('logs GHOST002 without a name and GHOST003 for alertdialog without a description', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDrawer,
              { defaultOpen: true },
              {
                default: () =>
                  h(GhostDrawerContent, { role: 'alertdialog' }, () =>
                    h('button', 'OK'),
                  ),
              },
            )
        },
      }),
    )
    await settle()
    const messages = warn.mock.calls.map((args) => String(args[0]))
    expect(messages.some((m) => m.includes('GHOST002'))).toBe(true)
    expect(messages.some((m) => m.includes('GHOST003'))).toBe(true)
  })

  it('supports as, disabled, keyboard activation, and exposes refs on every part', async () => {
    const triggerRef = ref<GhostDrawerTriggerExposed | null>(null)
    const overlayRef = ref<GhostDrawerOverlayExposed | null>(null)
    const contentRef = ref<GhostDrawerContentExposed | null>(null)
    const titleRef = ref<GhostDrawerTitleExposed | null>(null)
    const descriptionRef = ref<GhostDrawerDescriptionExposed | null>(null)
    const closeRef = ref<GhostDrawerCloseExposed | null>(null)
    const disabled = ref(true)

    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(GhostDrawer, null, {
              default: () => [
                h(
                  GhostDrawerTrigger,
                  { ref: triggerRef, as: 'div', disabled: disabled.value },
                  () => 'Open',
                ),
                h(GhostDrawerOverlay, { ref: overlayRef }),
                h(
                  GhostDrawerContent,
                  { ref: contentRef, 'aria-label': 'Custom name' },
                  () => [
                    h(GhostDrawerTitle, { ref: titleRef }, () => 'Title'),
                    h(
                      GhostDrawerDescription,
                      { ref: descriptionRef, id: 'custom-description' },
                      () => 'Description',
                    ),
                    h(
                      GhostDrawerClose,
                      { ref: closeRef, as: 'span' },
                      () => 'Close',
                    ),
                  ],
                ),
              ],
            })
        },
      }),
    )
    await settle()

    const trigger = queryHtml('[data-part="trigger"]')
    expect(trigger.getAttribute('role')).toBe('button')
    expect(trigger.getAttribute('aria-disabled')).toBe('true')
    expect(trigger.hasAttribute('tabindex')).toBe(false)
    trigger.click()
    pressKey('Enter', trigger)
    await settle()
    expect(document.querySelector('[data-part="content"]')).toBeNull()
    expect(contentRef.value?.element).toBeNull()

    disabled.value = false
    await settle()
    expect(trigger.getAttribute('tabindex')).toBe('0')
    expect(triggerRef.value?.element).toBe(trigger)
    triggerRef.value?.focus()
    expect(document.activeElement).toBe(trigger)
    pressKey(' ', trigger)
    await settle()

    const content = queryHtml('[data-part="content"]')
    expect(content.getAttribute('aria-label')).toBe('Custom name')
    expect(content.hasAttribute('aria-labelledby')).toBe(false)
    expect(content.getAttribute('aria-describedby')).toBe('custom-description')
    expect(contentRef.value?.element).toBe(content)
    expect(overlayRef.value?.element).toBe(queryHtml('[data-part="overlay"]'))
    expect(titleRef.value?.element).toBe(queryHtml('[data-part="title"]'))
    expect(descriptionRef.value?.element?.id).toBe('custom-description')

    const close = queryHtml('[data-part="close"]')
    expect(closeRef.value?.element).toBe(close)
    expect(close.getAttribute('role')).toBe('button')
    closeRef.value?.focus()
    expect(document.activeElement).toBe(close)
    closeRef.value?.blur()
    contentRef.value?.focus()
    expect(document.activeElement).toBe(content)
    contentRef.value?.blur()
    titleRef.value?.focus()
    descriptionRef.value?.blur()
    overlayRef.value?.focus()
    overlayRef.value?.blur()
    triggerRef.value?.blur()

    close.focus()
    pressKey('Enter', close)
    await settle()
    expect(document.querySelector('[data-part="content"]')).toBeNull()
  })

  it('throws clear errors when parts render outside GhostDrawer', () => {
    for (const part of [
      GhostDrawerTrigger,
      GhostDrawerOverlay,
      GhostDrawerContent,
      GhostDrawerTitle,
      GhostDrawerDescription,
      GhostDrawerClose,
    ]) {
      expect(() =>
        mount(
          defineComponent({
            setup() {
              return () => h(part, null, () => 'Orphan')
            },
          }),
        ),
      ).toThrow(/must be used inside GhostDrawer/)
    }
  })

  it('does not satisfy a GhostDrawer part from a GhostDialog ancestor', () => {
    expect(() =>
      mount(
        defineComponent({
          setup() {
            return () =>
              h(GhostDialog, null, {
                default: () => h(GhostDrawerTrigger, null, () => 'Wrong root'),
              })
          },
        }),
      ),
    ).toThrow(/must be used inside GhostDrawer/)
  })
})
