<script setup lang="ts">
import { computed, ref } from 'vue'

import {
  GhostButton,
  GhostCard,
  GhostRadioGroup,
  GhostRadioGroupItem,
} from '@ghostvue/themes'

interface Tier {
  value: string
  label: string
  price: string
  description: string
  disabled?: boolean
}

const tiers: readonly Tier[] = [
  {
    value: 'starter',
    label: 'Starter',
    price: '$0 / mo',
    description: 'Shared compute, 100 GB bandwidth, community support.',
  },
  {
    value: 'pro',
    label: 'Pro',
    price: '$29 / mo',
    description:
      'Dedicated workers, automatic rollbacks, and 99.95% uptime SLA.',
  },
  {
    value: 'enterprise',
    label: 'Enterprise',
    price: 'Custom',
    description:
      'Single-tenant VPC peering. Contact sales to unlock for this workspace.',
    disabled: true,
  },
]

const selectedTier = ref('pro')
const cadence = ref('annual')
const saved = ref(false)

const summaryText = computed(() => {
  const tier = tiers.find((entry) => entry.value === selectedTier.value)
  return `${tier?.label ?? 'Pro'} (${cadence.value})`
})

function save(): void {
  saved.value = true
}

function clearSaved(): void {
  saved.value = false
}
</script>

<template>
  <form class="tier-form" @submit.prevent="save" @change="clearSaved">
    <GhostCard as="section" aria-labelledby="tier-title">
      <template #header>
        <div class="tier-form__header">
          <h2 id="tier-title" class="tier-form__title">Deployment tier</h2>
          <p class="tier-form__lead">
            Choose compute capacity and billing cadence for this project.
          </p>
        </div>
      </template>

      <div class="tier-form__groups">
        <fieldset class="tier-form__fieldset">
          <legend class="tier-form__legend">Compute plan</legend>
          <GhostRadioGroup
            v-model="selectedTier"
            name="tier"
            orientation="vertical"
          >
            <div v-for="tier in tiers" :key="tier.value" class="tier-option">
              <GhostRadioGroupItem
                :id="`tier-${tier.value}`"
                :value="tier.value"
                :disabled="Boolean(tier.disabled)"
                :aria-describedby="`tier-${tier.value}-desc`"
              />
              <label :for="`tier-${tier.value}`" class="tier-option__label">
                <span>{{ tier.label }}</span>
                <span class="tier-option__price">{{ tier.price }}</span>
              </label>
              <p :id="`tier-${tier.value}-desc`" class="tier-option__desc">
                {{ tier.description }}
              </p>
            </div>
          </GhostRadioGroup>
        </fieldset>

        <fieldset class="tier-form__fieldset">
          <legend class="tier-form__legend">Billing cadence</legend>
          <GhostRadioGroup
            v-model="cadence"
            name="cadence"
            orientation="horizontal"
            size="sm"
          >
            <label class="cadence-option">
              <GhostRadioGroupItem value="monthly" />
              <span>Monthly</span>
            </label>
            <label class="cadence-option">
              <GhostRadioGroupItem value="annual" />
              <span>Annual (save 20%)</span>
            </label>
          </GhostRadioGroup>
        </fieldset>
      </div>

      <template #footer>
        <div class="tier-form__actions">
          <p class="tier-form__status" role="status">
            {{ saved ? `Saved ${summaryText}.` : `Selected: ${summaryText}` }}
          </p>
          <GhostButton type="submit" class="tier-form__action">
            Update plan
          </GhostButton>
        </div>
      </template>
    </GhostCard>
  </form>
</template>

<style scoped>
.tier-form {
  max-inline-size: 36rem;
}

.tier-form__header {
  display: grid;
  gap: var(--ghost-space-gap-xs);
  padding-block-end: var(--ghost-space-stack-sm);
}

.tier-form__title {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-lg);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-tight);
  margin: 0;
}

.tier-form__lead,
.tier-form__status {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-snug);
  margin: 0;
  overflow-wrap: anywhere;
}

.tier-form__groups {
  display: grid;
  gap: var(--ghost-space-stack-lg);
}

.tier-form__fieldset {
  border: none;
  display: grid;
  gap: var(--ghost-space-stack-sm);
  margin: 0;
  min-inline-size: 0;
  padding: 0;
}

.tier-form__legend {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-sm);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-snug);
  padding: 0;
}

.tier-option {
  column-gap: var(--ghost-space-gap-sm);
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  row-gap: var(--ghost-space-gap-xs);
}

.tier-option :deep(.ghost-radio-group-item) {
  grid-row: 1 / span 2;
}

.tier-option__label {
  align-items: baseline;
  color: var(--ghost-text-default);
  cursor: pointer;
  display: flex;
  flex-wrap: wrap;
  font-size: var(--ghost-type-size-sm);
  font-weight: var(--ghost-type-weight-medium);
  gap: var(--ghost-space-gap-sm);
  grid-column: 2;
  justify-content: space-between;
  line-height: var(--ghost-type-line-snug);
  padding-block-start: calc((var(--ghost-control-size-md-min) - 1lh) / 2);
}

.tier-option__price {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-xs);
  font-weight: var(--ghost-type-weight-regular);
}

.tier-option__desc {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  grid-column: 2;
  line-height: var(--ghost-type-line-snug);
  margin: 0;
  overflow-wrap: anywhere;
}

.cadence-option {
  align-items: center;
  color: var(--ghost-text-default);
  cursor: pointer;
  display: inline-flex;
  font-size: var(--ghost-type-size-sm);
  gap: var(--ghost-space-gap-xs);
  line-height: var(--ghost-type-line-snug);
}

.tier-form__actions {
  display: grid;
  gap: var(--ghost-space-gap-sm) var(--ghost-space-gap-md);
}

.tier-form :deep(.tier-form__action) {
  inline-size: 100%;
}

@container ghost-demo (min-width: 30rem) {
  .tier-form__actions {
    align-items: center;
    display: flex;
    justify-content: flex-end;
  }

  .tier-form__status {
    flex: 1 1 auto;
  }

  .tier-form :deep(.tier-form__action) {
    inline-size: auto;
  }
}
</style>
