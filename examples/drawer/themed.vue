<script setup lang="ts">
import {
  GhostButton,
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
      Inspect order
    </GhostDrawerTrigger>
    <GhostDrawerOverlay />
    <GhostDrawerContent>
      <GhostDrawerTitle>Order #4182</GhostDrawerTitle>
      <GhostDrawerDescription>
        Shipped to Lisbon on November 12. Two items, paid by card.
      </GhostDrawerDescription>
      <div class="drawer-actions">
        <GhostDrawerClose
          :as="GhostButton"
          variant="soft"
          tone="neutral"
          size="sm"
        >
          Close
        </GhostDrawerClose>
        <GhostDrawerClose :as="GhostButton" size="sm">
          Issue refund
        </GhostDrawerClose>
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
