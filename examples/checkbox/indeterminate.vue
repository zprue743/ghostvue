<script setup lang="ts">
import { computed, reactive } from 'vue'

import { GhostCheckbox } from '@ghostvue/vue'

const items = reactive([
  { id: 'product', label: 'Product updates', selected: true },
  { id: 'digest', label: 'Weekly digest', selected: false },
])

const allSelected = computed(() => items.every((item) => item.selected))
const someSelected = computed(
  () => items.some((item) => item.selected) && !allSelected.value,
)

function toggleAll(checked: boolean): void {
  for (const item of items) {
    item.selected = checked
  }
}
</script>

<template>
  <div class="stack">
    <label>
      <GhostCheckbox
        :model-value="allSelected"
        :indeterminate="someSelected"
        @update:model-value="toggleAll"
      />
      All notifications
    </label>
    <label v-for="item in items" :key="item.id">
      <GhostCheckbox v-model="item.selected" />
      {{ item.label }}
    </label>
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 0.5rem;
  justify-items: start;
}

label {
  align-items: center;
  display: flex;
  gap: 0.5rem;
}
</style>
