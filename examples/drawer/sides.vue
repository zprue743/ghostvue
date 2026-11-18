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
  type GhostDrawerSide,
} from '@ghostvue/themes'

const sides: readonly GhostDrawerSide[] = ['start', 'end', 'top', 'bottom']
</script>

<template>
  <div class="drawer-sides">
    <GhostDrawer v-for="side in sides" :key="side" :side="side">
      <GhostDrawerTrigger :as="GhostButton" variant="outline">
        Open {{ side }}
      </GhostDrawerTrigger>
      <GhostDrawerOverlay />
      <GhostDrawerContent>
        <GhostDrawerTitle>Side: {{ side }}</GhostDrawerTitle>
        <GhostDrawerDescription>
          Logical start and end follow the writing direction; top and bottom
          open as full-width sheets.
        </GhostDrawerDescription>
        <GhostDrawerClose :as="GhostButton" size="sm">Close</GhostDrawerClose>
      </GhostDrawerContent>
    </GhostDrawer>

    <!-- The portaled drawer resolves RTL from this subtree, so start opens
         from the right edge. -->
    <div dir="rtl" lang="ar" class="drawer-sides__rtl">
      <GhostDrawer side="start">
        <GhostDrawerTrigger :as="GhostButton" variant="soft">
          البداية (RTL)
        </GhostDrawerTrigger>
        <GhostDrawerOverlay />
        <GhostDrawerContent>
          <GhostDrawerTitle>درج البداية</GhostDrawerTitle>
          <GhostDrawerDescription>
            يفتح من الحافة اليمنى في الاتجاه من اليمين إلى اليسار.
          </GhostDrawerDescription>
          <GhostDrawerClose :as="GhostButton" size="sm">إغلاق</GhostDrawerClose>
        </GhostDrawerContent>
      </GhostDrawer>
    </div>
  </div>
</template>

<style scoped>
.drawer-sides,
.drawer-sides__rtl {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm);
}
</style>
