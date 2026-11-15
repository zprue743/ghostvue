<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostContextMenu,
  GhostContextMenuCheckboxItem,
  GhostContextMenuContent,
  GhostContextMenuItem,
  GhostContextMenuLabel,
  GhostContextMenuRadioGroup,
  GhostContextMenuRadioItem,
  GhostContextMenuSeparator,
  GhostContextMenuTrigger,
} from '@ghostvue/themes'

const pinned = ref(false)
const density = ref('comfortable')
</script>

<template>
  <GhostContextMenu>
    <GhostContextMenuTrigger
      class="ghost-table-row"
      data-testid="context-themed-trigger"
      tabindex="0"
    >
      Invoice #1042 — right-click for row actions
    </GhostContextMenuTrigger>
    <GhostContextMenuContent data-testid="context-themed-content">
      <GhostContextMenuLabel>Row</GhostContextMenuLabel>
      <GhostContextMenuSeparator decorative />
      <GhostContextMenuItem>Open</GhostContextMenuItem>
      <GhostContextMenuItem>Duplicate</GhostContextMenuItem>
      <GhostContextMenuSeparator decorative />
      <GhostContextMenuCheckboxItem v-model:checked="pinned">
        Pin row
      </GhostContextMenuCheckboxItem>
      <GhostContextMenuSeparator decorative />
      <GhostContextMenuRadioGroup v-model="density">
        <GhostContextMenuRadioItem value="compact">
          Compact density
        </GhostContextMenuRadioItem>
        <GhostContextMenuRadioItem value="comfortable">
          Comfortable density
        </GhostContextMenuRadioItem>
      </GhostContextMenuRadioGroup>
    </GhostContextMenuContent>
  </GhostContextMenu>
</template>
