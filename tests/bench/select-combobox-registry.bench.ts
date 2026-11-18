import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { bench, describe } from 'vitest'

import GhostCombobox from '../../packages/vue/src/GhostCombobox.vue'
import GhostComboboxContent from '../../packages/vue/src/GhostComboboxContent.vue'
import GhostComboboxInput from '../../packages/vue/src/GhostComboboxInput.vue'
import GhostComboboxOption from '../../packages/vue/src/GhostComboboxOption.vue'
import GhostSelect from '../../packages/vue/src/GhostSelect.vue'
import GhostSelectContent from '../../packages/vue/src/GhostSelectContent.vue'
import GhostSelectOption from '../../packages/vue/src/GhostSelectOption.vue'
import GhostSelectTrigger from '../../packages/vue/src/GhostSelectTrigger.vue'
import GhostSelectValue from '../../packages/vue/src/GhostSelectValue.vue'
import { useGhostCombobox } from '../../packages/vue/src/use-ghost-combobox'
import { useGhostSelect } from '../../packages/vue/src/use-ghost-select'

/*
 * GHO-176: Select / Combobox option-registry churn for large dynamic lists.
 *
 * Not part of `pnpm verify` or CI: timings are machine-dependent, so the
 * bench exists to compare a change against `master` on the same host
 * (`pnpm bench:registry`). Two layers are measured:
 *
 * - "registry" calls the composable directly, so it isolates the
 *   bookkeeping (order array, label/record maps, version counters, open
 *   Combobox announcements) from rendering.
 * - "mounted" renders real option components in jsdom (open listbox, as a
 *   user typing into a large Combobox would see), so it shows whether the
 *   registry is a meaningful share of a realistic mount / filter / remount /
 *   keyed reorder cycle.
 */

const SIZES = [200, 1000, 3000] as const

const values = (count: number): string[] =>
  Array.from({ length: count }, (_, index) => `option-${String(index)}`)

const noElement = (): HTMLElement | null => null

/**
 * Runs `body` inside a throwaway component so composables that call
 * `useId()` have an instance; nothing is rendered, and unmounting stops the
 * composable's watchers.
 */
function withHost(body: () => void): void {
  const wrapper = mount(
    defineComponent({
      setup() {
        body()
        return () => null
      },
    }),
  )
  wrapper.unmount()
}

describe.each(SIZES)('registry: %i options', (count) => {
  const all = values(count)
  const even = all.filter((_, index) => index % 2 === 0)
  const odd = all.filter((_, index) => index % 2 === 1)

  bench('combobox (open): register, unregister half, re-register', () => {
    withHost(() => {
      const combobox = useGhostCombobox({ defaultOpen: true })
      for (const value of all) {
        combobox.registerOption(value, value, false, value, noElement)
      }
      for (const value of odd) {
        combobox.unregisterOption(value)
      }
      for (const value of odd) {
        combobox.registerOption(value, value, false, value, noElement)
      }
      if (combobox.optionCount.value !== count) {
        throw new Error('registry lost options')
      }
    })
  })

  bench('select: register, unregister half, re-register', () => {
    withHost(() => {
      const select = useGhostSelect()
      for (const value of all) {
        select.registerOption(value, value, false, noElement)
      }
      for (const value of even) {
        select.unregisterOption(value)
      }
      for (const value of even) {
        select.registerOption(value, value, false, noElement)
      }
      if (select.optionOrder.value.length !== count) {
        throw new Error('registry lost options')
      }
    })
  })
})

async function settle(): Promise<void> {
  await flushPromises()
  await nextTick()
  await flushPromises()
}

/**
 * Mount (all options), filter to every other option, restore, then reverse
 * the keyed list: the representative consumer churn for a filtered list.
 */
async function runMountedWorkload(
  count: number,
  render: (visible: () => string[]) => ReturnType<typeof defineComponent>,
): Promise<void> {
  const all = values(count)
  const visible = ref(all)
  const wrapper = mount(
    render(() => visible.value),
    { attachTo: document.body },
  )
  await settle()
  visible.value = all.filter((_, index) => index % 2 === 0)
  await settle()
  visible.value = all
  await settle()
  visible.value = [...all].reverse()
  await settle()
  wrapper.unmount()
}

const comboboxFixture = (visible: () => string[]) =>
  defineComponent({
    setup() {
      return () =>
        h(
          GhostCombobox,
          { defaultOpen: true, virtualized: true },
          {
            default: () => [
              h(GhostComboboxInput, { 'aria-label': 'Option' }),
              h(GhostComboboxContent, { portal: false }, () =>
                visible().map((value) =>
                  h(
                    GhostComboboxOption,
                    { key: value, value, textValue: value },
                    () => value,
                  ),
                ),
              ),
            ],
          },
        )
    },
  })

const selectFixture = (visible: () => string[]) =>
  defineComponent({
    setup() {
      return () =>
        h(
          GhostSelect,
          { defaultOpen: true, defaultValue: 'option-1' },
          {
            default: () => [
              h(GhostSelectTrigger, null, () => h(GhostSelectValue)),
              h(GhostSelectContent, { portal: false }, () =>
                visible().map((value) =>
                  h(
                    GhostSelectOption,
                    { key: value, value, textValue: value },
                    () => value,
                  ),
                ),
              ),
            ],
          },
        )
    },
  })

describe.each(SIZES)('mounted: %i options', (count) => {
  // jsdom mounts of thousands of components take hundreds of milliseconds;
  // a few iterations are enough to separate the before / after numbers.
  const options = { iterations: count > 1000 ? 3 : 8, warmupIterations: 1 }

  bench(
    'combobox: mount, filter, restore, keyed reverse',
    async () => {
      await runMountedWorkload(count, comboboxFixture)
    },
    options,
  )

  bench(
    'select: mount, filter, restore, keyed reverse',
    async () => {
      await runMountedWorkload(count, selectFixture)
    },
    options,
  )
})
