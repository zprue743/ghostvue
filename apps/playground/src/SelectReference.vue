<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostSelect,
  GhostSelectContent,
  GhostSelectOption,
  GhostSelectTrigger,
  GhostSelectValue,
} from '@ghostvue/themes'

const pageSize = ref('25')

/*
 * GHO-162 order fixture: keyed list mutations leave the option registry in
 * registration order; open-time focus and typeahead must follow the rendered
 * order instead. Banana, blueberry, and bilberry share a typeahead prefix.
 */
interface OrderOption {
  value: string
  disabled: boolean
}
const fruits = ['apple', 'banana', 'blueberry', 'cherry']
const orderOptions = ref<OrderOption[]>(
  fruits.map((value) => ({ value, disabled: false })),
)
const orderValue = ref<string | undefined>(undefined)

function setOrder(values: string[], disabled: string[] = []): void {
  orderOptions.value = values.map((value) => ({
    value,
    disabled: disabled.includes(value),
  }))
}

function labelOf(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
</script>

<template>
  <section
    aria-labelledby="select-heading"
    data-testid="select-demo-section"
    class="select-section"
  >
    <h2 id="select-heading">GhostSelect</h2>
    <GhostSelect v-model="pageSize">
      <GhostSelectTrigger
        data-testid="select-demo-trigger"
        aria-label="Rows per page"
      >
        <GhostSelectValue placeholder="Rows per page" />
      </GhostSelectTrigger>
      <GhostSelectContent data-testid="select-demo-content" :offset="6">
        <GhostSelectOption value="10">10 rows</GhostSelectOption>
        <GhostSelectOption value="25">25 rows</GhostSelectOption>
        <GhostSelectOption value="50">50 rows</GhostSelectOption>
      </GhostSelectContent>
    </GhostSelect>

    <h3 id="select-order-heading">Dynamic option order</h3>
    <div
      role="group"
      aria-label="Select option list controls"
      class="select-order-controls"
    >
      <button
        type="button"
        data-testid="select-order-filter"
        @click="setOrder(['cherry'])"
      >
        Filter to cherry
      </button>
      <button
        type="button"
        data-testid="select-order-restore"
        @click="setOrder(fruits)"
      >
        Restore
      </button>
      <button
        type="button"
        data-testid="select-order-reorder"
        @click="setOrder(['cherry', 'blueberry', 'banana', 'apple'])"
      >
        Reverse
      </button>
      <button
        type="button"
        data-testid="select-order-insert"
        @click="setOrder(['bilberry', ...fruits], ['apple'])"
      >
        Insert bilberry first, disable apple
      </button>
    </div>
    <GhostSelect v-model="orderValue">
      <GhostSelectTrigger
        data-testid="select-order-trigger"
        aria-labelledby="select-order-heading"
      >
        <GhostSelectValue placeholder="Pick a fruit" />
      </GhostSelectTrigger>
      <GhostSelectContent data-testid="select-order-content" :offset="6">
        <GhostSelectOption
          v-for="option in orderOptions"
          :key="option.value"
          :value="option.value"
          :text-value="labelOf(option.value)"
          :disabled="option.disabled"
        >
          {{ labelOf(option.value) }}
        </GhostSelectOption>
      </GhostSelectContent>
    </GhostSelect>
  </section>
</template>

<style scoped>
.select-order-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-block-end: 0.75rem;
}
</style>
