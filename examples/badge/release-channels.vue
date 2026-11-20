<script setup lang="ts">
import { GhostBadge, GhostCard } from '@ghostvue/themes'

const channels = [
  {
    name: 'v2.14.0-stable',
    notes: 'Promoted across all production edges',
    label: 'Recommended',
    variant: 'solid' as const,
    tone: 'accent' as const,
  },
  {
    name: 'v2.15.0-rc.2',
    notes: 'Canary validation in staging cluster',
    label: 'Preview',
    variant: 'soft' as const,
    tone: 'neutral' as const,
  },
  {
    name: 'v2.13.4-lts',
    notes: 'Security maintenance window ends Dec 31',
    label: 'Deprecated',
    variant: 'outline' as const,
    tone: 'danger' as const,
  },
] as const
</script>

<template>
  <div class="badge-showcase">
    <GhostCard>
      <template #header>
        <div class="badge-showcase__header">
          <span class="badge-showcase__title">Release channels</span>
          <GhostBadge variant="ghost" tone="neutral" size="sm">
            3 active
          </GhostBadge>
        </div>
      </template>

      <ul class="badge-showcase__list">
        <li
          v-for="channel in channels"
          :key="channel.name"
          class="badge-showcase__row"
        >
          <div class="badge-showcase__info">
            <span class="badge-showcase__name">{{ channel.name }}</span>
            <span class="badge-showcase__notes">{{ channel.notes }}</span>
          </div>
          <GhostBadge :variant="channel.variant" :tone="channel.tone" size="sm">
            {{ channel.label }}
          </GhostBadge>
        </li>
      </ul>
    </GhostCard>
  </div>
</template>

<style scoped>
.badge-showcase {
  display: grid;
}

.badge-showcase__header {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm);
  justify-content: space-between;
}

.badge-showcase__title {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-md);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-snug);
}

.badge-showcase__list {
  display: grid;
  gap: var(--ghost-space-gap-sm);
  list-style: none;
  margin: 0;
  padding: 0;
}

.badge-showcase__row {
  align-items: start;
  display: grid;
  gap: var(--ghost-space-gap-sm);
}

.badge-showcase__info {
  display: grid;
  gap: var(--ghost-space-gap-2xs);
  min-inline-size: 0;
}

.badge-showcase__name {
  color: var(--ghost-text-default);
  font-family: var(--ghost-type-family-mono);
  font-size: var(--ghost-type-size-sm);
  font-weight: var(--ghost-type-weight-medium);
  line-height: var(--ghost-type-line-snug);
}

.badge-showcase__notes {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-xs);
  line-height: var(--ghost-type-line-normal);
}

@container ghost-demo (min-width: 24rem) {
  .badge-showcase__row {
    align-items: center;
    grid-template-columns: minmax(0, 1fr) auto;
  }
}
</style>
