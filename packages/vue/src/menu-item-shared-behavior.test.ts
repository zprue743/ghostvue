import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref, type Ref, type VNode } from 'vue'

import GhostContextMenu from './GhostContextMenu.vue'
import GhostContextMenuCheckboxItem from './GhostContextMenuCheckboxItem.vue'
import GhostContextMenuContent from './GhostContextMenuContent.vue'
import GhostContextMenuItem from './GhostContextMenuItem.vue'
import GhostContextMenuRadioGroup from './GhostContextMenuRadioGroup.vue'
import GhostContextMenuRadioItem from './GhostContextMenuRadioItem.vue'
import GhostContextMenuTrigger from './GhostContextMenuTrigger.vue'
import GhostDropdownMenu from './GhostDropdownMenu.vue'
import GhostDropdownMenuCheckboxItem from './GhostDropdownMenuCheckboxItem.vue'
import GhostDropdownMenuContent from './GhostDropdownMenuContent.vue'
import GhostDropdownMenuItem from './GhostDropdownMenuItem.vue'
import GhostDropdownMenuRadioGroup from './GhostDropdownMenuRadioGroup.vue'
import GhostDropdownMenuRadioItem from './GhostDropdownMenuRadioItem.vue'
import GhostDropdownMenuTrigger from './GhostDropdownMenuTrigger.vue'
import GhostMenubar from './GhostMenubar.vue'
import GhostMenubarCheckboxItem from './GhostMenubarCheckboxItem.vue'
import GhostMenubarContent from './GhostMenubarContent.vue'
import GhostMenubarItem from './GhostMenubarItem.vue'
import GhostMenubarMenu from './GhostMenubarMenu.vue'
import GhostMenubarRadioGroup from './GhostMenubarRadioGroup.vue'
import GhostMenubarRadioItem from './GhostMenubarRadioItem.vue'
import GhostMenubarTrigger from './GhostMenubarTrigger.vue'

/**
 * GHO-179 cross-family contract: DropdownMenu, ContextMenu and Menubar item
 * parts share their disabled-first click prefix, consumer listener merging and
 * checkbox keyboard activation through `menu-item-activation.ts`. These cases
 * pin the observable behavior every family must keep, including the parts
 * that intentionally stay family/item specific (emit-before-cancel for
 * ordinary and radio items, toggle-only-when-not-cancelled for checkboxes).
 */

type PartChildren = () => string | VNode[]

/**
 * Parts are wrapped in render functions (rather than stored as `Component`
 * values) so the family table stays fully typed under type-aware lint.
 */
type PartRender = (
  props: Record<string, unknown>,
  children: PartChildren,
) => VNode

/** Radio items require `value`, so their props type keeps it mandatory. */
type RadioItemRender = (
  props: { value: string } & Record<string, unknown>,
  children: PartChildren,
) => VNode

interface MenuFamily {
  name: string
  Item: PartRender
  CheckboxItem: PartRender
  RadioGroup: PartRender
  RadioItem: RadioItemRender
  /** Keydown on the trigger that opens this family's menu. */
  openKey: KeyboardEventInit
  render: (
    open: Ref<boolean>,
    triggerProps: Record<string, unknown>,
    children: () => VNode[],
  ) => VNode
}

function controlledOpen(open: Ref<boolean>): Record<string, unknown> {
  return {
    open: open.value,
    'onUpdate:open': (value: boolean) => {
      open.value = value
    },
  }
}

const families: MenuFamily[] = [
  {
    name: 'DropdownMenu',
    Item: (props, children) => h(GhostDropdownMenuItem, props, children),
    CheckboxItem: (props, children) =>
      h(GhostDropdownMenuCheckboxItem, props, children),
    RadioGroup: (props, children) =>
      h(GhostDropdownMenuRadioGroup, props, children),
    RadioItem: (props, children) =>
      h(GhostDropdownMenuRadioItem, props, children),
    openKey: { key: 'ArrowDown' },
    render: (open, triggerProps, children) =>
      h(GhostDropdownMenu, controlledOpen(open), {
        default: () => [
          h(GhostDropdownMenuTrigger, triggerProps, () => 'Menu'),
          h(GhostDropdownMenuContent, { portal: false }, children),
        ],
      }),
  },
  {
    name: 'ContextMenu',
    Item: (props, children) => h(GhostContextMenuItem, props, children),
    CheckboxItem: (props, children) =>
      h(GhostContextMenuCheckboxItem, props, children),
    RadioGroup: (props, children) =>
      h(GhostContextMenuRadioGroup, props, children),
    RadioItem: (props, children) =>
      h(GhostContextMenuRadioItem, props, children),
    openKey: { key: 'F10', shiftKey: true },
    render: (open, triggerProps, children) =>
      h(GhostContextMenu, controlledOpen(open), {
        default: () => [
          h(GhostContextMenuTrigger, triggerProps, () => 'Area'),
          h(GhostContextMenuContent, { portal: false }, children),
        ],
      }),
  },
  {
    name: 'Menubar',
    Item: (props, children) => h(GhostMenubarItem, props, children),
    CheckboxItem: (props, children) =>
      h(GhostMenubarCheckboxItem, props, children),
    RadioGroup: (props, children) => h(GhostMenubarRadioGroup, props, children),
    RadioItem: (props, children) => h(GhostMenubarRadioItem, props, children),
    openKey: { key: 'ArrowDown' },
    render: (open, triggerProps, children) =>
      h(GhostMenubar, null, {
        default: () => [
          h(GhostMenubarMenu, controlledOpen(open), {
            default: () => [
              h(GhostMenubarTrigger, triggerProps, () => 'File'),
              h(GhostMenubarContent, { portal: false }, children),
            ],
          }),
        ],
      }),
  },
]

const attached: ReturnType<typeof mount>[] = []

afterEach(() => {
  for (const wrapper of attached) {
    wrapper.unmount()
  }
  attached.length = 0
})

async function mountMenu(
  family: MenuFamily,
  open: Ref<boolean>,
  children: () => VNode[],
  triggerProps: Record<string, unknown> = {},
): Promise<void> {
  const wrapper = mount(
    defineComponent({
      setup() {
        return () => family.render(open, triggerProps, children)
      },
    }),
    { attachTo: document.body },
  )
  attached.push(wrapper)
  await flushPromises()
}

function byTestId(id: string): HTMLElement {
  const element = document.querySelector(`[data-testid="${id}"]`)
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Expected [data-testid="${id}"] to be an HTMLElement`)
  }
  return element
}

function clickEvent(target: HTMLElement): MouseEvent {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true })
  target.dispatchEvent(event)
  return event
}

function keydown(target: HTMLElement, init: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ...init,
  })
  target.dispatchEvent(event)
  return event
}

/** Vue types listeners as one function; arrays are what merged `v-on` yields. */
function listenerArray(
  ...fns: ((event: MouseEvent) => void)[]
): (event: MouseEvent) => void {
  return fns as unknown as (event: MouseEvent) => void
}

describe.each(families)('$name item parts (shared contract)', (family) => {
  it('runs consumer onClick arrays in order before select, then closes', async () => {
    const open = ref(true)
    const log: string[] = []
    await mountMenu(family, open, () => [
      family.Item(
        {
          'data-testid': 'item',
          onClick: listenerArray(
            () => log.push('click:first'),
            () => log.push('click:second'),
          ),
          onSelect: (event: Event) => {
            log.push(`select:${String(event.defaultPrevented)}`)
          },
        },
        () => 'Item',
      ),
    ])

    clickEvent(byTestId('item'))
    await flushPromises()

    expect(log).toEqual(['click:first', 'click:second', 'select:false'])
    expect(open.value).toBe(false)
  })

  it('emits select even when consumer onClick cancels, and stays open', async () => {
    const open = ref(true)
    const onSelect = vi.fn((event: Event) => event.defaultPrevented)
    await mountMenu(family, open, () => [
      family.Item(
        {
          'data-testid': 'item',
          onClick: (event: MouseEvent) => {
            event.preventDefault()
          },
          onSelect,
        },
        () => 'Item',
      ),
    ])

    clickEvent(byTestId('item'))
    await flushPromises()

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveReturnedWith(true)
    expect(open.value).toBe(true)
  })

  it('keeps the menu open when a select listener cancels', async () => {
    const open = ref(true)
    await mountMenu(family, open, () => [
      family.Item(
        {
          'data-testid': 'item',
          onSelect: (event: Event) => {
            event.preventDefault()
          },
        },
        () => 'Item',
      ),
    ])

    clickEvent(byTestId('item'))
    await flushPromises()

    expect(open.value).toBe(true)
  })

  it('commits radio value and emits select before honoring consumer cancellation', async () => {
    const open = ref(true)
    const model = ref('a')
    const log: string[] = []
    await mountMenu(family, open, () => [
      family.RadioGroup(
        {
          modelValue: model.value,
          'onUpdate:modelValue': (next: string) => {
            log.push(`model:${next}`)
            model.value = next
          },
        },
        () => [
          family.RadioItem(
            {
              value: 'b',
              'data-testid': 'radio-b',
              onClick: (event: MouseEvent) => {
                log.push('click')
                event.preventDefault()
              },
              onSelect: (value: string) => log.push(`select:${value}`),
            },
            () => 'B',
          ),
          family.RadioItem({ value: 'c', 'data-testid': 'radio-c' }, () => 'C'),
        ],
      ),
    ])

    clickEvent(byTestId('radio-b'))
    await flushPromises()
    expect(log).toEqual(['click', 'model:b', 'select:b'])
    expect(open.value).toBe(true)
    expect(byTestId('radio-b').getAttribute('aria-checked')).toBe('true')

    clickEvent(byTestId('radio-c'))
    await flushPromises()
    expect(model.value).toBe('c')
    expect(open.value).toBe(false)
  })

  it('toggles checkbox items only when the click is not cancelled, without closing', async () => {
    const open = ref(true)
    const checked = ref(false)
    const updates: boolean[] = []
    const cancel = ref(true)
    const consumer = vi.fn((event: MouseEvent) => {
      if (cancel.value) {
        event.preventDefault()
      }
    })
    await mountMenu(family, open, () => [
      family.CheckboxItem(
        {
          checked: checked.value,
          'data-testid': 'checkbox',
          onClick: listenerArray(() => undefined, consumer),
          'onUpdate:checked': (next: boolean) => {
            updates.push(next)
            checked.value = next
          },
        },
        () => 'Checkbox',
      ),
    ])

    clickEvent(byTestId('checkbox'))
    await flushPromises()
    expect(consumer).toHaveBeenCalledTimes(1)
    expect(updates).toEqual([])

    cancel.value = false
    clickEvent(byTestId('checkbox'))
    await flushPromises()
    expect(updates).toEqual([true])
    expect(byTestId('checkbox').getAttribute('aria-checked')).toBe('true')
    expect(open.value).toBe(true)
  })

  it('activates checkbox items from Enter and Space through the click path', async () => {
    const open = ref(true)
    const checked = ref(false)
    const consumer = vi.fn()
    await mountMenu(family, open, () => [
      family.CheckboxItem(
        {
          checked: checked.value,
          'data-testid': 'checkbox',
          onClick: consumer,
          'onUpdate:checked': (next: boolean) => {
            checked.value = next
          },
        },
        () => 'Checkbox',
      ),
    ])
    const host = byTestId('checkbox')
    host.focus()

    expect(keydown(host, { key: 'Enter' }).defaultPrevented).toBe(true)
    await flushPromises()
    expect(checked.value).toBe(true)
    expect(consumer).toHaveBeenCalledTimes(1)
    expect(consumer.mock.calls[0]?.[0]).toBeInstanceOf(MouseEvent)

    keydown(host, { key: ' ' })
    await flushPromises()
    expect(checked.value).toBe(false)
    expect(consumer).toHaveBeenCalledTimes(2)

    // IME-owned keys confirm a composition rather than toggling the item.
    expect(
      keydown(host, { key: 'Enter', isComposing: true }).defaultPrevented,
    ).toBe(false)
    await flushPromises()
    expect(checked.value).toBe(false)
    expect(consumer).toHaveBeenCalledTimes(2)
    expect(open.value).toBe(true)
  })

  it('blocks consumer handlers, emits and state changes on disabled items first', async () => {
    const open = ref(true)
    const consumer = vi.fn()
    const onSelect = vi.fn()
    const onChecked = vi.fn()
    const onModel = vi.fn()
    await mountMenu(family, open, () => [
      family.Item(
        {
          disabled: true,
          'data-testid': 'item',
          onClick: listenerArray(consumer, consumer),
          onSelect,
        },
        () => 'Item',
      ),
      family.CheckboxItem(
        {
          disabled: true,
          'data-testid': 'checkbox',
          onClick: consumer,
          'onUpdate:checked': onChecked,
        },
        () => 'Checkbox',
      ),
      family.RadioGroup(
        { defaultValue: 'a', 'onUpdate:modelValue': onModel },
        () => [
          family.RadioItem(
            {
              value: 'b',
              disabled: true,
              'data-testid': 'radio-disabled',
              onClick: consumer,
              onSelect,
            },
            () => 'B',
          ),
        ],
      ),
      family.RadioGroup(
        {
          defaultValue: 'a',
          disabled: true,
          'onUpdate:modelValue': onModel,
        },
        () => [
          family.RadioItem(
            {
              value: 'c',
              'data-testid': 'radio-group-disabled',
              onClick: consumer,
              onSelect,
            },
            () => 'C',
          ),
        ],
      ),
    ])

    for (const id of [
      'item',
      'checkbox',
      'radio-disabled',
      'radio-group-disabled',
    ]) {
      const host = byTestId(id)
      expect(host.getAttribute('aria-disabled')).toBe('true')
      expect(clickEvent(host).defaultPrevented).toBe(true)
    }
    keydown(byTestId('checkbox'), { key: 'Enter' })
    await flushPromises()

    expect(consumer).not.toHaveBeenCalled()
    expect(onSelect).not.toHaveBeenCalled()
    expect(onChecked).not.toHaveBeenCalled()
    expect(onModel).not.toHaveBeenCalled()
    expect(open.value).toBe(true)
  })

  it('passes consumer class, style and attrs through while keeping library semantics', async () => {
    const open = ref(true)
    const consumer = vi.fn()
    await mountMenu(family, open, () => [
      family.Item(
        {
          class: 'consumer-item',
          style: { color: 'rgb(1, 2, 3)' },
          role: 'button',
          'data-testid': 'item',
          'aria-label': 'Custom label',
          onClick: consumer,
          onSelect: (event: Event) => {
            event.preventDefault()
          },
        },
        () => 'Item',
      ),
      family.CheckboxItem(
        {
          class: 'consumer-checkbox',
          style: 'margin-top: 3px',
          'data-testid': 'checkbox',
        },
        () => 'Checkbox',
      ),
      family.RadioGroup({ defaultValue: 'a' }, () => [
        family.RadioItem(
          {
            value: 'a',
            class: ['consumer-radio'],
            style: { paddingLeft: '4px' },
            'data-testid': 'radio',
          },
          () => 'A',
        ),
      ]),
    ])

    const item = byTestId('item')
    expect(item.classList.contains('consumer-item')).toBe(true)
    expect(item.style.color).toBe('rgb(1, 2, 3)')
    expect(item.getAttribute('aria-label')).toBe('Custom label')
    expect(item.getAttribute('role')).toBe('menuitem')
    expect(item.getAttribute('data-part')).toBe('item')

    const checkbox = byTestId('checkbox')
    expect(checkbox.classList.contains('consumer-checkbox')).toBe(true)
    expect(checkbox.style.marginTop).toBe('3px')
    expect(checkbox.getAttribute('role')).toBe('menuitemcheckbox')

    const radio = byTestId('radio')
    expect(radio.classList.contains('consumer-radio')).toBe(true)
    expect(radio.style.paddingLeft).toBe('4px')
    expect(radio.getAttribute('role')).toBe('menuitemradio')

    // The part owns the click listener; the consumer copy must not also be
    // bound natively, or it would run twice and bypass the disabled guard.
    clickEvent(item)
    expect(consumer).toHaveBeenCalledTimes(1)
  })

  it('activates ordinary items once from the keyboard', async () => {
    const open = ref(true)
    const consumer = vi.fn()
    const onSelect = vi.fn()
    await mountMenu(family, open, () => [
      family.Item(
        { 'data-testid': 'item', onClick: consumer, onSelect },
        () => 'Item',
      ),
    ])
    const host = byTestId('item')
    host.focus()

    keydown(host, { key: 'Enter' })
    await flushPromises()

    expect(consumer).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(open.value).toBe(false)
  })

  it('runs trigger consumer keydown arrays first and lets them cancel opening', async () => {
    const open = ref(false)
    const log: string[] = []
    await mountMenu(family, open, () => [family.Item({}, () => 'Item')], {
      'data-testid': 'trigger',
      onKeydown: [
        () => log.push('first'),
        (event: KeyboardEvent) => {
          log.push('second')
          event.preventDefault()
        },
      ] as unknown as (event: KeyboardEvent) => void,
    })
    const trigger = byTestId('trigger')
    trigger.focus()

    keydown(trigger, family.openKey)
    await flushPromises()

    expect(log).toEqual(['first', 'second'])
    expect(open.value).toBe(false)
  })

  it('skips trigger consumer keydown handlers while the trigger is disabled', async () => {
    const open = ref(false)
    const consumer = vi.fn()
    await mountMenu(family, open, () => [family.Item({}, () => 'Item')], {
      'data-testid': 'trigger',
      disabled: true,
      onKeydown: consumer,
    })

    keydown(byTestId('trigger'), family.openKey)
    await flushPromises()

    expect(consumer).not.toHaveBeenCalled()
    expect(open.value).toBe(false)
  })
})
