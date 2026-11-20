<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'

import {
  GhostButton,
  GhostCard,
  GhostField,
  GhostFieldControl,
  GhostFieldDescription,
  GhostFieldError,
  GhostFieldLabel,
  GhostSelect,
  GhostSelectContent,
  GhostSelectOption,
  GhostSelectTrigger,
  GhostSelectValue,
} from '@ghostvue/themes'

/*
 * Deterministic local data. Plans carry a short name for the trigger
 * (`textValue`) and a price line that only shows in the list.
 */
const plans = [
  { value: 'starter', name: 'Starter', price: 'Free for up to 3 seats' },
  { value: 'team', name: 'Team', price: '$12 per seat / month' },
  { value: 'business', name: 'Business', price: '$24 per seat / month' },
  // Enterprise needs a sales contract, so it is listed but not selectable.
  {
    value: 'enterprise',
    name: 'Enterprise',
    price: 'Contact sales',
    disabled: true,
  },
] as const

const cycles = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual (2 months free)' },
] as const

const currencies = [
  { value: 'usd', label: 'US dollar (USD)' },
  { value: 'eur', label: 'Euro (EUR)' },
  { value: 'gbp', label: 'British pound (GBP)' },
  { value: 'jpy', label: 'Japanese yen (JPY)' },
] as const

const deliveries = [
  { value: 'owner', label: 'Email the PDF invoice to the workspace owner' },
  {
    value: 'finance',
    label:
      'Email the PDF invoice to finance@analytical-engines.example and copy every workspace admin',
  },
  { value: 'portal', label: 'Publish to the billing portal only' },
] as const

const plan = ref<string | undefined>('team')
const cycle = ref<string | undefined>('annual')
// No currency yet: the trigger shows its placeholder on first render.
const currency = ref<string | undefined>(undefined)
const delivery = ref<string | undefined>('finance')
const taxRegion = 'gb'

const submitted = ref(false)
const saved = ref(false)

const currencyInvalid = computed(
  () => submitted.value && currency.value === undefined,
)

const summary = computed(() => {
  const planName = plans.find((option) => option.value === plan.value)?.name
  const billed = cycle.value === 'annual' ? 'annually' : 'monthly'
  const code = currency.value?.toUpperCase()
  return `${planName ?? 'No'} plan, billed ${billed}${code ? ` in ${code}` : ''}.`
})

async function save(event: SubmitEvent): Promise<void> {
  // Read before awaiting: currentTarget is cleared once dispatch ends.
  const form = event.currentTarget
  submitted.value = true
  saved.value = !currencyInvalid.value
  if (saved.value || !(form instanceof HTMLFormElement)) return
  // Wait for aria-invalid to render, then focus the first control to fix.
  await nextTick()
  form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
}

function markEdited(): void {
  saved.value = false
}
</script>

<template>
  <form class="billing" novalidate @submit.prevent="save">
    <GhostCard as="section" aria-labelledby="billing-title">
      <template #header>
        <div class="billing__header">
          <h2 id="billing-title" class="billing__title">Billing preferences</h2>
          <p class="billing__lead">
            Changes apply from the next invoice for Analytical Engines.
          </p>
        </div>
      </template>

      <div class="billing__fields">
        <GhostField>
          <GhostFieldLabel>Plan</GhostFieldLabel>
          <GhostFieldDescription>
            Enterprise needs a signed contract.
          </GhostFieldDescription>
          <GhostFieldControl v-slot="field">
            <GhostSelect
              v-model="plan"
              name="plan"
              placeholder="Choose a plan"
              @update:model-value="markEdited"
            >
              <GhostSelectTrigger v-bind="field">
                <GhostSelectValue />
                <svg
                  class="billing__chevron"
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                >
                  <path d="m4 6 4 4 4-4" />
                </svg>
              </GhostSelectTrigger>
              <GhostSelectContent :offset="6">
                <GhostSelectOption
                  v-for="option in plans"
                  :key="option.value"
                  :value="option.value"
                  :text-value="option.name"
                  :disabled="'disabled' in option && option.disabled"
                >
                  <span class="billing__option">
                    <span class="billing__option-name">{{ option.name }}</span>
                    <span class="billing__option-meta">{{ option.price }}</span>
                  </span>
                </GhostSelectOption>
              </GhostSelectContent>
            </GhostSelect>
          </GhostFieldControl>
        </GhostField>

        <div class="billing__row">
          <GhostField>
            <GhostFieldLabel>Billing cycle</GhostFieldLabel>
            <GhostFieldControl v-slot="field">
              <GhostSelect
                v-model="cycle"
                name="cycle"
                placeholder="Choose a cycle"
                @update:model-value="markEdited"
              >
                <GhostSelectTrigger v-bind="field">
                  <GhostSelectValue />
                  <svg
                    class="billing__chevron"
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                  >
                    <path d="m4 6 4 4 4-4" />
                  </svg>
                </GhostSelectTrigger>
                <GhostSelectContent :offset="6">
                  <GhostSelectOption
                    v-for="option in cycles"
                    :key="option.value"
                    :value="option.value"
                  >
                    <span class="billing__option">{{ option.label }}</span>
                  </GhostSelectOption>
                </GhostSelectContent>
              </GhostSelect>
            </GhostFieldControl>
          </GhostField>

          <GhostField required :invalid="currencyInvalid">
            <GhostFieldLabel required>Invoice currency</GhostFieldLabel>
            <GhostFieldControl v-slot="field">
              <GhostSelect
                v-model="currency"
                name="currency"
                placeholder="Choose a currency"
                @update:model-value="markEdited"
              >
                <GhostSelectTrigger v-bind="field">
                  <GhostSelectValue />
                  <svg
                    class="billing__chevron"
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                  >
                    <path d="m4 6 4 4 4-4" />
                  </svg>
                </GhostSelectTrigger>
                <GhostSelectContent :offset="6">
                  <GhostSelectOption
                    v-for="option in currencies"
                    :key="option.value"
                    :value="option.value"
                  >
                    <span class="billing__option">{{ option.label }}</span>
                  </GhostSelectOption>
                </GhostSelectContent>
              </GhostSelect>
            </GhostFieldControl>
            <GhostFieldError v-if="currencyInvalid">
              Choose an invoice currency.
            </GhostFieldError>
          </GhostField>
        </div>

        <GhostField>
          <GhostFieldLabel>Invoice delivery</GhostFieldLabel>
          <GhostFieldDescription>
            Long choices end with an ellipsis here and wrap in the list.
          </GhostFieldDescription>
          <GhostFieldControl v-slot="field">
            <GhostSelect
              v-model="delivery"
              name="delivery"
              placeholder="Choose a delivery method"
              @update:model-value="markEdited"
            >
              <GhostSelectTrigger v-bind="field">
                <GhostSelectValue />
                <svg
                  class="billing__chevron"
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                >
                  <path d="m4 6 4 4 4-4" />
                </svg>
              </GhostSelectTrigger>
              <GhostSelectContent :offset="6">
                <GhostSelectOption
                  v-for="option in deliveries"
                  :key="option.value"
                  :value="option.value"
                >
                  <span class="billing__option">{{ option.label }}</span>
                </GhostSelectOption>
              </GhostSelectContent>
            </GhostSelect>
          </GhostFieldControl>
        </GhostField>

        <GhostField disabled>
          <GhostFieldLabel>Tax region</GhostFieldLabel>
          <GhostFieldDescription>
            Managed by your organization's finance team.
          </GhostFieldDescription>
          <GhostFieldControl v-slot="field">
            <GhostSelect :model-value="taxRegion" name="tax-region" disabled>
              <GhostSelectTrigger v-bind="field">
                <GhostSelectValue />
                <svg
                  class="billing__chevron"
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                >
                  <path d="m4 6 4 4 4-4" />
                </svg>
              </GhostSelectTrigger>
              <GhostSelectContent :offset="6">
                <GhostSelectOption value="gb">
                  United Kingdom (VAT registered)
                </GhostSelectOption>
              </GhostSelectContent>
            </GhostSelect>
          </GhostFieldControl>
        </GhostField>
      </div>

      <template #footer>
        <div class="billing__actions">
          <p class="billing__status" role="status">
            {{ saved ? `Preferences saved. ${summary}` : '' }}
          </p>
          <GhostButton type="submit">Save preferences</GhostButton>
        </div>
      </template>
    </GhostCard>
  </form>
</template>

<style scoped>
/*
 * The form owns its width: 32rem keeps labels, hints, and triggers at a
 * readable measure and lets the card shrink with the preview on phones.
 */
.billing {
  max-inline-size: 32rem;
}

.billing__header {
  display: grid;
  gap: var(--ghost-space-gap-xs);
  padding-block-end: var(--ghost-space-stack-sm);
}

/* Native text picks up docs prose styles, so each element resets its own. */
.billing__title {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-lg);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-tight);
  margin: 0;
}

.billing__lead,
.billing__status {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-snug);
  margin: 0;
}

/*
 * A zero track minimum lets a long selected label truncate. Without it the
 * label's one-line width becomes the column's minimum and widens the card.
 */
.billing__fields {
  display: grid;
  gap: var(--ghost-space-stack-lg);
  grid-template-columns: minmax(0, 1fr);
}

/* Cycle and currency share a row when each keeps about 11rem; else stack. */
.billing__row {
  display: grid;
  gap: var(--ghost-space-stack-lg) var(--ghost-space-gap-md);
  grid-template-columns: repeat(auto-fit, minmax(min(11rem, 100%), 1fr));
}

.billing :deep([data-part='description']),
.billing :deep([data-part='error']) {
  overflow-wrap: anywhere;
}

/* Decorative; inherits the trigger color, including the disabled tone. */
.billing__chevron {
  block-size: 1em;
  fill: none;
  inline-size: 1em;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.5;
}

/*
 * Option text is authored here, so these scoped rules reach it inside the
 * body portal. 22rem keeps long delivery choices wrapping at a readable
 * measure instead of stretching the list to the viewport.
 */
.billing__option {
  display: grid;
  font-size: var(--ghost-type-size-sm);
  gap: var(--ghost-space-gap-xs);
  line-height: var(--ghost-type-line-snug);
  max-inline-size: 22rem;
}

.billing__option-meta {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-xs);
  font-weight: var(--ghost-type-weight-regular);
}

.billing__actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm) var(--ghost-space-gap-md);
  justify-content: flex-end;
}

.billing__status {
  flex: 1 1 auto;
}
</style>
