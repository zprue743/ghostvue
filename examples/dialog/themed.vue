<script setup lang="ts">
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
</script>

<template>
  <GhostDialog>
    <GhostDialogTrigger :as="GhostButton" variant="outline">
      Edit profile
    </GhostDialogTrigger>
    <GhostDialogOverlay />
    <GhostDialogContent>
      <GhostDialogTitle>Profile details</GhostDialogTitle>
      <GhostDialogDescription>
        Changes apply immediately across your workspace.
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
        <GhostDialogClose :as="GhostButton" size="sm">
          Save changes
        </GhostDialogClose>
      </div>
    </GhostDialogContent>
  </GhostDialog>
</template>

<style scoped>
.dialog-actions {
  display: flex;
  gap: var(--ghost-space-gap-sm);
  justify-content: flex-end;
}
</style>
