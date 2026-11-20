<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostCard,
  GhostKbd,
  GhostSegmentedControl,
  GhostSegmentedControlItem,
  type GhostKbdPlatform,
} from '@ghostvue/themes'

const platform = ref<GhostKbdPlatform>('apple')

const shortcuts = [
  { label: 'Command palette', keys: ['mod', 'k'] },
  { label: 'Save draft', keys: ['mod', 's'] },
  { label: 'Toggle sidebar', keys: ['mod', 'shift', 'b'] },
  { label: 'Close dialog', keys: ['esc'] },
] as const
</script>

<template>
  <div class="kbd-showcase">
    <GhostCard>
      <template #header>
        <div class="kbd-showcase__header">
          <span class="kbd-showcase__title">Keyboard shortcuts</span>
          <GhostSegmentedControl
            v-model="platform"
            aria-label="Keycap platform"
            size="sm"
          >
            <GhostSegmentedControlItem value="apple">
              Apple
            </GhostSegmentedControlItem>
            <GhostSegmentedControlItem value="pc">
              PC
            </GhostSegmentedControlItem>
          </GhostSegmentedControl>
        </div>
      </template>

      <ul class="kbd-showcase__list">
        <li
          v-for="item in shortcuts"
          :key="item.label"
          class="kbd-showcase__row"
        >
          <span class="kbd-showcase__label">{{ item.label }}</span>
          <GhostKbd :keys="item.keys" :platform="platform" size="sm" />
        </li>
      </ul>
    </GhostCard>
  </div>
</template>

<style scoped>
.kbd-showcase {
  display: grid;
}

.kbd-showcase__header {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm);
  justify-content: space-between;
}

.kbd-showcase__title {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-md);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-snug);
}

.kbd-showcase__list {
  display: grid;
  gap: var(--ghost-space-gap-sm);
  list-style: none;
  margin: 0;
  padding: 0;
}

.kbd-showcase__row {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm);
  justify-content: space-between;
}

.kbd-showcase__label {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-normal);
}
</style>
