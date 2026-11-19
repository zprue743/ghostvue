<script setup lang="ts">
import { computed, ref } from 'vue'

import { GhostInput, type GhostInputSize } from '@ghostvue/themes'

/*
 * Optional so the sample runs as-is; the docs props playground passes them
 * to try other states. The defaults (`md`, and Vue's `false` for absent
 * booleans) are what this sample renders.
 */
const {
  size = 'md',
  disabled,
  invalid,
} = defineProps<{
  size?: GhostInputSize
  disabled?: boolean
  invalid?: boolean
}>()

// Deterministic local data; a real app would query its own source.
const reports = [
  'Q3 revenue forecast',
  'Churn by region',
  'Forecast accuracy, trailing twelve months',
  'Seat expansion by plan',
] as const

const query = ref('')

const matches = computed(() => {
  const needle = query.value.trim().toLowerCase()
  return needle === ''
    ? reports
    : reports.filter((report) => report.toLowerCase().includes(needle))
})
</script>

<template>
  <div class="search">
    <label class="search__field">
      <span class="search__label">Search reports</span>
      <GhostInput
        v-model="query"
        type="search"
        name="q"
        placeholder="Forecast"
        block
        :size
        :disabled
        :invalid
      />
    </label>
    <p class="search__count" role="status">
      {{ matches.length }} of {{ reports.length }} reports
    </p>
    <ul class="search__results" aria-label="Matching reports">
      <li v-for="report in matches" :key="report">{{ report }}</li>
    </ul>
  </div>
</template>

<style scoped>
.search {
  display: grid;
  gap: var(--ghost-space-stack-md);
  max-inline-size: 28rem;
}

.search__field {
  display: grid;
  gap: var(--ghost-space-stack-sm);
}

.search__label {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-sm);
  font-weight: var(--ghost-type-weight-medium);
  line-height: var(--ghost-type-line-snug);
}

.search__count {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-snug);
  margin: 0;
}

/* Owns list spacing so docs prose rules do not decide it. */
.search__results {
  color: var(--ghost-text-default);
  display: grid;
  font-size: var(--ghost-type-size-sm);
  gap: var(--ghost-space-gap-xs);
  line-height: var(--ghost-type-line-snug);
  list-style: none;
  margin: 0;
  overflow-wrap: anywhere;
  padding: 0;
}
</style>
