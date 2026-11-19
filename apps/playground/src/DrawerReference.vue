<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostDialog,
  GhostDialogClose,
  GhostDialogContent,
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
  type GhostDrawerSide,
} from '@ghostvue/themes'

const sides: readonly GhostDrawerSide[] = ['start', 'end', 'top', 'bottom']
const outsideClicks = ref(0)
</script>

<template>
  <section aria-labelledby="drawer-heading" class="drawer-section">
    <h2 id="drawer-heading">GhostDrawer</h2>

    <div class="drawer-row">
      <!-- Default modal drawer (side="end"). -->
      <GhostDrawer>
        <GhostDrawerTrigger data-testid="drawer-basic-trigger">
          Open filters drawer
        </GhostDrawerTrigger>
        <GhostDrawerOverlay data-testid="drawer-basic-overlay" />
        <GhostDrawerContent data-testid="drawer-basic-content">
          <GhostDrawerTitle>Filters</GhostDrawerTitle>
          <GhostDrawerDescription>
            Modal drawer with trapped focus, scroll lock, and inert background.
          </GhostDrawerDescription>
          <button type="button" data-testid="drawer-basic-first">
            Apply filters
          </button>
          <GhostDrawerClose data-testid="drawer-basic-close">
            Close filters
          </GhostDrawerClose>
        </GhostDrawerContent>
      </GhostDrawer>

      <!-- One drawer per side for edge geometry checks. -->
      <GhostDrawer v-for="side in sides" :key="side" :side="side">
        <GhostDrawerTrigger :data-testid="`drawer-side-${side}-trigger`">
          Open {{ side }} drawer
        </GhostDrawerTrigger>
        <GhostDrawerOverlay />
        <GhostDrawerContent :data-testid="`drawer-side-${side}-content`">
          <GhostDrawerTitle>{{ side }} drawer</GhostDrawerTitle>
          <GhostDrawerClose>Close {{ side }} drawer</GhostDrawerClose>
        </GhostDrawerContent>
      </GhostDrawer>
    </div>

    <!-- Localized RTL subtree: portaled drawers must still flip edges. -->
    <div dir="rtl" class="drawer-row" data-testid="drawer-rtl-region">
      <GhostDrawer side="start">
        <GhostDrawerTrigger data-testid="drawer-rtl-start-trigger">
          Open RTL start drawer
        </GhostDrawerTrigger>
        <GhostDrawerOverlay />
        <GhostDrawerContent data-testid="drawer-rtl-start-content">
          <GhostDrawerTitle>RTL start drawer</GhostDrawerTitle>
          <GhostDrawerClose>Close RTL start drawer</GhostDrawerClose>
        </GhostDrawerContent>
      </GhostDrawer>
      <GhostDrawer side="end">
        <GhostDrawerTrigger data-testid="drawer-rtl-end-trigger">
          Open RTL end drawer
        </GhostDrawerTrigger>
        <GhostDrawerOverlay />
        <GhostDrawerContent data-testid="drawer-rtl-end-content">
          <GhostDrawerTitle>RTL end drawer</GhostDrawerTitle>
          <GhostDrawerClose>Close RTL end drawer</GhostDrawerClose>
        </GhostDrawerContent>
      </GhostDrawer>
    </div>

    <div class="drawer-row">
      <!-- Non-modal drawer: page stays interactive. -->
      <GhostDrawer :modal="false" side="end">
        <GhostDrawerTrigger data-testid="drawer-nonmodal-trigger">
          Open non-modal drawer
        </GhostDrawerTrigger>
        <GhostDrawerOverlay data-testid="drawer-nonmodal-overlay" />
        <GhostDrawerContent data-testid="drawer-nonmodal-content">
          <GhostDrawerTitle>Row details</GhostDrawerTitle>
          <GhostDrawerDescription>
            Leaves the page interactive without overlay or scroll lock.
          </GhostDrawerDescription>
          <GhostDrawerClose data-testid="drawer-nonmodal-close">
            Close row details
          </GhostDrawerClose>
        </GhostDrawerContent>
      </GhostDrawer>
      <button
        type="button"
        data-testid="drawer-outside-button"
        @click="outsideClicks += 1"
      >
        Outside drawer button ({{ outsideClicks }})
      </button>

      <!-- Drawer hosting a nested confirmation dialog. -->
      <GhostDrawer>
        <GhostDrawerTrigger data-testid="drawer-nested-trigger">
          Open drawer with dialog
        </GhostDrawerTrigger>
        <GhostDrawerOverlay />
        <GhostDrawerContent data-testid="drawer-nested-content">
          <GhostDrawerTitle>Table filters</GhostDrawerTitle>
          <GhostDialog>
            <GhostDialogTrigger data-testid="drawer-nested-dialog-trigger">
              Reset filters
            </GhostDialogTrigger>
            <GhostDialogOverlay />
            <GhostDialogContent data-testid="drawer-nested-dialog-content">
              <GhostDialogTitle>Reset all filters?</GhostDialogTitle>
              <GhostDialogClose data-testid="drawer-nested-dialog-close">
                Cancel reset
              </GhostDialogClose>
            </GhostDialogContent>
          </GhostDialog>
          <GhostDrawerClose>Close table filters</GhostDrawerClose>
        </GhostDrawerContent>
      </GhostDrawer>
    </div>
  </section>
</template>

<style scoped>
.drawer-section {
  display: grid;
  gap: 1rem;
  margin-block: 1.5rem;
}

.drawer-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
</style>
