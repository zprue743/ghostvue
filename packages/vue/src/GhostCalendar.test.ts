import { CalendarDate } from '@internationalized/date'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'

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
