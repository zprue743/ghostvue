import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'

import { CalendarDate } from '../../packages/vue/src/calendar-public-date'
import type { GhostCalendarPartExposed } from '../../packages/vue/src/ghost-calendar'
import {
  GhostCalendar,
  GhostCalendarGrid,
  GhostCalendarHeader,
  GhostCalendarHeading,
  GhostCalendarNextButton,
  GhostCalendarPrevButton,
} from '../../packages/themes/src/index'

describe('themed GhostCalendar', () => {
  it('exposes the grid element through the themed grid export', () => {
    let exposed: GhostCalendarPartExposed | null = null
    const host = defineComponent({
      setup: () => () =>
        h(
          GhostCalendar,
          {
            defaultVisibleMonth: new CalendarDate(2024, 6, 1),
            today: new CalendarDate(2024, 6, 10),
          },
          {
            default: () => [
              h(GhostCalendarHeader, null, () => [
                h(GhostCalendarPrevButton),
                h(GhostCalendarHeading),
                h(GhostCalendarNextButton),
              ]),
              h(GhostCalendarGrid, {
                ref: (instance: GhostCalendarPartExposed | null) => {
                  exposed = instance
                },
              }),
            ],
          },
        ),
    })
    const wrapper = mount(host)
    expect(exposed?.element).toBe(wrapper.get('[data-part="grid"]').element)
    wrapper.unmount()
  })

  it('forwards controlled-empty null and the select event', async () => {
    const onUpdate = vi.fn()
    const onSelect = vi.fn()
    const host = defineComponent({
      setup: () => () =>
        h(
          GhostCalendar,
          {
            modelValue: null,
            defaultValue: new CalendarDate(2024, 6, 5),
            defaultVisibleMonth: new CalendarDate(2024, 6, 1),
            'onUpdate:modelValue': onUpdate,
            onSelect,
          },
          { default: () => [h(GhostCalendarGrid)] },
        ),
    })
    const wrapper = mount(host)
    expect(wrapper.findAll('[aria-selected="true"]')).toHaveLength(0)

    await wrapper
      .get('[data-ghost-calendar-date="2024-06-18"]')
      .trigger('click')

    expect(onUpdate).toHaveBeenCalledOnce()
    expect(onSelect).toHaveBeenCalledOnce()
    expect(String(onSelect.mock.calls[0]?.[0])).toBe('2024-06-18')
    // Controlled empty: the ignored proposal leaves nothing selected.
    expect(wrapper.findAll('[aria-selected="true"]')).toHaveLength(0)
    wrapper.unmount()
  })
})
