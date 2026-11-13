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
      Open outer dialog
    </GhostDialogTrigger>
    <GhostDialogOverlay />
    <GhostDialogContent>
      <GhostDialogTitle>Outer dialog</GhostDialogTitle>
      <GhostDialogDescription>
        Pressing Escape while the confirmation dialog is open closes only the
        inner layer.
      </GhostDialogDescription>
      <div class="dialog-actions">
        <GhostDialog>
          <GhostDialogTrigger :as="GhostButton" variant="soft">
            Review details
          </GhostDialogTrigger>
          <GhostDialogOverlay />
          <GhostDialogContent>
            <GhostDialogTitle>Inner dialog</GhostDialogTitle>
            <GhostDialogDescription>
              Closing this inner dialog restores focus and background isolation
              to the outer dialog.
            </GhostDialogDescription>
            <div class="dialog-actions">
              <GhostDialogClose :as="GhostButton" size="sm">
                Close inner
              </GhostDialogClose>
            </div>
          </GhostDialogContent>
        </GhostDialog>

        <GhostDialogClose
          :as="GhostButton"
          variant="soft"
          tone="neutral"
          size="sm"
        >
          Close outer
        </GhostDialogClose>
      </div>
    </GhostDialogContent>
  </GhostDialog>
</template>

<style scoped>
.dialog-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm);
  justify-content: flex-end;
}
</style>
