<script setup lang="ts">
import { computed, ref } from 'vue'

import {
  GhostCommandPalette,
  GhostCommandPaletteContent,
  GhostCommandPaletteEmpty,
  GhostCommandPaletteInput,
  GhostCommandPaletteItem,
  GhostCommandPaletteList,
  GhostCommandPaletteOverlay,
  GhostCommandPaletteTitle,
  GhostCommandPaletteTrigger,
  type GhostCommandPaletteCommandPayload,
} from '@ghostvue/vue'

// 2,000 generated records stand in for a large application catalog.
const catalog = Array.from({ length: 2000 }, (_, index) => ({
  id: `record-${String(index + 1)}`,
  label: `Open record ${String(index + 1).padStart(4, '0')}`,
}))

/*
 * The palette has no `virtualized` prop (C9): the consumer owns slicing.
 * Only the first `windowSize` matches are mounted, so the item registry,
 * keyboard highlight, and result-count announcement cover the mounted
 * slice. Ids stay stable, so a command keeps its highlight while the slice
 * changes around it. A scroll virtualizer follows the same rules.
 */
const windowSize = 50
const search = ref('')
const opened = ref('Nothing yet')

const matches = computed(() => {
  const query = search.value.trim().toLowerCase()
  return query
    ? catalog.filter((record) => record.label.toLowerCase().includes(query))
    : catalog
})
const mounted = computed(() => matches.value.slice(0, windowSize))

function onCommand({ id }: GhostCommandPaletteCommandPayload): void {
  opened.value = catalog.find((record) => record.id === id)?.label ?? id
}
</script>

<template>
  <div>
    <GhostCommandPalette v-model:search="search" @command="onCommand">
      <GhostCommandPaletteTrigger>Find a record</GhostCommandPaletteTrigger>
      <GhostCommandPaletteOverlay />
      <GhostCommandPaletteContent>
        <GhostCommandPaletteTitle>Find a record</GhostCommandPaletteTitle>
        <GhostCommandPaletteInput placeholder="Record number" />
        <GhostCommandPaletteList style="max-block-size: 16rem; overflow: auto">
          <GhostCommandPaletteItem
            v-for="record in mounted"
            :id="record.id"
            :key="record.id"
          >
            {{ record.label }}
          </GhostCommandPaletteItem>
          <GhostCommandPaletteEmpty>No records match.</GhostCommandPaletteEmpty>
        </GhostCommandPaletteList>
        <p v-if="matches.length > mounted.length">
          Showing {{ mounted.length }} of {{ matches.length }} matches. Keep
          typing to narrow the list.
        </p>
      </GhostCommandPaletteContent>
    </GhostCommandPalette>
    <p>
      Opened: <output>{{ opened }}</output>
    </p>
  </div>
</template>
