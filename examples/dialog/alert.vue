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
        <div class="alert-demo__actions">
          <GhostDialogClose :as="GhostButton" variant="soft" tone="neutral">
            Cancel
          </GhostDialogClose>
          <GhostButton tone="danger" @click="confirmDelete">
            Confirm delete
          </GhostButton>
        </div>
      </GhostDialogContent>
    </GhostDialog>
    <p class="alert-demo__status" role="status">
      {{ deleted ? 'Workspace deleted.' : '' }}
    </p>
  </div>
</template>

<style scoped>
.alert-demo {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm) var(--ghost-space-gap-md);
}

.alert-demo__status {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-snug);
  margin: 0;
}

.alert-demo__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm);
  justify-content: flex-end;
}
</style>
