/** @vitest-environment node */

import { CalendarDate } from '@internationalized/date'
import { createSSRApp, defineComponent, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'

import GhostDatePicker from './GhostDatePicker.vue'
import GhostDatePickerContent from './GhostDatePickerContent.vue'
import GhostDatePickerInput from './GhostDatePickerInput.vue'
import GhostDatePickerTrigger from './GhostDatePickerTrigger.vue'

function render(open: boolean) {
  return renderToString(
    createSSRApp(
      defineComponent({
        setup: () => () =>
          h(
            GhostDatePicker,
            {
              selectionMode: 'range',
              name: 'stay',
              today: new CalendarDate(2026, 11, 17),
              defaultValue: {
                start: new CalendarDate(2026, 11, 20),
                end: new CalendarDate(2026, 11, 22),
              },
              defaultOpen: open,
            },
            () => [
              h(GhostDatePickerInput, { part: 'start', 'aria-label': 'Start' }),
              h(GhostDatePickerInput, { part: 'end', 'aria-label': 'End' }),
              h(GhostDatePickerTrigger),
              h(GhostDatePickerContent, { portal: false }),
            ],
          ),
      }),
    ),
  )
}

describe('GhostDatePicker SSR', () => {
  it('renders closed deterministically without window or document', async () => {
    expect(typeof document).toBe('undefined')
    const first = await render(false)
    expect(first).toBe(await render(false))
    expect(first).toContain('value="2026-11-20"')
    expect(first).toContain('name="stay[end]"')
    expect(first).toContain('aria-expanded="false"')
    expect(first).not.toContain('role="dialog"')
  })

  it('renders an initially open calendar deterministically', async () => {
    const first = await render(true)
    expect(first).toBe(await render(true))
    expect(first).toContain('role="dialog"')
    expect(first).toContain('aria-modal="true"')
    expect(first).toContain('data-ghost-calendar-date="2026-11-20"')
    // The roving tab stop starts on the committed range start.
    expect(first).toMatch(
      /data-ghost-calendar-date="2026-11-20"[^>]*tabindex="0"/,
    )
  })
})
