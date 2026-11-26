<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostButton,
  GhostPopover,
  GhostPopoverClose,
  GhostPopoverContent,
  GhostPopoverTrigger,
} from '@ghostvue/vue'

const open = ref(false)
const lastUpdate = ref('')

function onOpenChange(next: boolean): void {
  lastUpdate.value = `update:open → ${String(next)}`
}

function openFromApp(): void {
  open.value = true
}
</script>

<template>
  <div class="controlled-popover">
    <GhostPopover v-model:open="open" @update:open="onOpenChange">
      <GhostPopoverTrigger>Toggle details</GhostPopoverTrigger>
      <GhostPopoverContent
        class="controlled-popover__panel"
        placement="bottom-start"
        :offset="8"
      >
        <p>
          State is owned by the application and stays in sync with the panel.
        </p>
        <GhostPopoverClose>Close</GhostPopoverClose>
      </GhostPopoverContent>
    </GhostPopover>

    <GhostButton type="button" @click="openFromApp"
      >Open from app state</GhostButton
    >

    <p class="controlled-popover__status" role="status">
      Panel is {{ open ? 'open' : 'closed' }}.
      <span v-if="lastUpdate">{{ lastUpdate }}</span>
    </p>
  </div>
</template>

<style>
.controlled-popover {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--ghost-space-gap-sm, 0.75rem);
}

.controlled-popover__panel {
  background-color: var(--ghost-elevation-3-bg, Canvas);
  border: 1px solid var(--ghost-elevation-3-border, GrayText);
  border-radius: var(--ghost-radius-md, 0.375rem);
  box-sizing: border-box;
  color: var(--ghost-surface-fg, CanvasText);
  max-inline-size: min(20rem, calc(100vw - 2rem));
  padding: 0.75rem 1rem;
  z-index: 50;
}

.controlled-popover__panel > p {
  margin: 0 0 0.5rem;
}

.controlled-popover__status {
  flex-basis: 100%;
  margin: 0;
  font-size: 0.875rem;
}
</style>
