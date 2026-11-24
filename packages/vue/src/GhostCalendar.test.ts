import { CalendarDate } from '@internationalized/date'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h, inject, nextTick, ref, shallowRef } from 'vue'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'

import {
  ghostCalendarContextKey,
  type GhostCalendarContext,
} from './ghost-calendar'
import GhostCalendar from './GhostCalendar.vue'
import GhostCalendarGrid from './GhostCalendarGrid.vue'
import GhostCalendarHeader from './GhostCalendarHeader.vue'
import GhostCalendarHeading from './GhostCalendarHeading.vue'
import GhostCalendarNextButton from './GhostCalendarNextButton.vue'
import GhostCalendarPrevButton from './GhostCalendarPrevButton.vue'

const JUNE_2024 = new CalendarDate(2024, 6, 1)
const FIXED_TODAY = new CalendarDate(2024, 6, 10)

const attached: ReturnType<typeof mount>[] = []

afterEach(() => {
  while (attached.length > 0) {
    const instance = attached.pop()
    instance?.unmount()
  }
})

function mountCalendar(
  getProps: () => Record<string, unknown>,
  slots?: Record<string, () => unknown>,
) {
  const host = defineComponent({
    setup() {
      return () =>
        h(
          GhostCalendar,
          getProps(),
          slots ?? {
            default: () => [
              h(GhostCalendarHeader, null, () => [
                h(GhostCalendarPrevButton),
                h(GhostCalendarHeading),
                h(GhostCalendarNextButton),
              ]),
              h(GhostCalendarGrid),
            ],
          },
        )
    },
  })
  const wrapper = mount(host, { attachTo: document.body })
  attached.push(wrapper)
  return wrapper
}

function key(
  target: EventTarget,
  keyName: string,
  init: KeyboardEventInit = {},
) {
  const event = new KeyboardEvent('keydown', {
    key: keyName,
    bubbles: true,
    ...init,
  })
  target.dispatchEvent(event)
}

describe('GhostCalendar', () => {
  it('selects a date with pointer and exposes grid semantics', async () => {
    const selected = ref(new CalendarDate(2024, 6, 5))
    const wrapper = mountCalendar(() => ({
      modelValue: selected.value,
      'onUpdate:modelValue': (value: CalendarDate) => {
        selected.value = value
      },
      defaultVisibleMonth: JUNE_2024,
      today: FIXED_TODAY,
    }))

    const day15 = wrapper.find('[data-ghost-calendar-date="2024-06-15"]')
    expect(day15.exists()).toBe(true)
    await day15.trigger('click')
    expect(selected.value.toString()).toBe('2024-06-15')

    const grid = wrapper.find('[data-part="grid"]')
    expect(grid.attributes('role')).toBe('grid')
    const selectedCell = wrapper.find('[data-ghost-calendar-date="2024-06-15"]')
    expect(selectedCell.attributes('aria-selected')).toBe('true')
    expect(selectedCell.attributes('data-today')).toBeUndefined()
    const todayCell = wrapper.find('[data-ghost-calendar-date="2024-06-10"]')
    expect(todayCell.attributes('data-today')).toBe('')
  })

  it('aligns dates under locale weekday columns and marks today', () => {
    const rowDates = (wrapper: ReturnType<typeof mount>) =>
      wrapper
        .findAll('.ghost-calendar-week')
        .map((row) =>
          row
            .findAll('[data-ghost-calendar-date]')
            .map((cell) => cell.attributes('data-ghost-calendar-date')),
        )

    const us = mountCalendar(() => ({
      defaultVisibleMonth: JUNE_2024,
      today: FIXED_TODAY,
    }))
    const usRows = rowDates(us)
    expect(us.findAll('[role="columnheader"]').map((h) => h.text())).toEqual([
      'Sun',
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
    ])
    expect(usRows[0]?.[0]).toBe('2024-05-26')
    expect(usRows[0]?.[6]).toBe('2024-06-01')
    expect(usRows.every((row) => row.length === 7)).toBe(true)
    const today = us.find('[data-ghost-calendar-date="2024-06-10"]')
    expect(today.attributes('aria-current')).toBe('date')
    expect(
      us.find('[data-ghost-calendar-date="2024-06-11"]').attributes(),
    ).not.toHaveProperty('aria-current')

    const gb = mountCalendar(() => ({
      locale: 'en-GB',
      defaultVisibleMonth: JUNE_2024,
    }))
    expect(gb.find('[role="columnheader"]').text()).toBe('Mon')
    expect(rowDates(gb)[0]?.[5]).toBe('2024-06-01')

    const explicit = mountCalendar(() => ({
      weekStartsOn: 1,
      defaultVisibleMonth: JUNE_2024,
    }))
    expect(rowDates(explicit)[0]?.[0]).toBe('2024-05-27')
  })

  it('merges consumer classes with part classes', () => {
    const wrapper = mountCalendar(() => ({ defaultVisibleMonth: JUNE_2024 }), {
      default: () => [
        h(GhostCalendarHeader, { class: 'nav' }, () => [
          h(GhostCalendarPrevButton, { class: 'prev' }),
          h(GhostCalendarHeading, { class: 'title' }),
          h(GhostCalendarNextButton, { class: 'next' }),
        ]),
        h(GhostCalendarGrid),
      ],
    })
    expect(wrapper.get('[data-part="header"]').classes()).toEqual([
      'ghost-calendar-header',
      'nav',
    ])
    expect(wrapper.get('[data-part="prev"]').classes()).toContain(
      'ghost-calendar-prev',
    )
    expect(wrapper.get('[data-part="prev"]').classes()).toContain('prev')
    expect(wrapper.get('[data-part="next"]').classes()).toContain('next')
    expect(wrapper.get('[data-part="heading"]').classes()).toEqual([
      'ghost-calendar-heading',
      'title',
    ])
  })

  it('supports inclusive range selection', async () => {
    const range = ref({
      start: new CalendarDate(2024, 6, 10),
      end: new CalendarDate(2024, 6, 10),
    })
    const wrapper = mountCalendar(() => ({
      modelValue: range.value,
      selectionMode: 'range',
      'onUpdate:modelValue': (value: {
        start: CalendarDate
        end: CalendarDate
      }) => {
        range.value = value
      },
      defaultVisibleMonth: JUNE_2024,
      today: FIXED_TODAY,
    }))

    await wrapper
      .find('[data-ghost-calendar-date="2024-06-14"]')
      .trigger('click')
    await flushPromises()
    expect(range.value.start.toString()).toBe('2024-06-10')
    expect(range.value.end.toString()).toBe('2024-06-14')
    expect(
      wrapper
        .find('[data-ghost-calendar-date="2024-06-12"]')
        .attributes('data-state'),
    ).toBe('range-middle')
  })

  it('respects min/max and custom disabled dates', async () => {
    const selected = ref<CalendarDate | undefined>(undefined)
    const wrapper = mountCalendar(() => ({
      'onUpdate:modelValue': (value: CalendarDate) => {
        selected.value = value
      },
      defaultVisibleMonth: JUNE_2024,
      minValue: new CalendarDate(2024, 6, 5),
      maxValue: new CalendarDate(2024, 6, 20),
      isDateDisabled: (date: CalendarDate) => date.day === 12,
      today: FIXED_TODAY,
    }))

    const unavailable = wrapper.find('[data-ghost-calendar-date="2024-06-12"]')
    expect((unavailable.element as HTMLButtonElement).disabled).toBe(false)
    expect(unavailable.attributes('aria-disabled')).toBe('true')
    await unavailable.trigger('click')
    expect(selected.value).toBeUndefined()

    await wrapper
      .find('[data-ghost-calendar-date="2024-06-15"]')
      .trigger('click')
    expect(selected.value?.toString()).toBe('2024-06-15')
  })

  it('ignores update events when controlled parent does not apply them', async () => {
    const selected = ref(new CalendarDate(2024, 6, 1))
    const wrapper = mountCalendar(() => ({
      modelValue: selected.value,
      defaultVisibleMonth: JUNE_2024,
      today: FIXED_TODAY,
    }))

    await wrapper
      .find('[data-ghost-calendar-date="2024-06-18"]')
      .trigger('click')
    expect(selected.value.toString()).toBe('2024-06-01')
  })

  it('emits select after update:modelValue, including repeat activation', async () => {
    const log: string[] = []
    const wrapper = mountCalendar(() => ({
      'onUpdate:modelValue': (value: CalendarDate) => {
        log.push(`update:${value.toString()}`)
      },
      onSelect: (date: CalendarDate) => {
        log.push(`select:${date.toString()}`)
      },
      defaultVisibleMonth: JUNE_2024,
      today: FIXED_TODAY,
    }))

    await wrapper
      .find('[data-ghost-calendar-date="2024-06-15"]')
      .trigger('click')
    await wrapper
      .find('[data-ghost-calendar-date="2024-06-15"]')
      .trigger('click')

    // Re-activating the uncontrolled selection proposes no model change, but
    // still reports the accepted activation.
    expect(log).toEqual([
      'update:2024-06-15',
      'select:2024-06-15',
      'select:2024-06-15',
    ])
  })

  it('emits select once per activation of the same day in range mode', async () => {
    const selects: string[] = []
    const updates: string[] = []
    const wrapper = mountCalendar(() => ({
      selectionMode: 'range',
      'onUpdate:modelValue': (value: {
        start: CalendarDate
        end: CalendarDate
      }) => {
        updates.push(`${value.start.toString()}..${value.end.toString()}`)
      },
      onSelect: (date: CalendarDate) => {
        selects.push(date.toString())
      },
      defaultVisibleMonth: JUNE_2024,
      today: FIXED_TODAY,
    }))

    const day = wrapper.find('[data-ghost-calendar-date="2024-06-14"]')
    await day.trigger('click')
    await day.trigger('click')

    expect(updates).toEqual([
      '2024-06-14..2024-06-14',
      '2024-06-14..2024-06-14',
    ])
    expect(selects).toEqual(['2024-06-14', '2024-06-14'])
  })

  it('does not emit select for unavailable, outside-month, or disabled activations', async () => {
    const onSelect = vi.fn()
    const disabled = ref(false)
    const wrapper = mountCalendar(() => ({
      onSelect,
      disabled: disabled.value,
      defaultVisibleMonth: JUNE_2024,
      isDateDisabled: (date: CalendarDate) => date.day === 12,
      today: FIXED_TODAY,
    }))

    await wrapper
      .find('[data-ghost-calendar-date="2024-06-12"]')
      .trigger('click')
    const outside = wrapper.find('[data-outside-month]')
    expect(outside.exists()).toBe(true)
    await outside.trigger('click')
    disabled.value = true
    await nextTick()
    await wrapper
      .find('[data-ghost-calendar-date="2024-06-15"]')
      .trigger('click')

    expect(onSelect).not.toHaveBeenCalled()
  })

  it('renders controlled null as empty and ignores unapplied proposals', async () => {
    const onUpdate = vi.fn()
    const onSelect = vi.fn()
    let slotValue: unknown = 'unset'
    const wrapper = mountCalendar(
      () => ({
        modelValue: null,
        defaultValue: new CalendarDate(2024, 6, 5),
        'onUpdate:modelValue': onUpdate,
        onSelect,
        defaultVisibleMonth: JUNE_2024,
        today: FIXED_TODAY,
      }),
      {
        default: (({ modelValue }: { modelValue: unknown }) => {
          slotValue = modelValue
          return [h(GhostCalendarGrid)]
        }) as () => unknown,
      },
    )

    expect(wrapper.findAll('[aria-selected="true"]')).toHaveLength(0)
    expect(slotValue).toBeUndefined()

    await wrapper
      .find('[data-ghost-calendar-date="2024-06-18"]')
      .trigger('click')

    expect(onUpdate).toHaveBeenCalledOnce()
    expect(String(onUpdate.mock.calls[0]?.[0])).toBe('2024-06-18')
    expect(onSelect).toHaveBeenCalledOnce()
    expect(wrapper.findAll('[aria-selected="true"]')).toHaveLength(0)
    expect(slotValue).toBeUndefined()
  })

  it('clears a pending range when the parent resets the model to null', async () => {
    interface Range {
      start: CalendarDate
      end: CalendarDate
    }
    const range = shallowRef<Range | null>(null)
    // Read through a function so TS does not keep the `null` narrowing from
    // the reset below; the click handler writes `range` out of its sight.
    const readRange = (): Range | null => range.value
    const wrapper = mountCalendar(() => ({
      modelValue: range.value,
      selectionMode: 'range',
      'onUpdate:modelValue': (value: {
        start: CalendarDate
        end: CalendarDate
      }) => {
        range.value = value
      },
      defaultVisibleMonth: JUNE_2024,
      today: FIXED_TODAY,
    }))

    await wrapper
      .find('[data-ghost-calendar-date="2024-06-10"]')
      .trigger('click')
    expect(
      wrapper
        .find('[data-ghost-calendar-date="2024-06-10"]')
        .attributes('aria-selected'),
    ).toBe('true')

    range.value = null
    await nextTick()
    expect(wrapper.findAll('[aria-selected="true"]')).toHaveLength(0)

    await wrapper
      .find('[data-ghost-calendar-date="2024-06-16"]')
      .trigger('click')
    const committed = readRange()
    expect(committed?.start.toString()).toBe('2024-06-16')
    expect(committed?.end.toString()).toBe('2024-06-16')
  })

  it('focuses unavailable dates without skipping them', async () => {
    const wrapper = mountCalendar(() => ({
      defaultValue: new CalendarDate(2024, 6, 5),
      defaultVisibleMonth: JUNE_2024,
      isDateDisabled: (date: CalendarDate) => date.day === 12,
      today: FIXED_TODAY,
    }))

    const grid = wrapper.find('[data-part="grid"]').element
    const dateCell = (iso: string) =>
      grid.querySelector<HTMLElement>(
        `[data-ghost-calendar-date="${iso}"]`,
      ) as HTMLButtonElement

    dateCell('2024-06-05').focus()
    key(grid, 'ArrowDown')
    await flushPromises()
    expect(
      document.activeElement?.getAttribute('data-ghost-calendar-date'),
    ).toBe('2024-06-12')
    expect(dateCell('2024-06-12').getAttribute('aria-disabled')).toBe('true')
  })

  it('clamps keyboard focus at min and max values', async () => {
    const wrapper = mountCalendar(() => ({
      defaultValue: new CalendarDate(2024, 6, 5),
      defaultVisibleMonth: JUNE_2024,
      minValue: new CalendarDate(2024, 6, 5),
      maxValue: new CalendarDate(2024, 6, 20),
      today: FIXED_TODAY,
    }))

    const grid = wrapper.find('[data-part="grid"]').element
    const dateCell = (iso: string) =>
      grid.querySelector<HTMLElement>(
        `[data-ghost-calendar-date="${iso}"]`,
      ) as HTMLButtonElement

    dateCell('2024-06-05').focus()
    key(grid, 'ArrowLeft')
    await flushPromises()
    expect(
      document.activeElement?.getAttribute('data-ghost-calendar-date'),
    ).toBe('2024-06-05')

    dateCell('2024-06-20').focus()
    key(grid, 'ArrowRight')
    await flushPromises()
    expect(
      document.activeElement?.getAttribute('data-ghost-calendar-date'),
    ).toBe('2024-06-20')
  })

  it('moves focus with arrow keys on the grid', async () => {
    const wrapper = mountCalendar(() => ({
      defaultValue: new CalendarDate(2024, 6, 15),
      defaultVisibleMonth: JUNE_2024,
      today: FIXED_TODAY,
    }))

    const grid = wrapper.find('[data-part="grid"]').element
    const focusDate = (iso: string) => {
      const cell = grid.querySelector<HTMLElement>(
        `[data-ghost-calendar-date="${iso}"]`,
      )
      cell?.focus()
      return cell
    }

    focusDate('2024-06-15')
    expect(
      document.activeElement?.getAttribute('data-ghost-calendar-date'),
    ).toBe('2024-06-15')

    key(grid, 'ArrowRight')
    await flushPromises()
    expect(
      document.activeElement?.getAttribute('data-ghost-calendar-date'),
    ).toBe('2024-06-16')

    key(grid, 'ArrowDown')
    await flushPromises()
    expect(
      document.activeElement?.getAttribute('data-ghost-calendar-date'),
    ).toBe('2024-06-23')

    focusDate('2024-06-15')
    key(document.activeElement ?? grid, 'Home')
    await flushPromises()
    await nextTick()
    expect(
      document.activeElement?.getAttribute('data-ghost-calendar-date'),
    ).toBe('2024-06-09')

    focusDate('2024-06-15')
    key(document.activeElement ?? grid, 'End')
    await flushPromises()
    await nextTick()
    expect(
      document.activeElement?.getAttribute('data-ghost-calendar-date'),
    ).toBe('2024-06-15')
  })

  it('navigates months with page keys and announces', async () => {
    const month = ref(JUNE_2024)
    const wrapper = mountCalendar(() => ({
      defaultValue: new CalendarDate(2024, 6, 15),
      visibleMonth: month.value,
      'onUpdate:visibleMonth': (next: CalendarDate) => {
        month.value = next
      },
      today: FIXED_TODAY,
    }))

    const grid = wrapper.find('[data-part="grid"]').element
    grid.querySelector<HTMLElement>('[tabindex="0"]')?.focus()
    key(grid, 'PageDown')
    await flushPromises()

    expect(month.value.month).toBe(7)
    const liveText = document.body.querySelector(
      '.ghost-calendar-live',
    )?.textContent
    expect(liveText && liveText.length > 0).toBe(true)
  })

  it('does not attach grid listeners during SSR', async () => {
    const addSpy = vi.spyOn(document, 'addEventListener')
    const app = createSSRApp({
      render: () =>
        h(
          GhostCalendar,
          {
            defaultVisibleMonth: JUNE_2024,
            today: FIXED_TODAY,
          },
          {
            default: () => [
              h(GhostCalendarHeader, null, () => [h(GhostCalendarHeading)]),
              h(GhostCalendarGrid),
            ],
          },
        ),
    })
    const html = await renderToString(app)
    expect(html).toContain('role="grid"')
    expect(addSpy.mock.calls.some(([event]) => event === 'keydown')).toBe(false)
    addSpy.mockRestore()
  })
})

describe('GhostCalendar internal focus-target accessor', () => {
  it('reports readiness once a grid mounts and resolves the roving date control', async () => {
    let accessor: GhostCalendarContext['focusTarget'] | undefined
    const Probe = defineComponent({
      setup() {
        accessor = inject(ghostCalendarContextKey)?.focusTarget
        return () => null
      },
    })
    const showGrid = ref(false)
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(
            GhostCalendar,
            {
              defaultValue: new CalendarDate(2024, 6, 14),
              today: FIXED_TODAY,
            },
            () => [h(Probe), showGrid.value ? h(GhostCalendarGrid) : null],
          ),
      }),
      { attachTo: document.body },
    )
    attached.push(wrapper)
    expect(accessor?.ready.value).toBe(false)
    expect(accessor?.resolve()).toBeNull()

    showGrid.value = true
    await nextTick()
    await nextTick()
    expect(accessor?.ready.value).toBe(true)
    expect(accessor?.resolve()?.getAttribute('data-ghost-calendar-date')).toBe(
      '2024-06-14',
    )
  })
})
