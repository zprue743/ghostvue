<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostSegmentedControl as GhostSegmentedControlThemed,
  GhostSegmentedControlItem as GhostSegmentedControlItemThemed,
} from '@ghostvue/themes'
import { GhostSegmentedControl, GhostSegmentedControlItem } from '@ghostvue/vue'

const view = ref('table')
const status = ref('Playground view: table')
</script>

<template>
  <section
    role="region"
    aria-labelledby="segmented-control-heading"
    class="segmented-control-section"
  >
    <h2 id="segmented-control-heading">GhostSegmentedControl</h2>
    <p class="segmented-control-status" aria-live="polite">{{ status }}</p>

    <fieldset>
      <legend>Headless workspace view</legend>
      <GhostSegmentedControl
        v-model="view"
        aria-label="Playground workspace view"
        data-testid="segmented-control-headless"
        @update:model-value="
          (value) => (status = `Playground view: ${value ?? 'none'}`)
        "
      >
        <GhostSegmentedControlItem value="table" data-testid="segmented-table">
          Table
        </GhostSegmentedControlItem>
        <GhostSegmentedControlItem
          value="kanban"
          data-testid="segmented-kanban"
        >
          Kanban
        </GhostSegmentedControlItem>
        <GhostSegmentedControlItem
          value="calendar"
          data-testid="segmented-calendar"
        >
          Calendar
        </GhostSegmentedControlItem>
      </GhostSegmentedControl>
    </fieldset>

    <fieldset>
      <legend>Themed time range</legend>
      <GhostSegmentedControlThemed
        default-value="month"
        aria-label="Playground time range"
        data-testid="segmented-control-themed"
      >
        <GhostSegmentedControlItemThemed value="week"
          >Week</GhostSegmentedControlItemThemed
        >
        <GhostSegmentedControlItemThemed value="month"
          >Month</GhostSegmentedControlItemThemed
        >
        <GhostSegmentedControlItemThemed value="quarter"
          >Quarter</GhostSegmentedControlItemThemed
        >
      </GhostSegmentedControlThemed>
    </fieldset>
  </section>
</template>
