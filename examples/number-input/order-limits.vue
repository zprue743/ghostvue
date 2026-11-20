<script setup lang="ts">
import { computed, ref } from 'vue'

import {
  GhostButton,
  GhostCard,
  GhostField,
  GhostFieldControl,
  GhostFieldDescription,
  GhostFieldError,
  GhostFieldLabel,
  GhostNumberInput,
} from '@ghostvue/themes'

const seats = ref<number | null>(12)
const budget = ref<number | null>(450)
const burstLimit = ref<number | null>(200)
const saved = ref(false)

const seatsInvalid = computed(
  () => seats.value === null || seats.value < 1 || seats.value > 50,
)
const estimatedTotal = computed(() => {
  const count = seats.value ?? 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(count * 24)
})

function save(): void {
  if (seatsInvalid.value) return
  saved.value = true
}

function reset(): void {
  seats.value = 12
  budget.value = 450
  burstLimit.value = 200
  saved.value = false
}

function clearSaved(): void {
  saved.value = false
}
</script>

<template>
  <form
    class="limits-form"
    novalidate
    @submit.prevent="save"
    @input="clearSaved"
  >
    <GhostCard as="section" aria-labelledby="limits-title">
      <template #header>
        <div class="limits-form__header">
          <h2 id="limits-title" class="limits-form__title">
            Plan &amp; quota limits
          </h2>
          <p class="limits-form__lead">
            Adjust team seats and monthly spend caps. Estimated seat cost:
            <strong>{{ estimatedTotal }}</strong> / month.
          </p>
        </div>
      </template>

      <div class="limits-form__fields">
        <GhostField required :invalid="seatsInvalid">
          <GhostFieldLabel>Active seats</GhostFieldLabel>
          <GhostFieldDescription>
            Between 1 and 50 seats. Use Arrow keys, PageUp/PageDown, or stepper
            buttons.
          </GhostFieldDescription>
          <GhostFieldControl v-slot="field">
            <GhostNumberInput
              v-bind="field"
              v-model="seats"
              :min="1"
              :max="50"
              :step="1"
              name="seats"
              decrement-label="Decrease seats"
              increment-label="Increase seats"
              block
            />
          </GhostFieldControl>
          <GhostFieldError v-if="seatsInvalid">
            Enter a seat count between 1 and 50.
          </GhostFieldError>
        </GhostField>

        <GhostField>
          <GhostFieldLabel>Monthly spend cap</GhostFieldLabel>
          <GhostFieldDescription>
            Formatted as USD currency in $50 increments.
          </GhostFieldDescription>
          <GhostFieldControl v-slot="field">
            <GhostNumberInput
              v-bind="field"
              v-model="budget"
              :min="0"
              :step="50"
              locale="en-US"
              :format-options="{
                style: 'currency',
                currency: 'USD',
                maximumFractionDigits: 0,
              }"
              name="budget"
              decrement-label="Decrease spend cap"
              increment-label="Increase spend cap"
              block
            />
          </GhostFieldControl>
        </GhostField>

        <GhostField disabled>
          <GhostFieldLabel>Legacy burst quota</GhostFieldLabel>
          <GhostFieldDescription>
            Fixed at 200 requests/sec on your current contract.
          </GhostFieldDescription>
          <GhostFieldControl v-slot="field">
            <GhostNumberInput
              v-bind="field"
              v-model="burstLimit"
              size="sm"
              name="burst-limit"
              block
            />
          </GhostFieldControl>
        </GhostField>
      </div>

      <template #footer>
        <div class="limits-form__actions">
          <p class="limits-form__status" role="status">
            {{ saved ? 'Quota limits updated.' : '' }}
          </p>
          <GhostButton
            type="button"
            variant="ghost"
            tone="neutral"
            class="limits-form__action"
            @click="reset"
          >
            Reset
          </GhostButton>
          <GhostButton type="submit" class="limits-form__action">
            Save limits
          </GhostButton>
        </div>
      </template>
    </GhostCard>
  </form>
</template>

<style scoped>
.limits-form {
  max-inline-size: 32rem;
}

.limits-form__header {
  display: grid;
  gap: var(--ghost-space-gap-xs);
  padding-block-end: var(--ghost-space-stack-sm);
}

.limits-form__title {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-lg);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-tight);
  margin: 0;
}

.limits-form__lead,
.limits-form__status {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-snug);
  margin: 0;
  overflow-wrap: anywhere;
}

.limits-form__fields {
  display: grid;
  gap: var(--ghost-space-stack-lg);
}

.limits-form :deep([data-part='description']),
.limits-form :deep([data-part='error']) {
  overflow-wrap: anywhere;
}

.limits-form__actions {
  display: grid;
  gap: var(--ghost-space-gap-sm) var(--ghost-space-gap-md);
}

.limits-form :deep(.limits-form__action) {
  inline-size: 100%;
}

@container ghost-demo (min-width: 30rem) {
  .limits-form__actions {
    align-items: center;
    display: flex;
    justify-content: flex-end;
  }

  .limits-form__status {
    flex: 1 1 auto;
  }

  .limits-form :deep(.limits-form__action) {
    inline-size: auto;
  }
}
</style>
