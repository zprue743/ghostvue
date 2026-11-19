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
  GhostDrawer,
  GhostDrawerClose,
  GhostDrawerContent,
  GhostDrawerDescription,
  GhostDrawerOverlay,
  GhostDrawerTitle,
  GhostDrawerTrigger,
} from '@ghostvue/themes'
</script>

<template>
  <GhostDrawer>
    <GhostDrawerTrigger :as="GhostButton" variant="outline">
      Edit filters
    </GhostDrawerTrigger>
    <GhostDrawerOverlay />
    <GhostDrawerContent>
      <GhostDrawerTitle>Table filters</GhostDrawerTitle>
      <GhostDrawerDescription>
        Escape closes the confirmation first, then the drawer.
      </GhostDrawerDescription>
      <div class="drawer-actions">
        <GhostDialog>
          <GhostDialogTrigger :as="GhostButton" variant="soft" tone="danger">
            Reset filters
          </GhostDialogTrigger>
          <GhostDialogOverlay />
          <GhostDialogContent role="alertdialog">
            <GhostDialogTitle>Reset all filters?</GhostDialogTitle>
            <GhostDialogDescription>
              Saved filter presets are not affected.
            </GhostDialogDescription>
            <div class="drawer-actions">
              <GhostDialogClose
                :as="GhostButton"
                variant="soft"
                tone="neutral"
                size="sm"
              >
                Cancel
              </GhostDialogClose>
              <GhostDialogClose :as="GhostButton" tone="danger" size="sm">
                Reset
              </GhostDialogClose>
            </div>
          </GhostDialogContent>
        </GhostDialog>
        <GhostDrawerClose :as="GhostButton" size="sm">Done</GhostDrawerClose>
      </div>
    </GhostDrawerContent>
  </GhostDrawer>
</template>

<style scoped>
.drawer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm);
  justify-content: flex-end;
}
</style>
