<script setup lang="ts">
import {
  GhostButton,
  GhostPopover,
  GhostPopoverClose,
  GhostPopoverContent,
  GhostPopoverTrigger,
} from '@ghostvue/themes'
</script>

<template>
  <GhostPopover>
    <GhostPopoverTrigger :as="GhostButton" variant="outline">
      Share settings
    </GhostPopoverTrigger>
    <GhostPopoverContent :offset="8" placement="bottom-start">
      <div class="popover-panel">
        <p class="popover-heading">Workspace access</p>
        <p class="popover-copy">Anyone with the link can view this draft.</p>
        <GhostPopoverClose
          :as="GhostButton"
          variant="soft"
          tone="neutral"
          size="sm"
        >
          Done
        </GhostPopoverClose>
      </div>
    </GhostPopoverContent>
  </GhostPopover>
</template>

<style scoped>
.popover-panel {
  display: grid;
  gap: var(--ghost-space-gap-sm);
  max-inline-size: 16rem;
}

.popover-heading {
  font-weight: var(--ghost-type-weight-semibold);
  margin: 0;
}

.popover-copy {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  margin: 0;
}
</style>
