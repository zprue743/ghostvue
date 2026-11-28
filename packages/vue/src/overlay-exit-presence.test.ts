import type * as FloatingDom from '@floating-ui/dom'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref, type Component } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import GhostCommandPalette from './GhostCommandPalette.vue'
import GhostCommandPaletteContent from './GhostCommandPaletteContent.vue'
import GhostCommandPaletteInput from './GhostCommandPaletteInput.vue'
import GhostCommandPaletteOverlay from './GhostCommandPaletteOverlay.vue'
import GhostCommandPaletteTitle from './GhostCommandPaletteTitle.vue'
import GhostDialog from './GhostDialog.vue'
import GhostDialogContent from './GhostDialogContent.vue'
import GhostDialogOverlay from './GhostDialogOverlay.vue'
import GhostDialogTitle from './GhostDialogTitle.vue'
import GhostDialogTrigger from './GhostDialogTrigger.vue'
import GhostDrawer from './GhostDrawer.vue'
import GhostDrawerContent from './GhostDrawerContent.vue'
import GhostDrawerOverlay from './GhostDrawerOverlay.vue'
import GhostDrawerTitle from './GhostDrawerTitle.vue'
import GhostDrawerTrigger from './GhostDrawerTrigger.vue'
import GhostHoverCard from './GhostHoverCard.vue'
import GhostHoverCardContent from './GhostHoverCardContent.vue'
import GhostHoverCardTrigger from './GhostHoverCardTrigger.vue'
import GhostPopover from './GhostPopover.vue'
import GhostPopoverContent from './GhostPopoverContent.vue'
import GhostPopoverTrigger from './GhostPopoverTrigger.vue'

let computePositionOverride:
  | ((
      ...args: Parameters<typeof FloatingDom.computePosition>
    ) => ReturnType<typeof FloatingDom.computePosition>)
  | null = null

vi.mock('@floating-ui/dom', async () => {
  const actual = await vi.importActual<typeof FloatingDom>('@floating-ui/dom')
  return {
    ...actual,
    computePosition: (
      reference: Parameters<typeof actual.computePosition>[0],
      floating: Parameters<typeof actual.computePosition>[1],
      config?: Parameters<typeof actual.computePosition>[2],
    ) =>
      computePositionOverride
        ? computePositionOverride(reference, floating, config)
        : actual.computePosition(reference, floating, config),
  }
})

/**
 * jsdom has no Web Animations. Give every surface matching `selector` one
 * running exit transition per close, whose completion the test controls.
 */
const pendingExits: { element: Element; finish: () => void }[] = []
let animatedSelector = ''

function fakeExitAnimation(element: Element): Animation {
  let finish!: () => void
  const finished = new Promise<void>((resolve) => {
    finish = resolve
  })
  pendingExits.push({ element, finish })
  return {
    effect: {
      target: element,
      pseudoElement: null,
      getComputedTiming: () => ({ endTime: 120, localTime: 0, iterations: 1 }),
      getTiming: () => ({}),
    },
    finished,
    playState: 'running',
    playbackRate: 1,
  } as unknown as Animation
}

beforeEach(() => {
  HTMLElement.prototype.getAnimations = function getAnimations(
    this: HTMLElement,
  ) {
    return animatedSelector && this.matches(animatedSelector)
      ? [fakeExitAnimation(this)]
      : []
  }
})

const attached: { unmount: () => void }[] = []

afterEach(() => {
  for (const wrapper of attached) {
    wrapper.unmount()
  }
  attached.length = 0
  pendingExits.length = 0
  animatedSelector = ''
  computePositionOverride = null
  Reflect.deleteProperty(HTMLElement.prototype, 'getAnimations')
  document.body.innerHTML = ''
})

function mountAttached(component: Component) {
  const wrapper = mount(component, { attachTo: document.body })
  attached.push(wrapper)
  return wrapper
}

function query(selector: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(selector)
}

function pressEscape(target: EventTarget = document): void {
  target.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    }),
  )
}

async function finishExits(): Promise<void> {
  for (const exit of pendingExits.splice(0)) {
    exit.finish()
  }
  await flushPromises()
}

function expectExiting(element: HTMLElement | null): void {
  expect(element).not.toBeNull()
  expect(element?.isConnected).toBe(true)
  expect(element?.getAttribute('data-state')).toBe('closed')
  expect(element?.style.pointerEvents).toBe('none')
}

describe('GhostDialog exit presence (modal fixture)', () => {
  function mountDialog(options: { controlledOpen?: boolean } = {}) {
    const background = document.createElement('button')
    background.textContent = 'Background'
    background.setAttribute('data-testid', 'background')
    document.body.append(background)
    const updates: boolean[] = []
    const visible = ref(true)
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            visible.value
              ? h(
                  GhostDialog,
                  options.controlledOpen === undefined
                    ? {
                        'onUpdate:open': (open: boolean) => updates.push(open),
                      }
                    : {
                        open: options.controlledOpen,
                        'onUpdate:open': (open: boolean) => updates.push(open),
                      },
                  {
                    default: () => [
                      h(GhostDialogTrigger, null, () => 'Open'),
                      h(GhostDialogOverlay),
                      h(GhostDialogContent, null, () => [
                        h(GhostDialogTitle, null, () => 'Rename'),
                        h('button', { type: 'button', id: 'inside' }, 'Inside'),
                      ]),
                    ],
                  },
                )
              : null
        },
      }),
    )
    return { wrapper, background, updates, visible }
  }

  it('releases focus, scroll lock and background inert at logical close, then removes the DOM after the exit', async () => {
    animatedSelector = '.ghost-dialog-content, .ghost-dialog-overlay'
    const { wrapper, background, updates } = mountDialog()
    const trigger = wrapper.get('[data-part="trigger"]')
    await trigger.trigger('click')
    await flushPromises()
    const content = query('.ghost-dialog-content')
    const overlay = query('.ghost-dialog-overlay')
    expect(document.activeElement?.id).toBe('inside')
    expect(document.body.style.overflow).toBe('hidden')
    expect(background.hasAttribute('inert')).toBe(true)

    pressEscape()
    await nextTick()
    await nextTick()

    expect(updates).toEqual([true, false])
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expectExiting(content)
    expect(content?.hasAttribute('inert')).toBe(true)
    expectExiting(overlay)
    expect(overlay?.getAttribute('aria-hidden')).toBe('true')
    expect(document.activeElement).toBe(trigger.element)
    expect(document.body.style.overflow).toBe('')
    expect(background.hasAttribute('inert')).toBe(false)

    await finishExits()
    expect(query('.ghost-dialog-content')).toBeNull()
    expect(query('.ghost-dialog-overlay')).toBeNull()
    // DOM removal never moves focus a second time.
    expect(document.activeElement).toBe(trigger.element)
  })

  it('reopening mid-exit reuses the same node and ignores the stale completion', async () => {
    animatedSelector = '.ghost-dialog-content'
    const { wrapper, background } = mountDialog()
    const trigger = wrapper.get('[data-part="trigger"]')
    await trigger.trigger('click')
    await flushPromises()
    const content = query('.ghost-dialog-content')

    pressEscape()
    await flushPromises()
    const stale = pendingExits.splice(0)
    expectExiting(content)

    await trigger.trigger('click')
    await flushPromises()
    expect(query('.ghost-dialog-content')).toBe(content)
    expect(content?.getAttribute('data-state')).toBe('open')
    expect(content?.hasAttribute('inert')).toBe(false)
    expect(content?.style.pointerEvents).toBe('')
    expect(document.activeElement?.id).toBe('inside')
    expect(document.body.style.overflow).toBe('hidden')
    expect(background.hasAttribute('inert')).toBe(true)

    for (const exit of stale) {
      exit.finish()
    }
    content?.dispatchEvent(new Event('transitionend', { bubbles: true }))
    await flushPromises()
    expect(query('.ghost-dialog-content')).toBe(content)
    expect(trigger.attributes('aria-expanded')).toBe('true')

    pressEscape()
    await flushPromises()
    expect(trigger.attributes('aria-expanded')).toBe('false')
  })

  it('never enters exiting when a controlled parent ignores update:open(false)', async () => {
    animatedSelector = '.ghost-dialog-content'
    const { updates } = mountDialog({ controlledOpen: true })
    await flushPromises()
    const content = query('.ghost-dialog-content')
    pressEscape()
    await flushPromises()
    expect(updates).toEqual([false])
    expect(content?.getAttribute('data-state')).toBe('open')
    expect(content?.hasAttribute('inert')).toBe(false)
    expect(pendingExits).toHaveLength(0)
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('owner unmount mid-exit removes the portaled DOM and every lock', async () => {
    animatedSelector = '.ghost-dialog-content, .ghost-dialog-overlay'
    const { wrapper, background, visible } = mountDialog()
    await wrapper.get('[data-part="trigger"]').trigger('click')
    await flushPromises()
    pressEscape()
    await flushPromises()
    expectExiting(query('.ghost-dialog-content'))

    visible.value = false
    await flushPromises()
    expect(query('.ghost-dialog-content')).toBeNull()
    expect(query('.ghost-dialog-overlay')).toBeNull()
    expect(document.body.style.overflow).toBe('')
    expect(background.hasAttribute('inert')).toBe(false)
    await finishExits()
  })

  it('unmounts in the close flush without motion (headless default)', async () => {
    const { wrapper } = mountDialog()
    await wrapper.get('[data-part="trigger"]').trigger('click')
    await flushPromises()
    pressEscape()
    await nextTick()
    await nextTick()
    expect(query('.ghost-dialog-content')).toBeNull()
    expect(query('.ghost-dialog-overlay')).toBeNull()
  })
})

describe('GhostPopover exit presence (non-modal fixture)', () => {
  function mountPopover() {
    return mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(GhostPopover, null, {
              default: () => [
                h(GhostPopoverTrigger, null, () => 'Share'),
                h(GhostPopoverContent, null, () =>
                  h('button', { type: 'button', id: 'copy' }, 'Copy link'),
                ),
              ],
            })
        },
      }),
    )
  }

  it('keeps coordinates and data-placement while exiting, then cleans up', async () => {
    animatedSelector = '.ghost-popover-content'
    computePositionOverride = () =>
      Promise.resolve({
        x: 40,
        y: 24,
        placement: 'top',
        strategy: 'absolute',
        middlewareData: {},
      })
    const wrapper = mountPopover()
    const trigger = wrapper.get('[data-part="trigger"]')
    await trigger.trigger('click')
    await flushPromises()
    const content = query('.ghost-popover-content')
    expect(content?.getAttribute('data-placement')).toBe('top')
    expect(document.activeElement?.id).toBe('copy')

    pressEscape()
    await flushPromises()
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expectExiting(content)
    expect(content?.hasAttribute('inert')).toBe(true)
    expect(content?.getAttribute('data-placement')).toBe('top')
    expect(content?.style.left).toBe('40px')
    expect(content?.style.top).toBe('24px')
    expect(content?.style.visibility).toBe('')
    expect(document.activeElement).toBe(trigger.element)

    await finishExits()
    expect(query('.ghost-popover-content')).toBeNull()
  })

  it('skips exit retention when closed before the first position resolved', async () => {
    animatedSelector = '.ghost-popover-content'
    computePositionOverride = () => new Promise(() => undefined)
    const wrapper = mountPopover()
    const trigger = wrapper.get('[data-part="trigger"]')
    await trigger.trigger('click')
    await flushPromises()
    expect(query('.ghost-popover-content')?.style.visibility).toBe('hidden')

    await trigger.trigger('click')
    await flushPromises()
    expect(query('.ghost-popover-content')).toBeNull()
    expect(pendingExits).toHaveLength(0)
  })

  it('reopens on the same node mid-exit', async () => {
    animatedSelector = '.ghost-popover-content'
    const wrapper = mountPopover()
    const trigger = wrapper.get('[data-part="trigger"]')
    await trigger.trigger('click')
    await flushPromises()
    const content = query('.ghost-popover-content')
    await trigger.trigger('click')
    await flushPromises()
    expectExiting(content)
    await trigger.trigger('click')
    await flushPromises()
    expect(query('.ghost-popover-content')).toBe(content)
    expect(content?.getAttribute('data-state')).toBe('open')
    expect(content?.hasAttribute('inert')).toBe(false)
    await finishExits()
    expect(query('.ghost-popover-content')).toBe(content)
  })
})

describe('other approved hosts retain their surface through the exit', () => {
  it('GhostDrawer content and overlay keep side and direction hooks while exiting', async () => {
    animatedSelector = '.ghost-drawer-content, .ghost-drawer-overlay'
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDrawer,
              { side: 'end' },
              {
                default: () => [
                  h(GhostDrawerTrigger, null, () => 'Filters'),
                  h(GhostDrawerOverlay),
                  h(GhostDrawerContent, null, () =>
                    h(GhostDrawerTitle, null, () => 'Filters'),
                  ),
                ],
              },
            )
        },
      }),
    )
    await wrapper.get('[data-part="trigger"]').trigger('click')
    await flushPromises()
    pressEscape()
    await flushPromises()
    const content = query('.ghost-drawer-content')
    expectExiting(content)
    expect(content?.getAttribute('data-side')).toBe('end')
    expect(content?.getAttribute('data-dir')).toBe('ltr')
    expectExiting(query('.ghost-drawer-overlay'))
    await finishExits()
    expect(query('.ghost-drawer-content')).toBeNull()
    expect(query('.ghost-drawer-overlay')).toBeNull()
  })

  it('GhostCommandPalette content and overlay exit after logical close', async () => {
    animatedSelector =
      '.ghost-command-palette-content, .ghost-command-palette-overlay'
    const open = ref(true)
    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostCommandPalette,
              {
                open: open.value,
                'onUpdate:open': (next: boolean) => {
                  open.value = next
                },
              },
              {
                default: () => [
                  h(GhostCommandPaletteOverlay),
                  h(GhostCommandPaletteContent, null, () => [
                    h(GhostCommandPaletteTitle, null, () => 'Commands'),
                    h(GhostCommandPaletteInput),
                  ]),
                ],
              },
            )
        },
      }),
    )
    await flushPromises()
    open.value = false
    await flushPromises()
    expectExiting(query('.ghost-command-palette-content'))
    expect(query('.ghost-command-palette-content')?.hasAttribute('inert')).toBe(
      true,
    )
    expectExiting(query('.ghost-command-palette-overlay'))
    await finishExits()
    expect(query('.ghost-command-palette-content')).toBeNull()
  })

  it('GhostHoverCard content keeps pointer-events none over its auto default while exiting', async () => {
    animatedSelector = '.ghost-hover-card-content'
    const open = ref(true)
    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostHoverCard,
              {
                open: open.value,
                'onUpdate:open': (next: boolean) => {
                  open.value = next
                },
              },
              {
                default: () => [
                  h(GhostHoverCardTrigger, { href: '#profile' }, () => '@ada'),
                  h(GhostHoverCardContent, null, () => 'Ada Lovelace'),
                ],
              },
            )
        },
      }),
    )
    await flushPromises()
    const content = query('.ghost-hover-card-content')
    expect(content?.style.pointerEvents).toBe('auto')
    open.value = false
    await flushPromises()
    expectExiting(content)
    expect(content?.hasAttribute('inert')).toBe(true)
    await finishExits()
    expect(query('.ghost-hover-card-content')).toBeNull()
  })
})
