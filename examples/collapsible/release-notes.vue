<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostBadge,
  GhostCard,
  GhostCollapsible,
  GhostCollapsibleContent,
  GhostCollapsibleTrigger,
} from '@ghostvue/themes'

const open = ref(true)

const checks = [
  { name: 'Unit & accessibility suite', duration: '18s', status: 'Passed' },
  { name: 'Bundle size budget', duration: '4s', status: 'Passed' },
  { name: 'Visual regression (Linux)', duration: '42s', status: 'Passed' },
] as const
</script>

<template>
  <div class="release-disclosure">
    <GhostCard>
      <template #header>
        <div class="release-disclosure__header">
          <div class="release-disclosure__title-group">
            <span class="release-disclosure__title">Release v2.14.0</span>
            <span class="release-disclosure__meta">
              3 verification checks completed
            </span>
          </div>
          <GhostBadge tone="accent" variant="soft" size="sm">
            Ready to promote
          </GhostBadge>
        </div>
      </template>

      <GhostCollapsible v-slot="{ open: isOpen }" v-model:open="open">
        <div class="release-disclosure__body">
          <GhostCollapsibleTrigger>
            {{ isOpen ? 'Hide verification log' : 'Show verification log' }}
          </GhostCollapsibleTrigger>
          <GhostCollapsibleContent>
            <ul class="release-disclosure__list">
              <li
                v-for="check in checks"
                :key="check.name"
                class="release-disclosure__item"
              >
                <span class="release-disclosure__check-name">
                  {{ check.name }}
                </span>
                <span class="release-disclosure__check-meta">
                  {{ check.duration }} · {{ check.status }}
                </span>
              </li>
            </ul>
          </GhostCollapsibleContent>
        </div>
      </GhostCollapsible>
    </GhostCard>
  </div>
</template>

<style scoped>
.release-disclosure {
  display: grid;
}

.release-disclosure__header {
  display: grid;
  gap: var(--ghost-space-gap-sm);
}

.release-disclosure__title-group {
  display: grid;
  gap: var(--ghost-space-gap-xs);
  min-inline-size: 0;
}

.release-disclosure__title {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-md);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-snug);
}

.release-disclosure__meta {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-normal);
}

.release-disclosure__body {
  display: grid;
  gap: var(--ghost-space-gap-sm);
}

.release-disclosure__list {
  display: grid;
  gap: var(--ghost-space-gap-xs);
  list-style: none;
  margin: 0;
  padding: 0;
}

.release-disclosure__item {
  display: grid;
  gap: var(--ghost-space-gap-xs);
}

.release-disclosure__check-name {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-sm);
  font-weight: var(--ghost-type-weight-medium);
  line-height: var(--ghost-type-line-normal);
}

.release-disclosure__check-meta {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-xs);
  line-height: var(--ghost-type-line-normal);
}

@container ghost-demo (min-width: 26rem) {
  .release-disclosure__header {
    align-items: center;
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .release-disclosure__item {
    align-items: baseline;
    grid-template-columns: minmax(0, 1fr) auto;
  }
}
</style>
