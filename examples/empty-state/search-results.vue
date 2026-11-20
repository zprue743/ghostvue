<script setup lang="ts">
import { computed, ref } from 'vue'

import {
  GhostButton,
  GhostCard,
  GhostEmptyState,
  GhostInput,
} from '@ghostvue/themes'

const query = ref('canary-eu')

const deployments = [
  'production-us-west',
  'production-eu-central',
  'staging-us-east',
] as const

const matches = computed(() => {
  const normalized = query.value.trim().toLowerCase()
  if (!normalized) return deployments
  return deployments.filter((item) => item.includes(normalized))
})

function clearSearch(): void {
  query.value = ''
}
</script>

<template>
  <div class="empty-showcase">
    <GhostCard>
      <template #header>
        <div class="empty-showcase__toolbar">
          <GhostInput
            v-model="query"
            aria-label="Filter deployments"
            placeholder="Filter deployments"
            size="sm"
            class="empty-showcase__input"
          />
          <GhostButton
            v-if="query"
            size="sm"
            variant="ghost"
            tone="neutral"
            @click="clearSearch"
          >
            Reset
          </GhostButton>
        </div>
      </template>

      <ul v-if="matches.length > 0" class="empty-showcase__list">
        <li v-for="item in matches" :key="item" class="empty-showcase__item">
          {{ item }}
        </li>
      </ul>

      <GhostEmptyState v-else as="section" :heading-level="3">
        <template #visual>
          <svg aria-hidden="true" viewBox="0 0 48 48" width="40" height="40">
            <circle
              cx="21"
              cy="21"
              r="13"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            />
            <path
              d="m31 31 9 9"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </template>
        <template #title>No matching deployments</template>
        <template #description>
          No environment matched "{{ query }}". Clear the filter to view all
          three environments.
        </template>
        <template #actions>
          <GhostButton size="sm" variant="outline" @click="clearSearch">
            Clear filter
          </GhostButton>
        </template>
      </GhostEmptyState>
    </GhostCard>
  </div>
</template>

<style scoped>
.empty-showcase {
  display: grid;
}

.empty-showcase__toolbar {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-xs);
}

.empty-showcase__input {
  flex: 1 1 12rem;
}

.empty-showcase__list {
  display: grid;
  gap: var(--ghost-space-gap-xs);
  list-style: none;
  margin: 0;
  padding: 0;
}

.empty-showcase__item {
  color: var(--ghost-text-default);
  font-family: var(--ghost-type-family-mono);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-normal);
}
</style>
