import { CalendarDate } from '../../packages/vue/src/calendar-public-date'
import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'

import GhostDatePicker from '../../packages/vue/src/GhostDatePicker.vue'
import GhostDatePickerContent from '../../packages/vue/src/GhostDatePickerContent.vue'
import GhostDatePickerInput from '../../packages/vue/src/GhostDatePickerInput.vue'
import GhostDatePickerTrigger from '../../packages/vue/src/GhostDatePickerTrigger.vue'
import { expectSsrHydration } from '../support/ssr-hydration'

function fixture(name: string, open: boolean) {
  return defineComponent({
    name,
    setup() {
      return () =>
        h(
          GhostDatePicker,
          {
            name: 'due',
            defaultOpen: open,
            today: new CalendarDate(2026, 11, 17),
            defaultValue: new CalendarDate(2026, 11, 18),
          },
          {
            default: () => [
              h(GhostDatePickerInput, { 'aria-label': 'Due date' }),
              h(GhostDatePickerTrigger),
              // Inline content keeps the open markup inside the hydrated root.
              h(GhostDatePickerContent, { portal: false }),
            ],
          },
        )
    },
  })
}

describe('GhostDatePicker SSR hydration', () => {
  it('hydrates a closed picker without mismatch', async () => {
    await expectSsrHydration(fixture('ClosedDatePickerFixture', false), {
      assertServerHtml(html) {
        expect(html).toContain('value="2026-11-18"')
        expect(html).toContain('aria-expanded="false"')
        expect(html).not.toContain('role="dialog"')
      },
    })
  })

  it('hydrates an initially open picker without mismatch', async () => {
    await expectSsrHydration(fixture('OpenDatePickerFixture', true), {
      assertServerHtml(html) {
        expect(html).toContain('aria-expanded="true"')
        expect(html).toContain('role="dialog"')
        expect(html).toContain('data-ghost-calendar-date="2026-11-18"')
      },
    })
  })
})
