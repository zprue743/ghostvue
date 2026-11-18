<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostButton,
  GhostDrawer,
  GhostDrawerClose,
  GhostDrawerContent,
  GhostDrawerDescription,
  GhostDrawerTitle,
  GhostDrawerTrigger,
} from '@ghostvue/themes'

const open = ref(false)
const selections = ref(0)
</script>

<template>
  <div class="drawer-non-modal">
    <GhostDrawer v-model:open="open" :modal="false">
      <GhostDrawerTrigger :as="GhostButton" variant="outline">
        {{ open ? 'Hide' : 'Show' }} row details
      </GhostDrawerTrigger>
      <GhostDrawerContent>
        <GhostDrawerTitle>Row details</GhostDrawerTitle>
        <GhostDrawerDescription>
          Non-modal: the page behind stays scrollable and interactive.
        </GhostDrawerDescription>
        <GhostDrawerClose :as="GhostButton" size="sm">Close</GhostDrawerClose>
      </GhostDrawerContent>
    </GhostDrawer>
    <GhostButton variant="soft" tone="neutral" @click="selections += 1">
      Select another row ({{ selections }})
    </GhostButton>
  </div>
</template>

<style scoped>
.drawer-non-modal {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm);
}
</style>
