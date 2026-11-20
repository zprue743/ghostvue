<script setup lang="ts">
import { computed, ref } from 'vue'

import {
  GhostCard,
  GhostSegmentedControl,
  GhostSegmentedControlItem,
} from '@ghostvue/themes'

type Period = '24h' | '7d' | '30d'
type Metric = 'requests' | 'latency' | 'errors'

const period = ref<Period>('7d')
const metric = ref<Metric>('requests')

const dataset: Record<
  Period,
  Record<Metric, { primary: string; delta: string; note: string }>
> = {
  '24h': {
    requests: {
      primary: '142.8k',
      delta: '+4.2% vs prior 24h',
      note: 'Peak 9,400 req/min at 14:20 UTC.',
    },
    latency: {
      primary: '38 ms',
      delta: '-3 ms vs prior 24h',
      note: 'p95 edge response time.',
    },
    errors: {
      primary: '0.04%',
      delta: '-0.01% vs prior 24h',
      note: '57 failed requests across 4 regions.',
    },
  },
  '7d': {
    requests: {
      primary: '984.2k',
      delta: '+11.6% vs prior 7d',
      note: 'Steady weekday traffic across EU and US.',
    },
    latency: {
      primary: '41 ms',
      delta: '-2 ms vs prior 7d',
      note: 'p95 edge response time.',
    },
    errors: {
      primary: '0.06%',
      delta: 'No change vs prior 7d',
      note: '590 failed requests across 4 regions.',
    },
  },
  '30d': {
    requests: {
      primary: '4.12M',
      delta: '+18.4% vs prior 30d',
      note: 'Includes Nov 12 webhook backfill.',
    },
    latency: {
      primary: '44 ms',
      delta: '+1 ms vs prior 30d',
      note: 'p95 edge response time.',
    },
    errors: {
      primary: '0.08%',
      delta: '-0.03% vs prior 30d',
      note: '3,296 failed requests across 4 regions.',
    },
  },
}

const current = computed(() => dataset[period.value][metric.value])
</script>

<template>
  <section class="analytics" aria-labelledby="analytics-title">
    <GhostCard>
      <template #header>
        <div class="analytics__header">
          <div>
            <h2 id="analytics-title" class="analytics__title">API traffic</h2>
            <p class="analytics__lead">
              Switch time windows or metric series with arrow keys.
            </p>
          </div>
          <GhostSegmentedControl
            v-model="period"
            aria-label="Time window"
            class="analytics__period"
          >
            <GhostSegmentedControlItem value="24h">
              24h
            </GhostSegmentedControlItem>
            <GhostSegmentedControlItem value="7d">7d</GhostSegmentedControlItem>
            <GhostSegmentedControlItem value="30d">
              30d
            </GhostSegmentedControlItem>
          </GhostSegmentedControl>
        </div>
      </template>

      <div class="analytics__body">
        <GhostSegmentedControl v-model="metric" aria-label="Metric">
          <GhostSegmentedControlItem value="requests">
            Requests
          </GhostSegmentedControlItem>
          <GhostSegmentedControlItem value="latency">
            Latency
          </GhostSegmentedControlItem>
          <GhostSegmentedControlItem value="errors">
            Errors
          </GhostSegmentedControlItem>
        </GhostSegmentedControl>

        <div class="analytics__stat" role="status">
          <p class="analytics__value">{{ current.primary }}</p>
          <p class="analytics__delta">{{ current.delta }}</p>
          <p class="analytics__note">{{ current.note }}</p>
        </div>
      </div>
    </GhostCard>
  </section>
</template>

<style scoped>
.analytics {
  max-inline-size: 36rem;
}

.analytics__header {
  display: grid;
  gap: var(--ghost-space-gap-md);
  padding-block-end: var(--ghost-space-stack-sm);
}

.analytics__title {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-lg);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-tight);
  margin: 0;
}

.analytics__lead,
.analytics__note {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-snug);
  margin: 0;
  overflow-wrap: anywhere;
}

.analytics__body {
  display: grid;
  gap: var(--ghost-space-stack-md);
}

.analytics__stat {
  display: grid;
  gap: var(--ghost-space-gap-xs);
}

.analytics__value {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-2xl);
  font-variant-numeric: tabular-nums;
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-tight);
  margin: 0;
}

.analytics__delta {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-sm);
  font-weight: var(--ghost-type-weight-medium);
  line-height: var(--ghost-type-line-snug);
  margin: 0;
}

@container ghost-demo (min-width: 30rem) {
  .analytics__header {
    align-items: start;
    grid-template-columns: minmax(0, 1fr) auto;
  }
}
</style>
