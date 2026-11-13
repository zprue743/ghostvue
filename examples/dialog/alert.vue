<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostButton,
  GhostDialog,
  GhostDialogClose,
  GhostDialogContent,
  GhostDialogDescription,
  GhostDialogOverlay,
  GhostDialogTitle,
  GhostDialogTrigger,
} from '@ghostvue/themes'

const open = ref(false)
const deleted = ref(false)

function confirmDelete(): void {
  deleted.value = true
  open.value = false
}
</script>

<template>
  <div class="alert-demo">
    <GhostDialog v-model:open="open">
      <GhostDialogTrigger :as="GhostButton" tone="danger" variant="outline">
        Delete workspace
      </GhostDialogTrigger>
      <GhostDialogOverlay />
      <GhostDialogContent role="alertdialog">
        <GhostDialogTitle>Delete workspace permanently?</GhostDialogTitle>
        <GhostDialogDescription>
          This removes all projects and cannot be undone. Outside backdrop
          clicks do not dismiss an alert dialog.
        </GhostDialogDescription>
        <div class="dialog-actions">
          <GhostDialogClose
            :as="GhostButton"
            variant="soft"
            tone="neutral"
            size="sm"
          >
            Cancel
          </GhostDialogClose>
          <GhostButton tone="danger" size="sm" @click="confirmDelete">
            Confirm delete
          </GhostButton>
        </div>
      </GhostDialogContent>
    </GhostDialog>
    <p v-if="deleted" class="alert-status">Workspace deleted.</p>
  </div>
</template>

<style scoped>
.alert-demo {
  display: flex;
  align-items: center;
  gap: var(--ghost-space-gap-sm);
}

.alert-status {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  margin: 0;
}

.dialog-actions {
  display: flex;
  gap: var(--ghost-space-gap-sm);
  justify-content: flex-end;
}
</style>
