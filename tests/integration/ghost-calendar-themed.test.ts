import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
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
})
