<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostBadge,
  GhostButton,
  GhostCard,
  GhostSpinner,
} from '@ghostvue/themes'

const syncing = ref(true)

function toggleSync(): void {
  syncing.value = !syncing.value
}
</script>

<template>
  <div class="spinner-showcase">
    <GhostCard>
      <div class="spinner-showcase__row">
        <div class="spinner-showcase__status">
          <GhostSpinner
            v-if="syncing"
            size="sm"
            label="Syncing registry manifests"
          />
          <GhostBadge v-else tone="accent" variant="soft" size="sm">
            Up to date
          </GhostBadge>
          <div class="spinner-showcase__copy">
            <span class="spinner-showcase__title">
              {{
                syncing
                  ? 'Syncing registry manifests…'
                  : 'Registry manifests synced'
              }}
            </span>
            <span class="spinner-showcase__meta">
              {{
                syncing
                  ? 'Checking 48 component contracts against dist exports'
                  : 'Last verified at 10:42 · 0 drift detected'
              }}
            </span>
          </div>
        </div>

        <GhostButton
          size="sm"
          variant="outline"
          tone="neutral"
          @click="toggleSync"
        >
          {{ syncing ? 'Mark complete' : 'Re-run sync' }}
        </GhostButton>
      </div>
    </GhostCard>
  </div>
</template>

<style scoped>
.spinner-showcase {
  display: grid;
}

.spinner-showcase__row {
  align-items: start;
  display: grid;
  gap: var(--ghost-space-gap-sm);
}

.spinner-showcase__status {
  align-items: center;
  display: flex;
  gap: var(--ghost-space-gap-sm);
  min-inline-size: 0;
}

.spinner-showcase__copy {
  display: grid;
  gap: var(--ghost-space-gap-2xs);
  min-inline-size: 0;
}

.spinner-showcase__title {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-sm);
  font-weight: var(--ghost-type-weight-medium);
  line-height: var(--ghost-type-line-snug);
}

.spinner-showcase__meta {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-xs);
  line-height: var(--ghost-type-line-normal);
}

@container ghost-demo (min-width: 28rem) {
  .spinner-showcase__row {
    align-items: center;
    grid-template-columns: minmax(0, 1fr) auto;
  }
}
</style>
