import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'

import GhostButton from '../../packages/vue/src/GhostButton.vue'
import GhostCollapsible from '../../packages/vue/src/GhostCollapsible.vue'
import GhostCollapsibleContent from '../../packages/vue/src/GhostCollapsibleContent.vue'
import GhostCollapsibleTrigger from '../../packages/vue/src/GhostCollapsibleTrigger.vue'
import GhostContextMenu from '../../packages/vue/src/GhostContextMenu.vue'
import GhostContextMenuContent from '../../packages/vue/src/GhostContextMenuContent.vue'
import GhostContextMenuTrigger from '../../packages/vue/src/GhostContextMenuTrigger.vue'
import GhostDropdownMenu from '../../packages/vue/src/GhostDropdownMenu.vue'
import GhostDropdownMenuContent from '../../packages/vue/src/GhostDropdownMenuContent.vue'
import GhostDropdownMenuTrigger from '../../packages/vue/src/GhostDropdownMenuTrigger.vue'
import GhostMenubar from '../../packages/vue/src/GhostMenubar.vue'
import GhostMenubarContent from '../../packages/vue/src/GhostMenubarContent.vue'
import GhostMenubarItem from '../../packages/vue/src/GhostMenubarItem.vue'
import GhostMenubarMenu from '../../packages/vue/src/GhostMenubarMenu.vue'
import GhostMenubarTrigger from '../../packages/vue/src/GhostMenubarTrigger.vue'
import GhostInlineAlert from '../../packages/vue/src/GhostInlineAlert.vue'
import { CalendarDate } from '../../packages/vue/src/calendar-public-date'
import GhostCalendar from '../../packages/vue/src/GhostCalendar.vue'
import GhostCalendarGrid from '../../packages/vue/src/GhostCalendarGrid.vue'
import GhostCalendarHeading from '../../packages/vue/src/GhostCalendarHeading.vue'
import GhostCombobox from '../../packages/vue/src/GhostCombobox.vue'
import GhostComboboxContent from '../../packages/vue/src/GhostComboboxContent.vue'
import GhostComboboxInput from '../../packages/vue/src/GhostComboboxInput.vue'
import GhostComboboxOption from '../../packages/vue/src/GhostComboboxOption.vue'
import GhostSelect from '../../packages/vue/src/GhostSelect.vue'
import GhostSelectContent from '../../packages/vue/src/GhostSelectContent.vue'
import GhostSelectOption from '../../packages/vue/src/GhostSelectOption.vue'
import GhostSelectTrigger from '../../packages/vue/src/GhostSelectTrigger.vue'
import GhostSelectValue from '../../packages/vue/src/GhostSelectValue.vue'
import { expectSsrHydration, ssrHydrationRoot } from '../support/ssr-hydration'

describe('SSR hydration harness', () => {
  it('hydrates GhostButton without mismatch', async () => {
    await expectSsrHydration(
      ssrHydrationRoot(
        GhostButton,
        { disabled: true, type: 'submit' },
        {
          default: () => 'Save',
        },
      ),
      {
        assertServerHtml(html) {
          expect(html).toContain('class="ghost-button"')
          expect(html).toContain('type="submit"')
          expect(html).toContain('disabled')
          expect(html).not.toContain('aria-busy')
        },
      },
    )
  })

  it('hydrates closed GhostCollapsible without mismatch', async () => {
    const Closed = defineComponent({
      name: 'ClosedCollapsibleFixture',
      setup() {
        return () =>
          h(GhostCollapsible, null, {
            default: () => [
              h(GhostCollapsibleTrigger, null, () => 'Closed disclosure'),
              h(GhostCollapsibleContent, null, () => 'Hidden SSR disclosure'),
            ],
          })
      },
    })

    await expectSsrHydration(Closed, {
      assertServerHtml(html) {
        expect(html).toContain('Closed disclosure')
        expect(html).toContain('aria-expanded="false"')
        expect(html).toContain('Hidden SSR disclosure')
        expect(html).toContain('hidden')
      },
    })
  })

  it('hydrates closed GhostDropdownMenu without mismatch', async () => {
    const ClosedMenu = defineComponent({
      name: 'ClosedDropdownMenuFixture',
      setup() {
        return () =>
          h(GhostDropdownMenu, null, {
            default: () => [
              h(GhostDropdownMenuTrigger, null, () => 'Menu trigger'),
              h(GhostDropdownMenuContent, null, () => 'Hidden menu panel'),
            ],
          })
      },
    })

    await expectSsrHydration(ClosedMenu, {
      assertServerHtml(html) {
        expect(html).toContain('Menu trigger')
        expect(html).toContain('aria-expanded="false"')
        expect(html).toContain('aria-haspopup="menu"')
        expect(html).not.toContain('Hidden menu panel')
      },
    })
  })

  it('hydrates closed GhostMenubar without mismatch', async () => {
    const ClosedMenubar = defineComponent({
      name: 'ClosedMenubarFixture',
      setup() {
        return () =>
          h(GhostMenubar, null, {
            default: () =>
              h(GhostMenubarMenu, null, {
                default: () => [
                  h(GhostMenubarTrigger, null, () => 'File'),
                  h(GhostMenubarContent, null, () =>
                    h(GhostMenubarItem, null, () => 'Hidden menu item'),
                  ),
                ],
              }),
          })
      },
    })

    await expectSsrHydration(ClosedMenubar, {
      assertServerHtml(html) {
        expect(html).toContain('role="menubar"')
        expect(html).toContain('File')
        expect(html).toContain('aria-expanded="false"')
        expect(html).toContain('role="menuitem"')
        expect(html).not.toContain('Hidden menu item')
      },
    })
  })

  it('hydrates closed GhostContextMenu without mismatch', async () => {
    const ClosedContextMenu = defineComponent({
      name: 'ClosedContextMenuFixture',
      setup() {
        return () =>
          h(GhostContextMenu, null, {
            default: () => [
              h(GhostContextMenuTrigger, null, () => 'Context trigger'),
              h(
                GhostContextMenuContent,
                { portal: false },
                () => 'Hidden context menu panel',
              ),
            ],
          })
      },
    })

    await expectSsrHydration(ClosedContextMenu, {
      assertServerHtml(html) {
        expect(html).toContain('Context trigger')
        expect(html).toContain('aria-haspopup="menu"')
        expect(html).not.toContain('Hidden context menu panel')
        expect(html).toContain('data-part="trigger"')
        expect(html).not.toContain('data-part="content"')
      },
    })
  })

  it('hydrates defaultOpen GhostCollapsible without mismatch', async () => {
    const Open = defineComponent({
      name: 'OpenCollapsibleFixture',
      setup() {
        return () =>
          h(
            GhostCollapsible,
            { defaultOpen: true },
            {
              default: () => [
                h(GhostCollapsibleTrigger, null, () => 'Open disclosure'),
                h(
                  GhostCollapsibleContent,
                  null,
                  () => 'Visible SSR disclosure',
                ),
              ],
            },
          )
      },
    })

    await expectSsrHydration(Open, {
      assertServerHtml(html) {
        expect(html).toContain('Open disclosure')
        expect(html).toContain('aria-expanded="true"')
        expect(html).toContain('Visible SSR disclosure')
        expect(html).not.toContain(' hidden')
      },
    })
  })

  it('hydrates GhostCalendar month grid without mismatch', async () => {
    const CalendarFixture = defineComponent({
      name: 'CalendarFixture',
      setup() {
        return () =>
          h(
            GhostCalendar,
            {
              defaultVisibleMonth: new CalendarDate(2024, 6, 1),
              today: new CalendarDate(2024, 6, 10),
              defaultValue: new CalendarDate(2024, 6, 15),
            },
            {
              default: () => [h(GhostCalendarHeading), h(GhostCalendarGrid)],
            },
          )
      },
    })

    await expectSsrHydration(CalendarFixture, {
      assertServerHtml(html) {
        expect(html).toContain('role="grid"')
        expect(html).toContain('data-ghost-calendar-date="2024-06-15"')
      },
    })
  })

  it('hydrates closed GhostSelect with defaultValue label without mismatch', async () => {
    const ClosedSelect = defineComponent({
      name: 'ClosedSelectFixture',
      setup() {
        return () =>
          h(
            GhostSelect,
            { defaultValue: 'b', name: 'fruit' },
            {
              default: () => [
                h(GhostSelectTrigger, null, () => h(GhostSelectValue)),
                h(GhostSelectContent, { portal: false }, () => [
                  h(
                    GhostSelectOption,
                    { value: 'a', textValue: 'Apple' },
                    () => 'Apple',
                  ),
                  h(
                    GhostSelectOption,
                    { value: 'b', textValue: 'Banana' },
                    () => 'Banana',
                  ),
                ]),
              ],
            },
          )
      },
    })

    await expectSsrHydration(ClosedSelect, {
      assertServerHtml(html) {
        expect(html).toContain('role="combobox"')
        expect(html).toContain('aria-expanded="false"')
        expect(html).toContain('Banana')
        expect(html).toContain('role="listbox"')
      },
    })
  })

  it('hydrates closed GhostCombobox with defaultValue label without mismatch', async () => {
    const ClosedCombobox = defineComponent({
      name: 'ClosedComboboxFixture',
      setup() {
        return () =>
          h(
            GhostCombobox,
            { defaultValue: 'b', name: 'fruit' },
            {
              default: () => [
                h(GhostComboboxInput),
                h(GhostComboboxContent, { portal: false }, () => [
                  h(
                    GhostComboboxOption,
                    { value: 'a', textValue: 'Apple' },
                    () => 'Apple',
                  ),
                  h(
                    GhostComboboxOption,
                    { value: 'b', textValue: 'Banana' },
                    () => 'Banana',
                  ),
                ]),
              ],
            },
          )
      },
    })

    await expectSsrHydration(ClosedCombobox, {
      assertServerHtml(html) {
        expect(html).toContain('role="combobox"')
        expect(html).toContain('aria-expanded="false"')
        expect(html).toContain('Banana')
        expect(html).toContain('role="listbox"')
      },
    })
  })

  it('rejects when client render text disagrees with SSR HTML', async () => {
    const phase = { value: 'server' as 'server' | 'client' }
    const MismatchContent = defineComponent({
      name: 'MismatchContentFixture',
      setup() {
        return () =>
          h(
            'div',
            null,
            phase.value === 'server' ? 'server markup' : 'client markup',
          )
      },
    })

    await expect(
      expectSsrHydration(MismatchContent, {
        beforeHydrate: () => {
          phase.value = 'client'
        },
      }),
    ).rejects.toThrow()
  })

  it('hydrates GhostInlineAlert title id without mismatch', async () => {
    await expectSsrHydration(
      ssrHydrationRoot(
        GhostInlineAlert,
        { as: 'section', headingLevel: 2 },
        {
          title: () => 'Load failed',
          message: () => 'Rows are unavailable.',
        },
      ),
      {
        assertServerHtml(html) {
          expect(html).toContain('data-ghost-inline-alert')
          expect(html).toContain('aria-labelledby=')
          expect(html).toContain('<h2')
          expect(html).toContain('Load failed')
        },
      },
    )
  })

  it('rejects when hydrated ids disagree with SSR HTML', async () => {
    const phase = { value: 'server' as 'server' | 'client' }
    const MismatchId = defineComponent({
      name: 'MismatchIdFixture',
      setup() {
        return () =>
          phase.value === 'server'
            ? h('div', { id: 'ssr-only-id' }, 'stable copy')
            : h('div', { id: 'client-only-id' }, 'stable copy')
      },
    })

    await expect(
      expectSsrHydration(MismatchId, {
        beforeHydrate: () => {
          phase.value = 'client'
        },
      }),
    ).rejects.toThrow()
  })
})
