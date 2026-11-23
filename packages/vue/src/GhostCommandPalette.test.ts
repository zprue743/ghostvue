import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref, type Ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import GhostCommandPalette from './GhostCommandPalette.vue'
import GhostCommandPaletteContent from './GhostCommandPaletteContent.vue'
import GhostCommandPaletteEmpty from './GhostCommandPaletteEmpty.vue'
import GhostCommandPaletteGroup from './GhostCommandPaletteGroup.vue'
import GhostCommandPaletteInput from './GhostCommandPaletteInput.vue'
import GhostCommandPaletteItem from './GhostCommandPaletteItem.vue'
import GhostCommandPaletteLabel from './GhostCommandPaletteLabel.vue'
import GhostCommandPaletteList from './GhostCommandPaletteList.vue'
import GhostCommandPaletteOverlay from './GhostCommandPaletteOverlay.vue'
import GhostCommandPaletteSeparator from './GhostCommandPaletteSeparator.vue'
import GhostCommandPaletteTitle from './GhostCommandPaletteTitle.vue'
import GhostCommandPaletteTrigger from './GhostCommandPaletteTrigger.vue'
import type {
  GhostCommandPaletteCommandPayload,
  GhostCommandPaletteExposed,
  GhostCommandPaletteSearchPayload,
} from './ghost-command-palette'
import type * as ComboboxModule from './use-ghost-combobox'
import { useGhostCommandPaletteAsyncSearch } from './use-ghost-command-palette'

// Wraps the combobox composable so tests can prove palette activation never
// goes through the combobox `select()` commit path.
const { selectSpy } = vi.hoisted(() => ({ selectSpy: vi.fn() }))
vi.mock('./use-ghost-combobox', async (importOriginal) => {
  const actual = await importOriginal<typeof ComboboxModule>()
  return {
    ...actual,
    useGhostCombobox: (
      ...args: Parameters<typeof actual.useGhostCombobox>
    ): ReturnType<typeof actual.useGhostCombobox> => {
      const state = actual.useGhostCombobox(...args)
      return {
        ...state,
        select(value: string) {
          selectSpy(value)
          state.select(value)
        },
      }
    },
  }
})

interface Command {
  id: string
  label: string
  disabled?: boolean
}

const defaultCommands: Command[] = [
  { id: 'open-file', label: 'Open file' },
  { id: 'save-file', label: 'Save file', disabled: true },
  { id: 'close-tab', label: 'Close tab' },
]

interface FixtureOptions {
  props?: Record<string, unknown>
  commands?: Ref<Command[]>
  title?: boolean
  contentAttrs?: Record<string, unknown>
  separator?: boolean
  inputAttrs?: Record<string, unknown>
}

const attached: ReturnType<typeof mount>[] = []

afterEach(() => {
  for (const wrapper of attached.splice(0)) {
    wrapper.unmount()
  }
  document.body.innerHTML = ''
  selectSpy.mockClear()
  vi.restoreAllMocks()
})

function mountPalette(options: FixtureOptions = {}) {
  const commands = options.commands ?? ref([...defaultCommands])
  const paletteRef = ref<GhostCommandPaletteExposed | null>(null)
  const Fixture = defineComponent({
    setup() {
      return () => [
        h('button', { id: 'outside', type: 'button' }, 'Outside'),
        h(
          GhostCommandPalette,
          { ref: paletteRef, ...options.props },
          {
            default: () => [
              h(GhostCommandPaletteTrigger, null, () => 'Open palette'),
              h(GhostCommandPaletteOverlay),
              h(
                GhostCommandPaletteContent,
                options.contentAttrs ?? null,
                () => [
                  options.title === false
                    ? null
                    : h(GhostCommandPaletteTitle, null, () => 'Commands'),
                  h(GhostCommandPaletteInput, options.inputAttrs ?? null),
                  h(GhostCommandPaletteList, null, () => [
                    h(GhostCommandPaletteGroup, null, () => [
                      h(GhostCommandPaletteLabel, null, () => 'File'),
                      ...commands.value.map((command) =>
                        h(
                          GhostCommandPaletteItem,
                          {
                            key: command.id,
                            id: command.id,
                            disabled: command.disabled === true,
                          },
                          () => command.label,
                        ),
                      ),
                    ]),
                    options.separator
                      ? h(GhostCommandPaletteSeparator, { class: 'custom' })
                      : null,
                    h(GhostCommandPaletteEmpty, null, () => 'No commands'),
                  ]),
                ],
              ),
            ],
          },
        ),
      ]
    },
  })
  const wrapper = mount(Fixture, { attachTo: document.body })
  attached.push(wrapper)
  const palette = wrapper.findComponent(GhostCommandPalette)
  return { wrapper, palette, commands, paletteRef }
}

function query(selector: string): HTMLElement | null {
  const element = document.querySelector(selector)
  return element instanceof HTMLElement ? element : null
}

function required(selector: string): HTMLElement {
  const element = query(selector)
  if (!element) {
    throw new Error(`Expected element matching ${selector}`)
  }
  return element
}

function input(): HTMLInputElement {
  const element = required('[data-part="input"]')
  if (!(element instanceof HTMLInputElement)) {
    throw new Error('Expected native input')
  }
  return element
}

function item(id: string): HTMLElement {
  return required(`[data-part="item"][data-value="${id}"]`)
}

function press(key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  })
  ;(document.activeElement ?? document.body).dispatchEvent(event)
  return event
}

async function openPalette(): Promise<void> {
  required('[data-part="trigger"]').click()
  await flushPromises()
  await nextTick()
}

async function typeQuery(value: string): Promise<void> {
  const field = input()
  field.value = value
  field.dispatchEvent(new Event('input', { bubbles: true }))
  await flushPromises()
}

function commandEvents(
  palette: ReturnType<typeof mountPalette>['palette'],
): GhostCommandPaletteCommandPayload[] {
  return (palette.emitted('command') ?? []).map(
    (args) => args[0] as GhostCommandPaletteCommandPayload,
  )
}

describe('GhostCommandPalette', () => {
  it('opens from the trigger into a named modal dialog with combobox and listbox semantics', async () => {
    const { palette } = mountPalette()
    const trigger = required('[data-part="trigger"]')
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(query('[role="dialog"]')).toBeNull()

    trigger.focus()
    await openPalette()

    const dialog = required('[role="dialog"]')
    const title = required('[data-part="title"]')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-labelledby')).toBe(title.id)
    expect(trigger.getAttribute('aria-controls')).toBe(dialog.id)
    expect(query('[data-part="overlay"]')).not.toBeNull()
    expect(palette.emitted('update:open')).toEqual([[true]])

    const field = input()
    const list = required('[data-part="list"]')
    expect(document.activeElement).toBe(field)
    expect(field.getAttribute('role')).toBe('combobox')
    expect(field.getAttribute('aria-autocomplete')).toBe('list')
    expect(field.getAttribute('aria-expanded')).toBe('true')
    expect(field.getAttribute('aria-controls')).toBe(list.id)
    // Without its own name the input borrows the palette title.
    expect(field.getAttribute('aria-labelledby')).toBe(title.id)
    expect(list.getAttribute('role')).toBe('listbox')
    expect(list.getAttribute('aria-labelledby')).toBe(field.id)

    const group = required('[data-part="group"]')
    const label = required('[data-part="label"]')
    expect(group.getAttribute('role')).toBe('group')
    expect(group.getAttribute('aria-labelledby')).toBe(label.id)
    expect(item('open-file').getAttribute('role')).toBe('option')
    expect(item('save-file').getAttribute('aria-disabled')).toBe('true')
    expect(item('save-file').dataset['state']).toBe('disabled')

    press('Escape')
    await flushPromises()
    expect(query('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(trigger)
    expect(palette.emitted('update:open')).toEqual([[true], [false]])
    expect(commandEvents(palette)).toEqual([])
  })

  it('moves the highlight among enabled items with arrows, Home, and End and syncs aria-activedescendant', async () => {
    mountPalette({ props: { defaultOpen: true } })
    await flushPromises()
    const field = input()
    expect(field.hasAttribute('aria-activedescendant')).toBe(false)

    press('ArrowDown')
    await nextTick()
    expect(field.getAttribute('aria-activedescendant')).toBe(
      item('open-file').id,
    )
    expect(item('open-file').getAttribute('aria-selected')).toBe('true')
    expect(item('open-file').hasAttribute('data-highlighted')).toBe(true)

    // The disabled "Save file" is skipped.
    press('ArrowDown')
    await nextTick()
    expect(field.getAttribute('aria-activedescendant')).toBe(
      item('close-tab').id,
    )
    expect(item('open-file').getAttribute('aria-selected')).toBe('false')

    press('ArrowDown')
    await nextTick()
    expect(field.getAttribute('aria-activedescendant')).toBe(
      item('open-file').id,
    )
    press('ArrowUp')
    await nextTick()
    expect(field.getAttribute('aria-activedescendant')).toBe(
      item('close-tab').id,
    )
    press('Home')
    await nextTick()
    expect(field.getAttribute('aria-activedescendant')).toBe(
      item('open-file').id,
    )
    press('End')
    await nextTick()
    expect(field.getAttribute('aria-activedescendant')).toBe(
      item('close-tab').id,
    )

    // Escape clears the highlight while closing.
    press('Escape')
    await flushPromises()
    expect(query('[role="dialog"]')).toBeNull()
  })

  it('ignores navigation and activation keys during IME composition', async () => {
    const { palette } = mountPalette({ props: { defaultOpen: true } })
    await flushPromises()
    press('ArrowDown', { isComposing: true })
    await nextTick()
    expect(input().hasAttribute('aria-activedescendant')).toBe(false)

    press('ArrowDown')
    await nextTick()
    press('Enter', { isComposing: true })
    press('Enter', { keyCode: 229 })
    await flushPromises()
    expect(commandEvents(palette)).toEqual([])
    expect(query('[role="dialog"]')).not.toBeNull()
  })

  it('activates with Enter: emits { id } only, never calls select(), keeps the query, and closes', async () => {
    const { palette } = mountPalette()
    await openPalette()
    await typeQuery('tab')
    const searchCount = palette.emitted('update:search')?.length ?? 0
    expect(searchCount).toBe(1)

    press('ArrowDown')
    press('ArrowDown')
    await nextTick()
    const enter = press('Enter')
    expect(enter.defaultPrevented).toBe(true)

    const events = commandEvents(palette)
    expect(events).toEqual([{ id: 'close-tab' }])
    expect(Object.keys(events[0] ?? {})).toEqual(['id'])
    expect(selectSpy).not.toHaveBeenCalled()
    // The query is never replaced by the item's text before close cleanup.
    expect(palette.emitted('update:search')?.[0]).toEqual(['tab'])

    await flushPromises()
    expect(query('[role="dialog"]')).toBeNull()
    // Close cleanup resets the query and emits a new search request.
    expect(palette.emitted('update:search')).toEqual([['tab'], ['']])
    const searches = (palette.emitted('search') ?? []).map(
      (args) => args[0] as GhostCommandPaletteSearchPayload,
    )
    expect(searches).toEqual([
      { query: 'tab', requestId: 1 },
      { query: '', requestId: 2 },
    ])

    // Reopening shows an empty query and no committed selection.
    await openPalette()
    expect(input().value).toBe('')
    expect(
      document.querySelectorAll('[data-part="item"][aria-selected="true"]'),
    ).toHaveLength(0)
  })

  it('activates with a primary click, keeps focus on the input, and ignores disabled items and other buttons', async () => {
    const { palette } = mountPalette({ props: { closeOnSelect: false } })
    await openPalette()

    const down = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
    })
    item('open-file').dispatchEvent(down)
    expect(down.defaultPrevented).toBe(true)

    item('save-file').click()
    item('open-file').dispatchEvent(
      new MouseEvent('click', { bubbles: true, button: 1 }),
    )
    expect(commandEvents(palette)).toEqual([])

    item('open-file').click()
    expect(commandEvents(palette)).toEqual([{ id: 'open-file' }])
    expect(selectSpy).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(input())

    // Pointer movement over an item moves the highlight; disabled items do not.
    item('save-file').dispatchEvent(new PointerEvent('pointermove'))
    await nextTick()
    expect(input().hasAttribute('aria-activedescendant')).toBe(false)
    item('close-tab').dispatchEvent(new PointerEvent('pointermove'))
    await nextTick()
    expect(input().getAttribute('aria-activedescendant')).toBe(
      item('close-tab').id,
    )
  })

  it('keeps the palette open and the query when closeOnSelect is false (C3)', async () => {
    const { palette } = mountPalette({ props: { closeOnSelect: false } })
    await openPalette()
    await typeQuery('file')
    press('ArrowDown')
    await nextTick()
    press('Enter')
    press('Enter')
    await flushPromises()

    expect(commandEvents(palette)).toEqual([
      { id: 'open-file' },
      { id: 'open-file' },
    ])
    expect(query('[role="dialog"]')).not.toBeNull()
    expect(input().value).toBe('file')
    expect(palette.emitted('update:search')).toEqual([['file']])
    expect(palette.emitted('update:open')).toEqual([[true]])

    // Escape still dismisses, and only then is the query cleared.
    press('Escape')
    await flushPromises()
    expect(palette.emitted('update:search')).toEqual([['file'], ['']])
  })

  it('emits command once and keeps the query when a controlled parent rejects close (C3, C7)', async () => {
    const { palette } = mountPalette({ props: { open: true } })
    await flushPromises()
    await typeQuery('open')
    press('ArrowDown')
    await nextTick()
    press('Enter')
    await flushPromises()

    expect(commandEvents(palette)).toEqual([{ id: 'open-file' }])
    expect(palette.emitted('update:open')).toEqual([[false]])
    expect(query('[role="dialog"]')).not.toBeNull()
    expect(input().value).toBe('open')
    expect(document.activeElement).toBe(input())
    expect(palette.emitted('update:search')).toEqual([['open']])
  })

  it('supports v-model:open and v-model:search with monotonic request ids, and a parent may keep its search on close', async () => {
    const open = ref(false)
    const search = ref('')
    const Fixture = defineComponent({
      setup() {
        return () =>
          h(
            GhostCommandPalette,
            {
              open: open.value,
              'onUpdate:open': (value: boolean) => {
                open.value = value
              },
              search: search.value,
              // The parent accepts typing but refuses the close reset.
              'onUpdate:search': (value: string) => {
                if (value !== '') {
                  search.value = value
                }
              },
            },
            () =>
              h(
                GhostCommandPaletteContent,
                { 'aria-label': 'Commands' },
                () => [
                  h(GhostCommandPaletteInput),
                  h(GhostCommandPaletteList, null, () =>
                    h(GhostCommandPaletteItem, { id: 'one' }, () => 'One'),
                  ),
                ],
              ),
          )
      },
    })
    const wrapper = mount(Fixture, { attachTo: document.body })
    attached.push(wrapper)
    const palette = wrapper.findComponent(GhostCommandPalette)

    open.value = true
    await flushPromises()
    await typeQuery('o')
    await typeQuery('on')
    expect(search.value).toBe('on')
    const ids = (palette.emitted('search') ?? []).map(
      (args) => (args[0] as GhostCommandPaletteSearchPayload).requestId,
    )
    expect(ids).toEqual([1, 2])

    open.value = false
    await flushPromises()
    expect(palette.emitted('update:search')?.at(-1)).toEqual([''])
    expect(
      (
        palette
          .emitted('search')
          ?.at(-1)?.[0] as GhostCommandPaletteSearchPayload
      ).requestId,
    ).toBe(3)
    expect(search.value).toBe('on')

    open.value = true
    await flushPromises()
    expect(input().value).toBe('on')
  })

  it('exposes open, close, and focusInput; disabled blocks every opening path and activation', async () => {
    const disabled = ref(true)
    const { paletteRef, palette } = mountPalette({
      props: {
        get disabled() {
          return disabled.value
        },
      },
    })
    const trigger = required('[data-part="trigger"]')
    expect(trigger.hasAttribute('disabled')).toBe(true)
    paletteRef.value?.open()
    trigger.click()
    await flushPromises()
    expect(query('[role="dialog"]')).toBeNull()
    expect(palette.emitted('update:open')).toBeUndefined()

    disabled.value = false
    await nextTick()
    paletteRef.value?.open()
    await flushPromises()
    expect(query('[role="dialog"]')).not.toBeNull()
    expect(paletteRef.value?.element).toBe(input())

    disabled.value = true
    await flushPromises()
    expect(input().disabled).toBe(true)
    item('open-file').click()
    expect(commandEvents(palette)).toEqual([])

    disabled.value = false
    await nextTick()
    required('#outside').focus()
    paletteRef.value?.focusInput()
    paletteRef.value?.close()
    await flushPromises()
    expect(query('[role="dialog"]')).toBeNull()
  })

  it('hides empty while loading, marks the listbox busy, and drops the listbox role when empty', async () => {
    const commands = ref<Command[]>([])
    const loading = ref(true)
    mountPalette({
      commands,
      props: {
        defaultOpen: true,
        get loading() {
          return loading.value
        },
      },
    })
    await flushPromises()
    const list = required('[data-part="list"]')
    const empty = required('[data-part="empty"]')
    expect(list.getAttribute('aria-busy')).toBe('true')
    expect(list.getAttribute('role')).toBe('listbox')
    expect(empty.style.display).toBe('none')
    expect(required('[data-part="announcer"]').textContent).toBe(
      'Loading results',
    )

    loading.value = false
    await flushPromises()
    expect(list.hasAttribute('aria-busy')).toBe(false)
    expect(list.hasAttribute('role')).toBe(false)
    expect(empty.style.display).toBe('')
    expect(required('[data-part="announcer"]').textContent).toBe(
      'No results available',
    )

    // Stale results stay visible while a new request loads.
    commands.value = [{ id: 'a', label: 'Alpha' }]
    loading.value = true
    await flushPromises()
    expect(list.getAttribute('role')).toBe('listbox')
    expect(query('[data-value="a"]')).not.toBeNull()
    expect(empty.style.display).toBe('none')
  })

  it('announces with root messages overrides (C8)', async () => {
    const commands = ref<Command[]>([{ id: 'a', label: 'Alpha' }])
    const loading = ref(false)
    mountPalette({
      commands,
      props: {
        defaultOpen: true,
        get loading() {
          return loading.value
        },
        messages: {
          loading: 'Chargement',
          empty: 'Aucun résultat',
          results: (count: number) => `${String(count)} commandes`,
        },
      },
    })
    await flushPromises()
    const announcer = required('[data-part="announcer"]')
    // The live region lives inside the dialog so modal inert never hides it.
    expect(required('[role="dialog"]').contains(announcer)).toBe(true)
    expect(announcer.getAttribute('aria-live')).toBe('polite')
    expect(announcer.textContent).toBe('1 commandes')

    loading.value = true
    await flushPromises()
    expect(announcer.textContent).toBe('Chargement')

    loading.value = false
    commands.value = []
    await flushPromises()
    expect(announcer.textContent).toBe('Aucun résultat')
  })

  it('renders separators as role="none", never focusable or highlightable (C5)', async () => {
    mountPalette({ props: { defaultOpen: true }, separator: true })
    await flushPromises()
    const separator = required('[data-part="separator"]')
    expect(separator.getAttribute('role')).toBe('none')
    expect(separator.tagName).toBe('DIV')
    expect(separator.hasAttribute('tabindex')).toBe(false)
    expect(separator.classList.contains('custom')).toBe(true)
    expect(
      separator.classList.contains('ghost-command-palette-separator'),
    ).toBe(true)

    for (let index = 0; index < 4; index += 1) {
      press('ArrowDown')
      await nextTick()
      expect(input().getAttribute('aria-activedescendant')).not.toBe(
        separator.id || 'none',
      )
    }
    const down = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
    })
    separator.dispatchEvent(down)
    expect(down.defaultPrevented).toBe(true)
  })

  it('logs GHOST002 without a title or aria-label, and not when named (C2)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    mountPalette({ props: { defaultOpen: true }, title: false })
    await flushPromises()
    expect(
      warn.mock.calls.some((args) => String(args[0]).includes('GHOST002')),
    ).toBe(true)
    expect(required('[role="dialog"]').hasAttribute('aria-labelledby')).toBe(
      false,
    )

    for (const wrapper of attached.splice(0)) {
      wrapper.unmount()
    }
    warn.mockClear()
    mountPalette({
      props: { defaultOpen: true },
      title: false,
      contentAttrs: { 'aria-label': 'Commands' },
      inputAttrs: { 'aria-label': 'Search commands' },
    })
    await flushPromises()
    expect(
      warn.mock.calls.some((args) => String(args[0]).includes('GHOST002')),
    ).toBe(false)
    expect(required('[role="dialog"]').getAttribute('aria-label')).toBe(
      'Commands',
    )
    expect(input().getAttribute('aria-label')).toBe('Search commands')
    expect(input().hasAttribute('aria-labelledby')).toBe(false)
  })

  it('warns with GHOST006 when two items share an id', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    mountPalette({
      props: { defaultOpen: true },
      commands: ref([
        { id: 'dup', label: 'First' },
        { id: 'unique', label: 'Unique' },
      ]),
    })
    await flushPromises()
    expect(warn).not.toHaveBeenCalled()

    for (const wrapper of attached.splice(0)) {
      wrapper.unmount()
    }
    const Fixture = defineComponent({
      setup() {
        return () =>
          h(GhostCommandPalette, { defaultOpen: true }, () =>
            h(GhostCommandPaletteContent, { 'aria-label': 'Commands' }, () => [
              h(GhostCommandPaletteInput),
              h(GhostCommandPaletteList, null, () => [
                h(GhostCommandPaletteItem, { id: 'dup' }, () => 'First'),
                h(GhostCommandPaletteItem, { id: 'dup' }, () => 'Second'),
              ]),
            ]),
          )
      },
    })
    attached.push(mount(Fixture, { attachTo: document.body }))
    await flushPromises()
    expect(
      warn.mock.calls.some(
        (args) =>
          String(args[0]).includes('GHOST006') &&
          String(args[0]).includes('"dup"'),
      ),
    ).toBe(true)
  })

  it('keeps a modal palette open when focus leaves the input (C4, modal=true)', async () => {
    mountPalette({ props: { defaultOpen: true } })
    await flushPromises()
    const field = input()
    expect(document.activeElement).toBe(field)
    const outside = document.createElement('button')
    document.body.append(outside)
    field.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }),
    )
    field.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    await flushPromises()
    expect(query('[role="dialog"]')).not.toBeNull()
  })

  it('closes a non-modal palette when focus departs, without restoring focus or rendering an overlay (C4, modal=false)', async () => {
    const { palette } = mountPalette({ props: { modal: false } })
    const trigger = required('[data-part="trigger"]')
    trigger.focus()
    await openPalette()
    expect(query('[data-part="overlay"]')).toBeNull()
    expect(required('[role="dialog"]').hasAttribute('aria-modal')).toBe(false)
    await typeQuery('file')

    // Moving within the palette is not departure.
    required('[role="dialog"]').focus()
    await flushPromises()
    expect(query('[role="dialog"]')).not.toBeNull()
    input().focus()

    const outside = required('#outside')
    outside.focus()
    await flushPromises()
    expect(query('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(outside)
    expect(palette.emitted('update:open')?.at(-1)).toEqual([false])
    expect(palette.emitted('update:search')?.at(-1)).toEqual([''])

    // A later ordinary close restores focus again.
    trigger.focus()
    await openPalette()
    press('Escape')
    await flushPromises()
    expect(document.activeElement).toBe(trigger)
  })

  it('follows DOM order after reorder and insertion, and clears the highlight when the active item unmounts', async () => {
    const commands = ref<Command[]>([
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Bravo' },
    ])
    const { palette } = mountPalette({ commands, props: { defaultOpen: true } })
    await flushPromises()
    commands.value = [
      { id: 'c', label: 'Charlie' },
      { id: 'b', label: 'Bravo' },
      { id: 'a', label: 'Alpha' },
    ]
    await flushPromises()
    press('ArrowDown')
    await nextTick()
    expect(input().getAttribute('aria-activedescendant')).toBe(item('c').id)
    press('ArrowDown')
    await nextTick()
    expect(input().getAttribute('aria-activedescendant')).toBe(item('b').id)
    expect(required('[data-part="announcer"]').textContent).toBe(
      '3 results available',
    )

    commands.value = [{ id: 'a', label: 'Alpha' }]
    await flushPromises()
    expect(input().hasAttribute('aria-activedescendant')).toBe(false)
    expect(required('[data-part="announcer"]').textContent).toBe(
      '1 results available',
    )
    // Unregistering never emits a command.
    expect(commandEvents(palette)).toEqual([])
  })

  it('throws a clear error when a part is used outside GhostCommandPalette', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    expect(() =>
      mount(GhostCommandPaletteItem, { props: { id: 'x' } }),
    ).toThrow('GhostCommandPaletteItem must be used inside GhostCommandPalette')
    expect(() => mount(GhostCommandPaletteInput)).toThrow(
      'GhostCommandPaletteInput must be used inside GhostCommandPalette',
    )
  })
})

describe('useGhostCommandPaletteAsyncSearch', () => {
  it('discards stale responses that resolve after a newer request', async () => {
    const { begin, isLatest } = useGhostCommandPaletteAsyncSearch()
    const applied: string[] = []

    async function respond(
      query: string,
      requestId: number,
      delay: number,
    ): Promise<void> {
      begin(requestId)
      await new Promise((resolve) => setTimeout(resolve, delay))
      if (isLatest(requestId)) {
        applied.push(query)
      }
    }

    // Fast-then-slow race: the first (slow) response resolves last.
    await Promise.all([respond('r', 1, 20), respond('re', 2, 5)])
    expect(applied).toEqual(['re'])
    expect(isLatest(1)).toBe(false)
    expect(isLatest(2)).toBe(true)
  })
})
