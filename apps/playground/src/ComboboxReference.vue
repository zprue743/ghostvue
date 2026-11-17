<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostCombobox,
  GhostComboboxContent,
  GhostComboboxGroup,
  GhostComboboxInput,
  GhostComboboxLabel,
  GhostComboboxOption,
  GhostComboboxTrigger,
} from '@ghostvue/themes'

const pageSize = ref('25')
const multiTags = ref<string[]>(['10'])

/*
 * GHO-166 focus-departure fixtures: an inline (`portal: false`) combobox with
 * a trigger between two outside buttons, and a parent that controls `open`,
 * accepts opening, and rejects every close request until released.
 */
const departureFruit = ref<string | undefined>('banana')
const pinnedOpen = ref(false)
const rejectedCloseCount = ref(0)
function onPinnedOpenUpdate(next: boolean): void {
  if (next) {
    pinnedOpen.value = true
    return
  }
  rejectedCloseCount.value += 1
}

/*
 * GHO-162 order fixture: keyed list mutations (filter + restore, reorder,
 * insert before, disable) and a virtualized window that scrolls back. The
 * registry appends on mount, so each of these leaves registration order out
 * of step with the rendered order that keyboard traversal must follow.
 */
interface OrderOption {
  value: string
  disabled: boolean
}
const fruits = ['apple', 'banana', 'cherry']
const windowItems = Array.from(
  { length: 8 },
  (_, index) => `item-${String(index + 1)}`,
)
const orderOptions = ref<OrderOption[]>(
  fruits.map((value) => ({ value, disabled: false })),
)

function setOrder(values: string[], disabled: string[] = []): void {
  orderOptions.value = values.map((value) => ({
    value,
    disabled: disabled.includes(value),
  }))
}

function labelOf(value: string): string {
  return value.charAt(0).toUpperCase() + value.replace('-', ' ').slice(1)
}
</script>

<template>
  <section
    aria-labelledby="combobox-heading"
    data-testid="combobox-demo-section"
    class="combobox-section"
  >
    <h2 id="combobox-heading">GhostCombobox</h2>
    <GhostCombobox v-model="pageSize">
      <GhostComboboxInput
        data-testid="combobox-demo-input"
        aria-label="Rows per page"
        placeholder="Rows per page"
      />
      <GhostComboboxContent data-testid="combobox-demo-content" :offset="6">
        <GhostComboboxOption value="10" text-value="10 rows">
          10 rows
        </GhostComboboxOption>
        <GhostComboboxOption value="25" text-value="25 rows">
          25 rows
        </GhostComboboxOption>
        <GhostComboboxOption value="50" text-value="50 rows">
          50 rows
        </GhostComboboxOption>
        <GhostComboboxOption
          value="100"
          text-value="100 rows"
          disabled
          data-testid="combobox-demo-disabled-option"
        >
          100 rows (disabled)
        </GhostComboboxOption>
      </GhostComboboxContent>
    </GhostCombobox>

    <h3 id="combobox-multi-heading">Multi-select</h3>
    <GhostCombobox
      v-model="multiTags"
      multiple
      data-testid="combobox-multi-root"
    >
      <GhostComboboxInput
        data-testid="combobox-multi-input"
        aria-labelledby="combobox-multi-heading"
        placeholder="Pick page sizes"
      />
      <GhostComboboxContent data-testid="combobox-multi-content" :offset="6">
        <GhostComboboxOption value="10" text-value="10 rows">
          10 rows
        </GhostComboboxOption>
        <GhostComboboxOption value="25" text-value="25 rows">
          25 rows
        </GhostComboboxOption>
        <GhostComboboxOption value="50" text-value="50 rows">
          50 rows
        </GhostComboboxOption>
      </GhostComboboxContent>
    </GhostCombobox>

    <h3 id="combobox-departure-heading">Focus departure</h3>
    <button type="button" data-testid="combobox-departure-before">
      Before combobox
    </button>
    <GhostCombobox v-model="departureFruit">
      <GhostComboboxInput
        data-testid="combobox-departure-input"
        aria-label="Fruit"
        placeholder="Pick a fruit"
      />
      <GhostComboboxTrigger
        data-testid="combobox-departure-trigger"
        aria-label="Show fruits"
      >
        ▾
      </GhostComboboxTrigger>
      <GhostComboboxContent
        data-testid="combobox-departure-content"
        :portal="false"
        :offset="6"
      >
        <GhostComboboxGroup>
          <GhostComboboxLabel data-testid="combobox-departure-label">
            Fruits
          </GhostComboboxLabel>
          <GhostComboboxOption value="apple" text-value="Apple">
            Apple
          </GhostComboboxOption>
          <GhostComboboxOption value="banana" text-value="Banana">
            Banana
          </GhostComboboxOption>
          <GhostComboboxOption value="cherry" text-value="Cherry">
            Cherry
          </GhostComboboxOption>
        </GhostComboboxGroup>
      </GhostComboboxContent>
    </GhostCombobox>
    <button type="button" data-testid="combobox-departure-after">
      After combobox
    </button>

    <h3 id="combobox-pinned-heading">Controlled open (rejects close)</h3>
    <GhostCombobox :open="pinnedOpen" @update:open="onPinnedOpenUpdate">
      <GhostComboboxInput
        data-testid="combobox-pinned-input"
        aria-label="Pinned number"
        placeholder="Always open"
      />
      <GhostComboboxContent
        data-testid="combobox-pinned-content"
        :portal="false"
        :offset="6"
      >
        <GhostComboboxOption value="one" text-value="One">
          One
        </GhostComboboxOption>
        <GhostComboboxOption value="two" text-value="Two">
          Two
        </GhostComboboxOption>
      </GhostComboboxContent>
    </GhostCombobox>
    <p>
      Rejected close requests:
      <span data-testid="combobox-pinned-rejections">{{
        rejectedCloseCount
      }}</span>
    </p>
    <button
      type="button"
      data-testid="combobox-pinned-release"
      @click="pinnedOpen = false"
    >
      Release pinned combobox
    </button>

    <h3 id="combobox-order-heading">Dynamic option order</h3>
    <div
      role="group"
      aria-label="Combobox option list controls"
      class="combobox-order-controls"
    >
      <button
        type="button"
        data-testid="combobox-order-filter"
        @click="setOrder(['banana'])"
      >
        Filter to banana
      </button>
      <button
        type="button"
        data-testid="combobox-order-restore"
        @click="setOrder(fruits)"
      >
        Restore
      </button>
      <button
        type="button"
        data-testid="combobox-order-reverse"
        @click="setOrder(['cherry', 'banana', 'apple'])"
      >
        Reverse
      </button>
      <button
        type="button"
        data-testid="combobox-order-insert"
        @click="setOrder(['apricot', ...fruits])"
      >
        Insert apricot first
      </button>
      <button
        type="button"
        data-testid="combobox-order-disable"
        @click="setOrder(['apricot', ...fruits], ['apricot', 'cherry'])"
      >
        Disable apricot and cherry
      </button>
      <button
        type="button"
        data-testid="combobox-order-window-start"
        @click="setOrder(windowItems.slice(0, 4))"
      >
        Window 1–4
      </button>
      <button
        type="button"
        data-testid="combobox-order-window-later"
        @click="setOrder(windowItems.slice(3, 7))"
      >
        Window 4–7
      </button>
    </div>
    <GhostCombobox virtualized>
      <GhostComboboxInput
        data-testid="combobox-order-input"
        aria-labelledby="combobox-order-heading"
        placeholder="Pick a fruit"
      />
      <GhostComboboxContent data-testid="combobox-order-content" :offset="6">
        <GhostComboboxOption
          v-for="option in orderOptions"
          :key="option.value"
          :value="option.value"
          :text-value="labelOf(option.value)"
          :disabled="option.disabled"
        >
          {{ labelOf(option.value) }}
        </GhostComboboxOption>
      </GhostComboboxContent>
    </GhostCombobox>
  </section>
</template>

<style scoped>
.combobox-order-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-block-end: 0.75rem;
}
</style>
