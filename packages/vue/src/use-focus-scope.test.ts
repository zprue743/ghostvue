import { mount } from '@vue/test-utils'
import { createSSRApp, defineComponent, h, nextTick, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useDismissableLayer } from './use-dismissable-layer'
import { useFocusScope } from './use-focus-scope'

const attached: ReturnType<typeof mount>[] = []

afterEach(() => {
  for (const wrapper of attached) {
    wrapper.unmount()
  }
  attached.length = 0
})

function mountScope(setup: () => unknown, render: () => ReturnType<typeof h>) {
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

function tab(target: EventTarget, shiftKey = false): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key: 'Tab',
    bubbles: true,
    cancelable: true,
    shiftKey,
  })
  target.dispatchEvent(event)
  return event
}

function buttonElement(
  wrapper: ReturnType<typeof mount>,
  index: number | 'last',
): HTMLElement {
  const buttons = wrapper.findAll('button')
  const node = index === 'last' ? buttons[buttons.length - 1] : buttons[index]
  if (!node) {
    throw new Error('expected a button')
  }
  return node.element
}

describe('useFocusScope', () => {
  it('does not touch the document during setup so SSR render stays side-effect free', async () => {
    const add = vi.spyOn(document, 'addEventListener')
    const Comp = defineComponent({
      setup() {
        const container = ref<HTMLElement | null>(null)
        useFocusScope(container, { trapped: true })
        return () => h('div', { ref: container }, [h('button', 'Inside')])
      },
    })

    const html = await renderToString(createSSRApp(Comp))
    expect(html).toContain('Inside')
    expect(add).not.toHaveBeenCalledWith(
      'keydown',
      expect.any(Function),
      expect.anything(),
    )
    add.mockRestore()
  })

  it('autofocuses the first tabbable descendant on activate', async () => {
    const container = ref<HTMLElement | null>(null)
    mountScope(
      () => {
        useFocusScope(container, { trapped: true })
      },
      () =>
        h('div', { ref: container, tabindex: '-1' }, [
          h('button', { type: 'button' }, 'First'),
          h('button', { type: 'button' }, 'Second'),
        ]),
    )

    await nextTick()
    expect(document.activeElement?.textContent).toBe('First')
  })

  it('autofocuses the first visible tabbable when earlier stops sit in a hidden subtree', async () => {
    const container = ref<HTMLElement | null>(null)
    mountScope(
      () => {
        useFocusScope(container, { trapped: true, loop: true, autoFocus: true })
      },
      () =>
        h('div', { ref: container, tabindex: '-1', role: 'dialog' }, [
          h(
            'div',
            { style: { display: 'none' } },
            h('button', { type: 'button' }, 'Hidden'),
          ),
          h('button', { type: 'button', 'data-testid': 'visible' }, 'Visible'),
        ]),
    )

    await nextTick()
    expect(document.activeElement?.textContent).toBe('Visible')
  })

  it('prefers a data-autofocus element over the first tabbable', async () => {
    const container = ref<HTMLElement | null>(null)
    mountScope(
      () => {
        useFocusScope(container, { autoFocus: true })
      },
      () =>
        h('div', { ref: container, tabindex: '-1' }, [
          h('button', { type: 'button' }, 'First'),
          h('button', { type: 'button', 'data-autofocus': '' }, 'Named'),
        ]),
    )

    await nextTick()
    expect(document.activeElement?.textContent).toBe('Named')
  })

  it('does not move focus when autoFocus is false', async () => {
    const outside = document.createElement('button')
    outside.type = 'button'
    outside.textContent = 'Outside'
    document.body.append(outside)
    outside.focus()

    const container = ref<HTMLElement | null>(null)
    mountScope(
      () => {
        useFocusScope(container, { autoFocus: false })
      },
      () =>
        h('div', { ref: container }, [
          h('button', { type: 'button' }, 'Inside'),
        ]),
    )

    await nextTick()
    expect(document.activeElement).toBe(outside)
    outside.remove()
  })

  it('loops Tab from the last tabbable to the first when trapped', async () => {
    const container = ref<HTMLElement | null>(null)
    const wrapper = mountScope(
      () => {
        useFocusScope(container, { trapped: true, loop: true })
      },
      () =>
        h('div', { ref: container, tabindex: '-1' }, [
          h('button', { type: 'button' }, 'First'),
          h('button', { type: 'button' }, 'Last'),
        ]),
    )

    await nextTick()
    const last = buttonElement(wrapper, 'last')
    last.focus()
    const event = tab(last)
    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement?.textContent).toBe('First')
  })

  it('loops Shift+Tab from the first tabbable to the last when trapped', async () => {
    const container = ref<HTMLElement | null>(null)
    const wrapper = mountScope(
      () => {
        useFocusScope(container, { trapped: true, loop: true })
      },
      () =>
        h('div', { ref: container, tabindex: '-1' }, [
          h('button', { type: 'button' }, 'First'),
          h('button', { type: 'button' }, 'Last'),
        ]),
    )

    await nextTick()
    const first = wrapper.get('button').element
    first.focus()
    const event = tab(first, true)
    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement?.textContent).toBe('Last')
  })

  it('does not intercept Tab when trapped is false', () => {
    const container = ref<HTMLElement | null>(null)
    const wrapper = mountScope(
      () => {
        useFocusScope(container, { trapped: false, autoFocus: false })
      },
      () =>
        h('div', { ref: container }, [h('button', { type: 'button' }, 'Only')]),
    )

    const button = wrapper.get('button').element
    button.focus()
    const event = tab(button)
    expect(event.defaultPrevented).toBe(false)
  })

  it('keeps focus on the edge item when trapped without loop', () => {
    const container = ref<HTMLElement | null>(null)
    const wrapper = mountScope(
      () => {
        useFocusScope(container, {
          trapped: true,
          loop: false,
          autoFocus: false,
        })
      },
      () =>
        h('div', { ref: container, tabindex: '-1' }, [
          h('button', { type: 'button' }, 'First'),
          h('button', { type: 'button' }, 'Last'),
        ]),
    )

    const last = buttonElement(wrapper, 'last')
    last.focus()
    const event = tab(last)
    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(last)
  })

  it('lets only the top-most nested trapped scope handle Tab', () => {
    const outer = ref<HTMLElement | null>(null)
    const inner = ref<HTMLElement | null>(null)
    const wrapper = mount(
      defineComponent({
        setup() {
          useFocusScope(outer, { trapped: true, loop: true, autoFocus: false })
          useFocusScope(inner, { trapped: true, loop: true, autoFocus: false })
          return () =>
            h('div', { ref: outer, tabindex: '-1' }, [
              h('button', { type: 'button' }, 'Outer first'),
              h('div', { ref: inner, tabindex: '-1' }, [
                h('button', { type: 'button' }, 'Inner first'),
                h('button', { type: 'button' }, 'Inner last'),
              ]),
              h('button', { type: 'button' }, 'Outer last'),
            ])
        },
      }),
      { attachTo: document.body },
    )
    attached.push(wrapper)

    const innerLast = wrapper
      .findAll('button')
      .find((node) => node.text() === 'Inner last')
    expect(innerLast).toBeDefined()
    innerLast?.element.focus()
    const event = tab(innerLast?.element ?? document.body)
    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement?.textContent).toBe('Inner first')
  })

  it('lets the innermost separate child component own Tab when parent and child mount together', async () => {
    const showChild = ref(true)
    const ChildScope = defineComponent({
      setup() {
        const inner = ref<HTMLElement | null>(null)
        useFocusScope(inner, { trapped: true, loop: true, autoFocus: false })
        return () =>
          h('div', { ref: inner, tabindex: '-1' }, [
            h(
              'button',
              { type: 'button', 'data-testid': 'inner-first' },
              'Inner first',
            ),
            h(
              'button',
              { type: 'button', 'data-testid': 'inner-last' },
              'Inner last',
            ),
          ])
      },
    })

    const ParentScope = defineComponent({
      setup() {
        const outer = ref<HTMLElement | null>(null)
        useFocusScope(outer, { trapped: true, loop: true, autoFocus: false })
        return () =>
          h('div', { ref: outer, tabindex: '-1' }, [
            h(
              'button',
              { type: 'button', 'data-testid': 'outer-first' },
              'Outer first',
            ),
            showChild.value ? h(ChildScope) : null,
            h(
              'button',
              { type: 'button', 'data-testid': 'outer-last' },
              'Outer last',
            ),
          ])
      },
    })

    const wrapper = mount(ParentScope, { attachTo: document.body })
    attached.push(wrapper)

    const innerFirst = wrapper.get<HTMLElement>(
      '[data-testid="inner-first"]',
    ).element
    const innerLast = wrapper.get<HTMLElement>(
      '[data-testid="inner-last"]',
    ).element

    innerLast.focus()
    const forward = tab(innerLast)
    expect(forward.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(innerFirst)

    const backward = tab(innerFirst, true)
    expect(backward.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(innerLast)

    // Unmounting the child returns Tab ownership to the parent scope.
    showChild.value = false
    await nextTick()

    const outerFirst = wrapper.get<HTMLElement>(
      '[data-testid="outer-first"]',
    ).element
    const outerLast = wrapper.get<HTMLElement>(
      '[data-testid="outer-last"]',
    ).element
    outerLast.focus()
    const parentWrap = tab(outerLast)
    expect(parentWrap.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(outerFirst)
  })

  it('keeps Tab owned by an already-mounted child when an ancestor becomes trapped later', async () => {
    const parentTrapped = ref(false)
    const ChildScope = defineComponent({
      setup() {
        const inner = ref<HTMLElement | null>(null)
        useFocusScope(inner, { trapped: true, loop: true, autoFocus: false })
        return () =>
          h('div', { ref: inner, tabindex: '-1' }, [
            h(
              'button',
              { type: 'button', 'data-testid': 'inner-first' },
              'Inner first',
            ),
            h(
              'button',
              { type: 'button', 'data-testid': 'inner-last' },
              'Inner last',
            ),
          ])
      },
    })

    const ParentScope = defineComponent({
      setup() {
        const outer = ref<HTMLElement | null>(null)
        useFocusScope(outer, {
          trapped: parentTrapped,
          loop: true,
          autoFocus: false,
        })
        return () =>
          h('div', { ref: outer, tabindex: '-1' }, [
            h(
              'button',
              { type: 'button', 'data-testid': 'outer-first' },
              'Outer first',
            ),
            h(ChildScope),
            h(
              'button',
              { type: 'button', 'data-testid': 'outer-last' },
              'Outer last',
            ),
          ])
      },
    })

    const wrapper = mount(ParentScope, { attachTo: document.body })
    attached.push(wrapper)

    parentTrapped.value = true
    await nextTick()

    const innerFirst = wrapper.get<HTMLElement>(
      '[data-testid="inner-first"]',
    ).element
    const innerLast = wrapper.get<HTMLElement>(
      '[data-testid="inner-last"]',
    ).element
    innerLast.focus()
    const event = tab(innerLast)
    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(innerFirst)
  })

  it('preserves autofocus and restoreFocus across nested trapped components', async () => {
    const showChild = ref(false)
    const ChildScope = defineComponent({
      setup() {
        const inner = ref<HTMLElement | null>(null)
        useFocusScope(inner, {
          trapped: true,
          loop: true,
          autoFocus: true,
          restoreFocus: true,
        })
        return () =>
          h('div', { ref: inner, tabindex: '-1' }, [
            h(
              'button',
              { type: 'button', 'data-testid': 'inner-first' },
              'Inner first',
            ),
            h(
              'button',
              { type: 'button', 'data-testid': 'inner-last' },
              'Inner last',
            ),
          ])
      },
    })

    const ParentScope = defineComponent({
      setup() {
        const outer = ref<HTMLElement | null>(null)
        useFocusScope(outer, {
          trapped: true,
          loop: true,
          autoFocus: true,
          restoreFocus: true,
        })
        return () =>
          h('div', { ref: outer, tabindex: '-1' }, [
            h(
              'button',
              { type: 'button', 'data-testid': 'outer-trigger' },
              'Outer trigger',
            ),
            showChild.value ? h(ChildScope) : null,
          ])
      },
    })

    const outside = document.createElement('button')
    outside.type = 'button'
    outside.textContent = 'Outside'
    document.body.append(outside)
    outside.focus()

    const wrapper = mount(ParentScope, { attachTo: document.body })
    attached.push(wrapper)

    await nextTick()
    const outerTrigger = wrapper.get<HTMLElement>(
      '[data-testid="outer-trigger"]',
    ).element
    expect(document.activeElement).toBe(outerTrigger)

    showChild.value = true
    await nextTick()
    const innerFirst = wrapper.get<HTMLElement>(
      '[data-testid="inner-first"]',
    ).element
    const innerLast = wrapper.get<HTMLElement>(
      '[data-testid="inner-last"]',
    ).element
    expect(document.activeElement).toBe(innerFirst)

    innerLast.focus()
    const event = tab(innerLast)
    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(innerFirst)

    showChild.value = false
    await nextTick()
    expect(document.activeElement).toBe(outerTrigger)

    wrapper.unmount()
    expect(document.activeElement).toBe(outside)
    outside.remove()
  })

  it('restores focus to the previously focused element on unmount', async () => {
    const outside = document.createElement('button')
    outside.type = 'button'
    outside.textContent = 'Trigger'
    document.body.append(outside)
    outside.focus()

    const container = ref<HTMLElement | null>(null)
    const wrapper = mountScope(
      () => {
        useFocusScope(container, { restoreFocus: true, autoFocus: true })
      },
      () =>
        h('div', { ref: container, tabindex: '-1' }, [
          h('button', { type: 'button' }, 'Inside'),
        ]),
    )

    await nextTick()
    expect(document.activeElement?.textContent).toBe('Inside')
    wrapper.unmount()
    expect(document.activeElement).toBe(outside)
    outside.remove()
  })

  it('removes the keydown listener on unmount', () => {
    const container = ref<HTMLElement | null>(null)
    const wrapper = mountScope(
      () => {
        useFocusScope(container, { trapped: true, autoFocus: false })
      },
      () =>
        h('div', { ref: container }, [
          h('button', { type: 'button' }, 'Inside'),
        ]),
    )

    wrapper.unmount()
    const stray = document.createElement('button')
    stray.type = 'button'
    document.body.append(stray)
    stray.focus()
    const event = tab(stray)
    expect(event.defaultPrevented).toBe(false)
    stray.remove()
  })

  it('ignores Tab when focus is inside a dismissable layer stacked above the scope layer', async () => {
    const dialog = ref<HTMLElement | null>(null)
    const popover = ref<HTMLElement | null>(null)
    const popoverOpen = ref(false)

    const wrapper = mountScope(
      () => {
        useDismissableLayer(dialog, { onDismiss: () => undefined })
        useFocusScope(dialog, {
          trapped: true,
          loop: true,
          autoFocus: false,
        })
        useDismissableLayer(popover, { onDismiss: () => undefined })
        useFocusScope(popover, {
          trapped: false,
          autoFocus: true,
          restoreFocus: true,
        })
      },
      () =>
        h('div', [
          h('div', { ref: dialog, tabindex: '-1' }, [
            h('button', { type: 'button', 'data-testid': 'dialog-btn' }, 'In'),
          ]),
          popoverOpen.value
            ? h('div', { ref: popover, tabindex: '-1' }, [
                h(
                  'button',
                  { type: 'button', 'data-testid': 'popover-first' },
                  'Pop 1',
                ),
                h(
                  'button',
                  { type: 'button', 'data-testid': 'popover-last' },
                  'Pop 2',
                ),
              ])
            : null,
        ]),
    )

    popoverOpen.value = true
    await nextTick()

    const popFirst = wrapper.get<HTMLElement>(
      '[data-testid="popover-first"]',
    ).element
    expect(document.activeElement).toBe(popFirst)

    // Tab and Shift+Tab inside the upper dismissable layer must not be prevented
    // or yanked back into the dialog trap.
    const forward = tab(popFirst)
    expect(forward.defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(popFirst)

    const popLast = wrapper.get<HTMLElement>(
      '[data-testid="popover-last"]',
    ).element
    popLast.focus()
    const backward = tab(popLast, true)
    expect(backward.defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(popLast)

    // If focus moves back into the dialog while popover is open, dialog still traps.
    const dialogBtn = wrapper.get<HTMLElement>(
      '[data-testid="dialog-btn"]',
    ).element
    dialogBtn.focus()
    const insideDialog = tab(dialogBtn)
    expect(insideDialog.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(dialogBtn)

    // Once the popover closes, the dialog trap continues owning Tab.
    popoverOpen.value = false
    await nextTick()
    dialogBtn.focus()
    expect(tab(dialogBtn).defaultPrevented).toBe(true)
  })

  it('still pulls focus back when focus is inside a dismissable layer stacked below the scope layer', () => {
    const lower = ref<HTMLElement | null>(null)
    const dialog = ref<HTMLElement | null>(null)

    const wrapper = mountScope(
      () => {
        useDismissableLayer(lower, { onDismiss: () => undefined })
        useDismissableLayer(dialog, { onDismiss: () => undefined })
        useFocusScope(dialog, {
          trapped: true,
          loop: true,
          autoFocus: false,
        })
      },
      () =>
        h('div', [
          h('div', { ref: lower }, [
            h(
              'button',
              { type: 'button', 'data-testid': 'lower-btn' },
              'Lower',
            ),
          ]),
          h('div', { ref: dialog, tabindex: '-1' }, [
            h(
              'button',
              { type: 'button', 'data-testid': 'dialog-btn' },
              'Dialog',
            ),
          ]),
        ]),
    )

    const lowerBtn = wrapper.get<HTMLElement>(
      '[data-testid="lower-btn"]',
    ).element
    lowerBtn.focus()
    const event = tab(lowerBtn)
    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(
      wrapper.get<HTMLElement>('[data-testid="dialog-btn"]').element,
    )
  })

  it('matches an enclosing dismissable layer when finding upper layers for Tab', async () => {
    const layerWrapper = ref<HTMLElement | null>(null)
    const scopeRoot = ref<HTMLElement | null>(null)
    const popover = ref<HTMLElement | null>(null)
    const popoverOpen = ref(false)

    const wrapper = mountScope(
      () => {
        useDismissableLayer(layerWrapper, { onDismiss: () => undefined })
        useFocusScope(scopeRoot, {
          trapped: true,
          loop: true,
          autoFocus: false,
        })
        useDismissableLayer(popover, { onDismiss: () => undefined })
      },
      () =>
        h('div', [
          h('div', { ref: layerWrapper }, [
            h('div', { ref: scopeRoot, tabindex: '-1' }, [
              h('button', { type: 'button' }, 'Modal'),
            ]),
          ]),
          popoverOpen.value
            ? h('div', { ref: popover }, [
                h(
                  'button',
                  { type: 'button', 'data-testid': 'upper-btn' },
                  'Upper',
                ),
              ])
            : null,
        ]),
    )

    popoverOpen.value = true
    await nextTick()

    const upperBtn = wrapper.get<HTMLElement>(
      '[data-testid="upper-btn"]',
    ).element
    upperBtn.focus()
    expect(tab(upperBtn).defaultPrevented).toBe(false)
  })

  it('keeps Tab trapped when focus is inside an inline dismissable layer contained within the scope', async () => {
    const dialog = ref<HTMLElement | null>(null)
    const inlinePopover = ref<HTMLElement | null>(null)
    const popoverOpen = ref(false)

    const wrapper = mountScope(
      () => {
        useDismissableLayer(dialog, { onDismiss: () => undefined })
        useFocusScope(dialog, {
          trapped: true,
          loop: true,
          autoFocus: false,
        })
        useDismissableLayer(inlinePopover, { onDismiss: () => undefined })
      },
      () =>
        h('div', { ref: dialog, tabindex: '-1' }, [
          h(
            'button',
            { type: 'button', 'data-testid': 'dialog-first' },
            'Dialog first',
          ),
          popoverOpen.value
            ? h('div', { ref: inlinePopover, tabindex: '-1' }, [
                h(
                  'button',
                  { type: 'button', 'data-testid': 'inline-last' },
                  'Inline popover last',
                ),
              ])
            : null,
        ]),
    )

    popoverOpen.value = true
    await nextTick()

    const inlineLast = wrapper.get<HTMLElement>(
      '[data-testid="inline-last"]',
    ).element
    inlineLast.focus()
    const event = tab(inlineLast)
    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(
      wrapper.get<HTMLElement>('[data-testid="dialog-first"]').element,
    )
  })

  it('contains Shift+Tab from a tabindex=-1 data-autofocus heading before the first tabbable', async () => {
    const loop = ref(true)
    const container = ref<HTMLElement | null>(null)
    const wrapper = mountScope(
      () => {
        useFocusScope(container, { trapped: true, loop, autoFocus: true })
      },
      () =>
        h('div', { ref: container, tabindex: '-1' }, [
          h(
            'h2',
            { tabindex: '-1', 'data-autofocus': '', 'data-testid': 'heading' },
            'Dialog heading',
          ),
          h('button', { type: 'button' }, 'First'),
          h('button', { type: 'button' }, 'Last'),
        ]),
    )

    await nextTick()
    const heading = wrapper.get<HTMLElement>('[data-testid="heading"]').element
    expect(document.activeElement).toBe(heading)

    const forward = tab(heading)
    expect(forward.defaultPrevented).toBe(false)

    const backwardLoop = tab(heading, true)
    expect(backwardLoop.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(buttonElement(wrapper, 'last'))

    loop.value = false
    heading.focus()
    const backwardNoLoop = tab(heading, true)
    expect(backwardNoLoop.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(heading)
  })

  it('contains Shift+Tab when focus rests on the non-tabbable scope root', () => {
    const loop = ref(true)
    const container = ref<HTMLElement | null>(null)
    const wrapper = mountScope(
      () => {
        useFocusScope(container, { trapped: true, loop, autoFocus: false })
      },
      () =>
        h('div', { ref: container, tabindex: '-1', 'data-testid': 'root' }, [
          h('button', { type: 'button' }, 'First'),
          h('button', { type: 'button' }, 'Last'),
        ]),
    )

    const root = wrapper.get<HTMLElement>('[data-testid="root"]').element
    root.focus()
    expect(document.activeElement).toBe(root)

    const forward = tab(root)
    expect(forward.defaultPrevented).toBe(false)

    const backwardLoop = tab(root, true)
    expect(backwardLoop.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(buttonElement(wrapper, 'last'))

    loop.value = false
    root.focus()
    const backwardNoLoop = tab(root, true)
    expect(backwardNoLoop.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(root)
  })

  it('contains Tab from a non-tabbable element after the last tabbable and allows internal movement from middle non-tabbables', async () => {
    const container = ref<HTMLElement | null>(null)
    const wrapper = mountScope(
      () => {
        useFocusScope(container, { trapped: true, loop: true, autoFocus: true })
      },
      () =>
        h('div', { ref: container, tabindex: '-1' }, [
          h('button', { type: 'button' }, 'First'),
          h(
            'p',
            { tabindex: '-1', 'data-autofocus': '', 'data-testid': 'middle' },
            'Middle note',
          ),
          h('button', { type: 'button' }, 'Last'),
          h(
            'p',
            { tabindex: '-1', 'data-testid': 'trailing' },
            'Trailing note',
          ),
        ]),
    )

    await nextTick()
    const middle = wrapper.get<HTMLElement>('[data-testid="middle"]').element
    expect(document.activeElement).toBe(middle)
    expect(tab(middle).defaultPrevented).toBe(false)
    expect(tab(middle, true).defaultPrevented).toBe(false)

    const trailing = wrapper.get<HTMLElement>(
      '[data-testid="trailing"]',
    ).element
    trailing.focus()
    expect(tab(trailing, true).defaultPrevented).toBe(false)

    const forwardTrailing = tab(trailing)
    expect(forwardTrailing.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(buttonElement(wrapper, 0))
  })
})
