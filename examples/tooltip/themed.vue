<script setup lang="ts">
import { ref } from 'vue'

import { GhostTooltipProvider } from '@ghostvue/vue'
import {
  GhostBadge,
  GhostButton,
  GhostCard,
  GhostTooltip,
  GhostTooltipContent,
  GhostTooltipTrigger,
} from '@ghostvue/themes'

const statusMessage = ref('Hover or focus a control for details.')

function triggerAction(message: string): void {
  statusMessage.value = message
}
</script>

<template>
  <GhostCard class="deploy-metrics">
    <template #header>
      <div class="deploy-metrics__header">
        <div class="deploy-metrics__title-group">
          <span class="deploy-metrics__title">Production edge</span>
          <GhostBadge tone="accent" variant="soft">Healthy</GhostBadge>
        </div>

        <GhostTooltipProvider :delay-duration="300" :skip-delay-duration="250">
          <div class="deploy-metrics__actions">
            <GhostTooltip>
              <GhostTooltipTrigger
                :as="GhostButton"
                variant="outline"
                tone="neutral"
                size="sm"
                @click="triggerAction('Copied commit SHA 8c41f2a.')"
              >
                Copy SHA
              </GhostTooltipTrigger>
              <GhostTooltipContent placement="top" :offset="8">
                Copy deployment commit 8c41f2a
              </GhostTooltipContent>
            </GhostTooltip>

            <GhostTooltip>
              <GhostTooltipTrigger
                :as="GhostButton"
                variant="outline"
                tone="neutral"
                size="sm"
                @click="triggerAction('Triggered incremental rebuild.')"
              >
                Rebuild
              </GhostTooltipTrigger>
              <GhostTooltipContent placement="top" :offset="8">
                Re-run build with cached dependencies
              </GhostTooltipContent>
            </GhostTooltip>
          </div>
        </GhostTooltipProvider>
      </div>
    </template>

    <div class="deploy-metrics__row">
      <div class="deploy-metrics__metric">
        <span class="deploy-metrics__label">Latency p95</span>
        <GhostTooltip>
          <GhostTooltipTrigger
            :as="GhostButton"
            variant="ghost"
            tone="neutral"
            size="sm"
            aria-label="Explain Latency p95"
          >
            ?
          </GhostTooltipTrigger>
          <GhostTooltipContent placement="bottom" :offset="8">
            95th percentile response time over the last 24 hours.
          </GhostTooltipContent>
        </GhostTooltip>
      </div>
      <span class="deploy-metrics__value">42 ms</span>
    </div>

    <template #footer>
      <div class="deploy-metrics__status" role="status" aria-live="polite">
        {{ statusMessage }}
      </div>
    </template>
  </GhostCard>
</template>

<style scoped>
.deploy-metrics {
  inline-size: 100%;
  max-inline-size: 32rem;
}

.deploy-metrics__header {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm);
  justify-content: space-between;
}

.deploy-metrics__title-group {
  align-items: center;
  display: inline-flex;
  gap: var(--ghost-space-gap-xs);
}

.deploy-metrics__title {
  color: var(--ghost-surface-fg);
  font-size: var(--ghost-type-size-md);
  font-weight: var(--ghost-type-weight-semibold);
}

.deploy-metrics__actions {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-xs);
}

.deploy-metrics__row {
  align-items: center;
  display: flex;
  gap: var(--ghost-space-gap-sm);
  justify-content: space-between;
}

.deploy-metrics__metric {
  align-items: center;
  display: inline-flex;
  gap: var(--ghost-space-gap-xs);
}

.deploy-metrics__label {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
}

.deploy-metrics__value {
  color: var(--ghost-surface-fg);
  font-size: var(--ghost-type-size-md);
  font-variant-numeric: tabular-nums;
  font-weight: var(--ghost-type-weight-semibold);
}

.deploy-metrics__status {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-xs);
}
</style>
