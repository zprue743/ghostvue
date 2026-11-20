<script setup lang="ts">
import { GhostBadge, GhostInteractiveSurface } from '@ghostvue/themes'

const capabilities = [
  {
    title: 'Pointer tracking',
    tag: 'Ambient',
    description:
      'Updates --ghost-pointer-x and --ghost-pointer-y smoothly on pointer move.',
  },
  {
    title: 'Reduced motion',
    tag: 'Accessible',
    description:
      'Disables spotlight tracking automatically when prefers-reduced-motion is active.',
  },
] as const
</script>

<template>
  <div class="surface-showcase">
    <GhostInteractiveSurface
      v-for="item in capabilities"
      :key="item.title"
      class="surface-showcase__tile"
    >
      <div class="surface-showcase__header">
        <span class="surface-showcase__title">{{ item.title }}</span>
        <GhostBadge tone="neutral" variant="soft" size="sm">
          {{ item.tag }}
        </GhostBadge>
      </div>
      <span class="surface-showcase__copy">{{ item.description }}</span>
    </GhostInteractiveSurface>
  </div>
</template>

<style scoped>
.surface-showcase {
  display: grid;
  gap: var(--ghost-space-stack-md);
}

.surface-showcase__tile {
  display: grid;
  gap: var(--ghost-space-gap-xs);
  min-block-size: 7rem;
  padding: var(--ghost-space-inset-md);
}

.surface-showcase__header {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm);
  justify-content: space-between;
}

.surface-showcase__title {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-md);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-snug);
}

.surface-showcase__copy {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-normal);
}

@container ghost-demo (min-width: 30rem) {
  .surface-showcase {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
