import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { GhostButton } from '../../packages/themes/src/ghost-button'
import {
  GhostDrawer,
  type GhostDrawerSlotProps,
} from '../../packages/themes/src/ghost-drawer'
import {
  GhostDrawerClose,
  type GhostDrawerCloseExposed,
} from '../../packages/themes/src/ghost-drawer-close'
import {
  GhostDrawerContent,
  type GhostDrawerContentExposed,
} from '../../packages/themes/src/ghost-drawer-content'
import {
  GhostDrawerDescription,
  type GhostDrawerDescriptionExposed,
} from '../../packages/themes/src/ghost-drawer-description'
import {
  GhostDrawerOverlay,
  type GhostDrawerOverlayExposed,
} from '../../packages/themes/src/ghost-drawer-overlay'
import {
  GhostDrawerTitle,
  type GhostDrawerTitleExposed,
} from '../../packages/themes/src/ghost-drawer-title'
import {
  GhostDrawerTrigger,
  type GhostDrawerTriggerExposed,
} from '../../packages/themes/src/ghost-drawer-trigger'

const attached: ReturnType<typeof mount>[] = []

function queryHtml(selector: string): HTMLElement {
  const element = document.querySelector(selector)
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Expected HTMLElement matching selector: ${selector}`)
  }
  return element
}

function mountAttached(component: Parameters<typeof mount>[0]) {
  const wrapper = mount(component, { attachTo: document.body })
  attached.push(wrapper)
  return wrapper
}

function pressKey(key: string, target: EventTarget = document): void {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
  )
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

describe('themed GhostDrawer wrappers', () => {
  it('forwards open, modal, side, dir, slot props, and update:open', async () => {
    const updates: boolean[] = []
    let latestSlot: GhostDrawerSlotProps | undefined

    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDrawer,
              {
                defaultOpen: true,
                side: 'top',
                dir: 'rtl',
                'onUpdate:open': (next: boolean) => updates.push(next),
              },
              {
                default: (slotProps: GhostDrawerSlotProps) => {
                  latestSlot = slotProps
                  return [
                    h(GhostDrawerTrigger, null, () => 'Open'),
                    h(GhostDrawerOverlay),
                    h(
                      GhostDrawerContent,
                      { 'aria-label': 'Sheet', class: 'consumer' },
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

    const content = queryHtml('[data-part="content"]')
    const overlay = queryHtml('[data-part="overlay"]')
    expect(latestSlot).toMatchObject({ open: true, side: 'top' })
    expect(content.hasAttribute('data-themed')).toBe(true)
    expect(overlay.hasAttribute('data-themed')).toBe(true)
    expect(content.classList.contains('ghost-drawer-content')).toBe(true)
    expect(content.classList.contains('consumer')).toBe(true)
    expect(content.dataset['side']).toBe('top')
    expect(content.dataset['dir']).toBe('rtl')
    expect(content.getAttribute('role')).toBe('dialog')
    expect(content.getAttribute('aria-modal')).toBe('true')

    latestSlot?.close()
    await flushPromises()
    expect(updates).toEqual([false])
    expect(document.querySelector('[data-part="content"]')).toBeNull()
  })

  it('supports controlled non-modal drawers with content side/dir overrides', async () => {
    const open = ref(false)
    const updates: boolean[] = []
    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDrawer,
              {
                open: open.value,
                modal: false,
                'onUpdate:open': (next: boolean) => {
                  updates.push(next)
                  open.value = next
                },
              },
              {
                default: () => [
                  h(GhostDrawerTrigger, null, () => 'Inspect row'),
                  h(GhostDrawerOverlay),
                  h(
                    GhostDrawerContent,
                    {
                      side: 'start',
                      dir: 'ltr',
                      role: 'alertdialog',
                      closeOnEscape: false,
                      closeOnOutsideClick: true,
                      portal: false,
                      portalTo: 'body',
                    },
                    () => [
                      h(GhostDrawerTitle, null, () => 'Row details'),
                      h(GhostDrawerDescription, null, () => 'Order #42'),
                    ],
                  ),
                ],
              },
            )
        },
      }),
    )
    await flushPromises()

    queryHtml('[data-part="trigger"]').click()
    await flushPromises()
    expect(updates).toEqual([true])

    const content = queryHtml('[data-part="content"]')
    expect(content.getAttribute('role')).toBe('alertdialog')
    expect(content.hasAttribute('aria-modal')).toBe(false)
    expect(content.dataset['side']).toBe('start')
    expect(content.getAttribute('dir')).toBe('ltr')
    expect(document.querySelector('[data-part="overlay"]')).toBeNull()

    pressKey('Escape')
    await flushPromises()
    expect(document.querySelector('[data-part="content"]')).not.toBeNull()

    open.value = false
    await flushPromises()
    expect(document.querySelector('[data-part="content"]')).toBeNull()
  })

  it('forwards as/disabled and exposes refs on every themed part', async () => {
    const triggerRef = ref<GhostDrawerTriggerExposed | null>(null)
    const overlayRef = ref<GhostDrawerOverlayExposed | null>(null)
    const contentRef = ref<GhostDrawerContentExposed | null>(null)
    const titleRef = ref<GhostDrawerTitleExposed | null>(null)
    const descriptionRef = ref<GhostDrawerDescriptionExposed | null>(null)
    const closeRef = ref<GhostDrawerCloseExposed | null>(null)
    const triggerDisabled = ref(true)

    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(GhostDrawer, null, {
              default: () => [
                h(
                  GhostDrawerTrigger,
                  {
                    ref: triggerRef,
                    as: GhostButton,
                    disabled: triggerDisabled.value,
                  },
                  () => 'Filters',
                ),
                h(GhostDrawerOverlay, {
                  ref: overlayRef,
                  as: 'div',
                  portal: true,
                  portalTo: 'body',
                }),
                h(GhostDrawerContent, { ref: contentRef }, () => [
                  h(
                    GhostDrawerTitle,
                    { ref: titleRef, as: 'h3' },
                    () => 'Filters',
                  ),
                  h(
                    GhostDrawerDescription,
                    { ref: descriptionRef, as: 'div' },
                    () => 'Narrow the table',
                  ),
                  h(
                    GhostDrawerClose,
                    { ref: closeRef, as: GhostButton, disabled: false },
                    () => 'Done',
                  ),
                ]),
              ],
            })
        },
      }),
    )
    await flushPromises()

    const trigger = triggerRef.value?.element
    expect(trigger).toBeInstanceOf(HTMLButtonElement)
    expect(trigger?.hasAttribute('disabled')).toBe(true)
    trigger?.click()
    await flushPromises()
    expect(contentRef.value?.element).toBeNull()

    triggerDisabled.value = false
    await nextTick()
    triggerRef.value?.focus()
    expect(document.activeElement).toBe(trigger)
    trigger?.click()
    await flushPromises()

    const content = queryHtml('[data-part="content"]')
    expect(contentRef.value?.element).toBe(content)
    expect(overlayRef.value?.element).toBe(queryHtml('[data-part="overlay"]'))
    expect(titleRef.value?.element?.tagName).toBe('H3')
    expect(descriptionRef.value?.element?.tagName).toBe('DIV')
    expect(content.getAttribute('aria-labelledby')).toBe(
      titleRef.value?.element?.id,
    )

    contentRef.value?.focus()
    expect(document.activeElement).toBe(content)
    contentRef.value?.blur()
    titleRef.value?.focus()
    titleRef.value?.blur()
    descriptionRef.value?.focus()
    descriptionRef.value?.blur()
    overlayRef.value?.focus()
    overlayRef.value?.blur()
    closeRef.value?.focus()
    expect(document.activeElement).toBe(closeRef.value?.element)
    closeRef.value?.blur()
    triggerRef.value?.blur()

    closeRef.value?.element?.click()
    await flushPromises()
    expect(document.querySelector('[data-part="content"]')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })
})
