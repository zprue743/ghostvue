<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostToggleGroup as GhostToggleGroupThemed,
  GhostToggleGroupItem as GhostToggleGroupItemThemed,
} from '@ghostvue/themes'
import {
  GhostToggleGroup,
  GhostToggleGroupItem,
  type GhostToggleGroupValue,
} from '@ghostvue/vue'

const toolbarModes = ref<string[]>(['align-left'])
const toggleStatus = ref('Segment mode: comfortable')

function onDensityChange(value: GhostToggleGroupValue) {
  const label =
    typeof value === 'string'
      ? value
      : Array.isArray(value)
        ? value.join(', ')
        : 'none'
  toggleStatus.value = `Segment mode: ${label}`
}
</script>

<template>
  <section
    role="region"
    aria-labelledby="toggle-group-heading"
    class="toggle-group-section"
  >
    <h2 id="toggle-group-heading">GhostToggleGroup</h2>
    <p class="toggle-group-status" aria-live="polite">{{ toggleStatus }}</p>

    <fieldset>
      <legend>Headless row density</legend>
      <GhostToggleGroup
        default-value="comfortable"
        aria-label="Playground density"
        data-testid="toggle-group-headless"
        @update:model-value="onDensityChange"
      >
        <GhostToggleGroupItem
          value="compact"
          data-testid="toggle-density-compact"
        >
          Compact
        </GhostToggleGroupItem>
        <GhostToggleGroupItem
          value="comfortable"
          data-testid="toggle-density-comfortable"
        >
          Comfortable
        </GhostToggleGroupItem>
        <GhostToggleGroupItem
          value="relaxed"
          data-testid="toggle-density-relaxed"
        >
          Relaxed
        </GhostToggleGroupItem>
      </GhostToggleGroup>
    </fieldset>

    <fieldset>
      <legend>Themed annotation toolbar</legend>
      <GhostToggleGroupThemed
        v-model="toolbarModes"
        type="multiple"
        aria-label="Annotation styles"
        data-testid="toggle-group-themed"
      >
        <GhostToggleGroupItemThemed value="align-left">
          Align left
        </GhostToggleGroupItemThemed>
        <GhostToggleGroupItemThemed value="highlight">
          Highlight
        </GhostToggleGroupItemThemed>
        <GhostToggleGroupItemThemed value="strike" disabled>
          Strike
        </GhostToggleGroupItemThemed>
      </GhostToggleGroupThemed>
    </fieldset>
  </section>
</template>
