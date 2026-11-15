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
} from '@ghostvue/vue'

const showHidden = ref(false)
const sort = ref('name')
</script>

<template>
  <GhostContextMenu>
    <GhostContextMenuTrigger
      data-testid="context-basic-trigger"
      class="context-menu-e2e-target"
    >
      Right-click this row for actions
    </GhostContextMenuTrigger>
    <GhostContextMenuContent data-testid="context-basic-content" :offset="4">
      <GhostContextMenuLabel>Row actions</GhostContextMenuLabel>
      <GhostContextMenuSeparator decorative />
      <GhostContextMenuItem data-testid="context-basic-item-edit">
        Edit
      </GhostContextMenuItem>
      <GhostContextMenuItem disabled data-testid="context-basic-item-disabled">
        Archive (disabled)
      </GhostContextMenuItem>
      <GhostContextMenuSeparator decorative />
      <GhostContextMenuCheckboxItem
        v-model:checked="showHidden"
        data-testid="context-checkbox-item"
      >
        Show hidden rows
      </GhostContextMenuCheckboxItem>
      <GhostContextMenuSeparator decorative />
      <GhostContextMenuRadioGroup v-model="sort">
        <GhostContextMenuRadioItem
          value="name"
          data-testid="context-radio-name"
        >
          Sort by name
        </GhostContextMenuRadioItem>
        <GhostContextMenuRadioItem
          value="date"
          data-testid="context-radio-date"
        >
          Sort by date
        </GhostContextMenuRadioItem>
      </GhostContextMenuRadioGroup>
    </GhostContextMenuContent>
  </GhostContextMenu>
</template>

<style scoped>
.context-menu-e2e-target {
  display: block;
  min-height: 12rem;
  width: 100%;
}
</style>
