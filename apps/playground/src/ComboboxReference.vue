<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostCombobox,
  GhostComboboxContent,
  GhostComboboxInput,
  GhostComboboxOption,
} from '@ghostvue/themes'

const pageSize = ref('25')
const multiTags = ref<string[]>(['10'])

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
