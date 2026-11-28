<script setup lang="ts">
import { nextTick, ref } from 'vue'

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

// Deterministic local data: option values are what the form submits.
const severities = [
  { value: 'critical', label: 'Critical only' },
  { value: 'high', label: 'High and above' },
  { value: 'all', label: 'Every alert' },
] as const

const channels = [
  { value: 'pager', label: 'Page the on-call phone' },
  { value: 'slack', label: 'Post to #incidents' },
  { value: 'email', label: 'Email the team list' },
] as const

const owners = [
  { value: 'platform', label: 'Platform on-call' },
  { value: 'payments', label: 'Payments on-call' },
  { value: 'support', label: 'Support leads' },
] as const

const labels: Record<string, string> = Object.fromEntries(
  [...severities, ...channels, ...owners].map((option) => [
    option.value,
    option.label,
  ]),
)

interface SubmittedEntry {
  name: string
  value: string
}

const ownerMissing = ref(false)
const submitted = ref<SubmittedEntry[]>([])
const status = ref('')

/*
 * `novalidate` turns off the browser's bubbles, but `checkValidity()` still
 * runs native constraint validation. The required Select's hidden input
 * fails it, fires `invalid`, and the trigger gets `aria-invalid` on its own;
 * the field error and focus move are this form's choices.
 */
async function save(event: SubmitEvent): Promise<void> {
  // Read before awaiting: currentTarget is cleared once dispatch ends.
  const form = event.currentTarget
  if (!(form instanceof HTMLFormElement)) return
  if (!form.checkValidity()) {
    ownerMissing.value = true
    submitted.value = []
    status.value = ''
    // Wait for aria-invalid to render, then focus the control to fix.
    await nextTick()
    form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    return
  }
  // Exactly what a native submit would send: one entry per named Select.
  submitted.value = [...new FormData(form)].map(([name, value]) => ({
    name,
    value: typeof value === 'string' ? value : value.name,
  }))
  status.value = 'Alert routing saved.'
}

// Native reset restores each Select's `default-value`; clear our own state.
function onReset(): void {
  ownerMissing.value = false
  submitted.value = []
  status.value = 'Form reset to the saved defaults.'
}

function onOwnerChange(): void {
  ownerMissing.value = false
}
</script>

<template>
  <form class="routing" novalidate @submit.prevent="save" @reset="onReset">
    <GhostCard as="section" aria-labelledby="routing-title">
      <template #header>
        <div class="routing__header">
          <h2 id="routing-title" class="routing__title">Alert routing</h2>
          <p class="routing__lead">
            Decide who hears about checkout-service incidents.
          </p>
        </div>
      </template>

      <div class="routing__fields">
        <GhostField>
          <GhostFieldLabel>Minimum severity</GhostFieldLabel>
          <GhostFieldControl v-slot="field">
            <GhostSelect name="severity" default-value="high">
              <GhostSelectTrigger v-bind="field">
                <GhostSelectValue />
                <svg
                  class="routing__chevron"
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                >
                  <path d="m4 6 4 4 4-4" />
                </svg>
              </GhostSelectTrigger>
              <GhostSelectContent :offset="6">
                <GhostSelectOption
                  v-for="option in severities"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </GhostSelectOption>
              </GhostSelectContent>
            </GhostSelect>
          </GhostFieldControl>
        </GhostField>

        <GhostField>
          <GhostFieldLabel>Notify by</GhostFieldLabel>
          <GhostFieldControl v-slot="field">
            <GhostSelect name="channel" default-value="slack">
              <GhostSelectTrigger v-bind="field">
                <GhostSelectValue />
                <svg
                  class="routing__chevron"
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                >
                  <path d="m4 6 4 4 4-4" />
                </svg>
              </GhostSelectTrigger>
              <GhostSelectContent :offset="6">
                <GhostSelectOption
                  v-for="option in channels"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </GhostSelectOption>
              </GhostSelectContent>
            </GhostSelect>
          </GhostFieldControl>
        </GhostField>

        <GhostField required :invalid="ownerMissing">
          <GhostFieldLabel required>Escalation owner</GhostFieldLabel>
          <GhostFieldDescription>
            Paged when an alert is not acknowledged in 15 minutes.
          </GhostFieldDescription>
          <GhostFieldControl v-slot="field">
            <!-- `required` on the root enables native form validation. -->
            <GhostSelect
              name="escalation"
              required
              placeholder="Choose an owner"
              @update:model-value="onOwnerChange"
            >
              <GhostSelectTrigger v-bind="field">
                <GhostSelectValue />
                <svg
                  class="routing__chevron"
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                >
                  <path d="m4 6 4 4 4-4" />
                </svg>
              </GhostSelectTrigger>
              <GhostSelectContent :offset="6">
                <GhostSelectOption
                  v-for="option in owners"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </GhostSelectOption>
              </GhostSelectContent>
            </GhostSelect>
          </GhostFieldControl>
          <GhostFieldError v-if="ownerMissing">
            Choose who gets escalations.
          </GhostFieldError>
        </GhostField>
      </div>

      <template #footer>
        <div class="routing__footer">
          <p class="routing__status" role="status">{{ status }}</p>
          <div class="routing__actions">
            <GhostButton type="reset" variant="ghost" tone="neutral">
              Reset
            </GhostButton>
            <GhostButton type="submit">Save routing</GhostButton>
          </div>
        </div>
        <section
          v-if="submitted.length > 0"
          class="routing__submitted"
          aria-labelledby="routing-submitted-title"
        >
          <h3 id="routing-submitted-title" class="routing__submitted-title">
            Submitted form data
          </h3>
          <dl class="routing__entries">
            <div
              v-for="entry in submitted"
              :key="entry.name"
              class="routing__entry"
            >
              <dt>
                <code>{{ entry.name }}</code>
              </dt>
              <dd>
                <code>{{ entry.value }}</code>
                <span class="routing__entry-label">
                  {{ labels[entry.value] }}
                </span>
              </dd>
            </div>
          </dl>
        </section>
      </template>
    </GhostCard>
  </form>
</template>

<style scoped>
/* The form keeps a readable measure and shrinks with the preview on phones. */
.routing {
  max-inline-size: 32rem;
}

.routing__header {
  display: grid;
  gap: var(--ghost-space-gap-xs);
  padding-block-end: var(--ghost-space-stack-sm);
}

/* Native text picks up docs prose styles, so each element resets its own. */
.routing__title,
.routing__submitted-title {
  border: 0;
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-lg);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-tight);
  margin: 0;
  padding: 0;
}

.routing__submitted-title {
  font-size: var(--ghost-type-size-sm);
}

.routing__lead,
.routing__status {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-snug);
  margin: 0;
}

/* A zero track minimum lets a long selected label truncate in its trigger. */
.routing__fields {
  display: grid;
  gap: var(--ghost-space-stack-lg);
  grid-template-columns: minmax(0, 1fr);
}

/* Decorative; inherits the trigger color, including the invalid state. */
.routing__chevron {
  block-size: 1em;
  fill: none;
  inline-size: 1em;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.5;
}

.routing__footer {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm) var(--ghost-space-gap-md);
  justify-content: flex-end;
}

.routing__status {
  flex: 1 1 10rem;
}

.routing__actions {
  display: flex;
  gap: var(--ghost-space-gap-sm);
}

.routing__submitted {
  border-block-start: var(--ghost-border-hairline-width) solid
    var(--ghost-border-default);
  display: grid;
  gap: var(--ghost-space-gap-sm);
  margin-block-start: var(--ghost-space-stack-md);
  padding-block-start: var(--ghost-space-stack-md);
}

.routing__entries {
  display: grid;
  gap: var(--ghost-space-gap-xs);
  margin: 0;
}

.routing__entry {
  column-gap: var(--ghost-space-gap-md);
  display: grid;
  font-size: var(--ghost-type-size-sm);
  grid-template-columns: minmax(0, 7rem) minmax(0, 1fr);
  line-height: var(--ghost-type-line-snug);
}

.routing__entry dt,
.routing__entry dd {
  margin: 0;
  min-inline-size: 0;
  overflow-wrap: anywhere;
}

.routing__entry code {
  background: none;
  color: var(--ghost-text-default);
  /* Reset docs inline-code styles; the token set has no mono family. */
  border-radius: 0;
  font: inherit;
  font-weight: var(--ghost-type-weight-medium);
  padding: 0;
}

.routing__entry-label {
  color: var(--ghost-text-muted);
  margin-inline-start: var(--ghost-space-gap-sm);
}
</style>
