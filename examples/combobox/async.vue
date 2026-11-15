<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostCombobox,
  GhostComboboxContent,
  GhostComboboxEmpty,
  GhostComboboxInput,
  GhostComboboxOption,
  useGhostComboboxAsyncSearch,
} from '@ghostvue/vue'

const loading = ref(false)
const options = ref<{ value: string; label: string }[]>([
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'orange', label: 'Orange' },
])

const { nextRequestId, isLatest } = useGhostComboboxAsyncSearch()

const source = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'orange', label: 'Orange' },
  { value: 'grape', label: 'Grape' },
]

async function onSearch(payload: { query: string; requestId: number }) {
  const requestId = nextRequestId()
  loading.value = true
  await new Promise((resolve) => setTimeout(resolve, 200))
  if (!isLatest(requestId)) {
    loading.value = false
    return
  }
  const lowered = payload.query.toLowerCase()
  options.value = source.filter((entry) =>
    entry.label.toLowerCase().includes(lowered),
  )
  loading.value = false
}
</script>

<template>
  <GhostCombobox :loading="loading" @search="onSearch">
    <GhostComboboxInput
      aria-label="Search fruits"
      placeholder="Search async list"
    />
    <GhostComboboxContent :portal="false">
      <GhostComboboxOption
        v-for="option in options"
        :key="option.value"
        :value="option.value"
        :text-value="option.label"
      >
        {{ option.label }}
      </GhostComboboxOption>
      <GhostComboboxEmpty>No matches</GhostComboboxEmpty>
    </GhostComboboxContent>
  </GhostCombobox>
</template>
