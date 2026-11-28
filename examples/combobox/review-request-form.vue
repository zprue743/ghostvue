<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'

import {
  GhostBadge,
  GhostButton,
  GhostCard,
  GhostCombobox,
  GhostComboboxContent,
  GhostComboboxEmpty,
  GhostComboboxInput,
  GhostComboboxOption,
  GhostField,
  GhostFieldControl,
  GhostFieldDescription,
  GhostFieldError,
  GhostFieldLabel,
} from '@ghostvue/themes'

interface Choice {
  value: string
  label: string
}

// Deterministic local data: option values are what the form submits.
const reviewers: readonly Choice[] = [
  { value: 'maya-chen', label: 'Maya Chen' },
  { value: 'marcus-reed', label: 'Marcus Reed' },
  { value: 'priya-natarajan', label: 'Priya Natarajan' },
  { value: 'jonas-weber', label: 'Jonas Weber' },
  { value: 'amara-okafor', label: 'Amara Okafor' },
]

const labelChoices: readonly Choice[] = [
  { value: 'bug', label: 'Bug' },
  { value: 'docs', label: 'Documentation' },
  { value: 'performance', label: 'Performance' },
  { value: 'accessibility', label: 'Accessibility' },
  { value: 'security', label: 'Security' },
]

// Reset seed for the multi-value field; native reset restores it.
const defaultLabels: string[] = ['bug']

const reviewer = ref<string | undefined>(undefined)
const reviewerQuery = ref('')
const labels = ref<string[]>([...defaultLabels])
const labelQuery = ref('')
const reviewerMissing = ref(false)

function labelFor(choices: readonly Choice[], value: string): string {
  return choices.find((choice) => choice.value === value)?.label ?? value
}

/*
 * Filtering is consumer-owned. In single mode the input shows the chosen
 * label after a selection, so that text lists every reviewer again instead
 * of filtering down to one.
 */
function matching(choices: readonly Choice[], query: string, shown = '') {
  const needle = query.trim().toLowerCase()
  if (needle === '' || query === shown) return choices
  return choices.filter((choice) => choice.label.toLowerCase().includes(needle))
}

const reviewerOptions = computed(() =>
  matching(
    reviewers,
    reviewerQuery.value,
    reviewer.value ? labelFor(reviewers, reviewer.value) : '',
  ),
)
const labelOptions = computed(() => matching(labelChoices, labelQuery.value))

// The combobox root accepts string | string[] | undefined for both modes.
function onReviewer(value: string | string[] | undefined): void {
  reviewer.value = typeof value === 'string' ? value : undefined
  reviewerMissing.value = false
}

function onLabels(value: string | string[] | undefined): void {
  labels.value = Array.isArray(value) ? value : []
}

interface SubmittedEntry {
  name: string
  values: string[]
}

const submitted = ref<SubmittedEntry[]>([])
const status = ref('')

/*
 * `novalidate` turns off the browser's bubbles, but `checkValidity()` still
 * runs native constraint validation: the required combobox's hidden input
 * fails, fires `invalid`, and the input gets `aria-invalid` on its own.
 */
async function send(event: SubmitEvent): Promise<void> {
  // Read before awaiting: currentTarget is cleared once dispatch ends.
  const form = event.currentTarget
  if (!(form instanceof HTMLFormElement)) return
  if (!form.checkValidity()) {
    reviewerMissing.value = true
    submitted.value = []
    status.value = ''
    await nextTick()
    form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    return
  }
  // A multiple combobox submits one entry per selected value.
  const data = new FormData(form)
  submitted.value = ['reviewer', 'labels'].map((name) => ({
    name,
    values: data
      .getAll(name)
      .map((value) => (typeof value === 'string' ? value : value.name)),
  }))
  const person = reviewer.value ? labelFor(reviewers, reviewer.value) : ''
  status.value = `Review requested from ${person}.`
}

// Native reset restores each combobox's `default-value` and clears queries.
function onReset(): void {
  reviewerMissing.value = false
  submitted.value = []
  status.value = 'Form reset.'
}
</script>

<template>
  <form class="review" novalidate @submit.prevent="send" @reset="onReset">
    <GhostCard as="section" aria-labelledby="review-title">
      <template #header>
        <div class="review__header">
          <h2 id="review-title" class="review__title">Request a review</h2>
          <p class="review__lead">
            Pull request #1284 · Retry failed card payments
          </p>
        </div>
      </template>

      <div class="review__fields">
        <GhostField required :invalid="reviewerMissing">
          <GhostFieldLabel required>Reviewer</GhostFieldLabel>
          <GhostFieldDescription
            >One person approves the merge.</GhostFieldDescription
          >
          <GhostFieldControl v-slot="field">
            <!-- `required` on the root enables native form validation. -->
            <GhostCombobox
              v-model:search="reviewerQuery"
              :model-value="reviewer"
              name="reviewer"
              required
              @update:model-value="onReviewer"
            >
              <GhostComboboxInput
                v-bind="field"
                placeholder="Search people"
                spellcheck="false"
              />
              <GhostComboboxContent class="review-list" :offset="6">
                <GhostComboboxOption
                  v-for="choice in reviewerOptions"
                  :key="choice.value"
                  :value="choice.value"
                  :text-value="choice.label"
                >
                  {{ choice.label }}
                </GhostComboboxOption>
                <GhostComboboxEmpty
                  >No one matches that name.</GhostComboboxEmpty
                >
              </GhostComboboxContent>
            </GhostCombobox>
          </GhostFieldControl>
          <GhostFieldError v-if="reviewerMissing">
            Choose a reviewer.
          </GhostFieldError>
        </GhostField>

        <GhostField>
          <GhostFieldLabel>Labels</GhostFieldLabel>
          <GhostFieldDescription>
            Pick any number. The list stays open while you toggle labels.
          </GhostFieldDescription>
          <GhostFieldControl v-slot="field">
            <GhostCombobox
              v-model:search="labelQuery"
              :model-value="labels"
              :default-value="defaultLabels"
              name="labels"
              multiple
              @update:model-value="onLabels"
            >
              <GhostComboboxInput
                v-bind="field"
                placeholder="Filter labels"
                spellcheck="false"
              />
              <GhostComboboxContent class="review-list" :offset="6">
                <GhostComboboxOption
                  v-for="choice in labelOptions"
                  :key="choice.value"
                  :value="choice.value"
                  :text-value="choice.label"
                >
                  <span class="review-list__option">
                    {{ choice.label }}
                    <svg
                      v-if="labels.includes(choice.value)"
                      class="review-list__check"
                      aria-hidden="true"
                      viewBox="0 0 16 16"
                    >
                      <path d="M3.5 8.5l3 3 6-7" />
                    </svg>
                  </span>
                </GhostComboboxOption>
                <GhostComboboxEmpty>No labels match.</GhostComboboxEmpty>
              </GhostComboboxContent>
            </GhostCombobox>
          </GhostFieldControl>
          <ul
            v-if="labels.length > 0"
            class="review__chips"
            aria-label="Selected labels"
          >
            <li v-for="value in labels" :key="value">
              <GhostBadge>{{ labelFor(labelChoices, value) }}</GhostBadge>
            </li>
          </ul>
          <span v-else class="review__none">No labels</span>
        </GhostField>
      </div>

      <template #footer>
        <div class="review__footer">
          <p class="review__status" role="status">{{ status }}</p>
          <div class="review__actions">
            <GhostButton type="reset" variant="ghost" tone="neutral">
              Reset
            </GhostButton>
            <GhostButton type="submit">Request review</GhostButton>
          </div>
        </div>
        <section
          v-if="submitted.length > 0"
          class="review__submitted"
          aria-labelledby="review-submitted-title"
        >
          <h3 id="review-submitted-title" class="review__submitted-title">
            Submitted form data
          </h3>
          <dl class="review__entries">
            <div
              v-for="entry in submitted"
              :key="entry.name"
              class="review__entry"
            >
              <dt>{{ entry.name }}</dt>
              <dd>
                {{ entry.values.filter(Boolean).join(', ') || '(empty)' }}
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
.review {
  max-inline-size: 32rem;
}

.review__header {
  display: grid;
  gap: var(--ghost-space-gap-xs);
  padding-block-end: var(--ghost-space-stack-sm);
}

/* Native text picks up docs prose styles, so each element resets its own. */
.review__title,
.review__submitted-title {
  border: 0;
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-lg);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-tight);
  margin: 0;
  padding: 0;
}

.review__submitted-title {
  font-size: var(--ghost-type-size-sm);
}

.review__lead,
.review__status,
.review__none {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-snug);
  margin: 0;
}

.review__fields {
  display: grid;
  gap: var(--ghost-space-stack-lg);
  grid-template-columns: minmax(0, 1fr);
}

/* Selected labels wrap under the input; reset the docs list styles. */
.review__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-xs);
  list-style: none;
  margin: 0;
  padding: 0;
}

.review__chips li {
  margin: 0;
}

.review__footer {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm) var(--ghost-space-gap-md);
  justify-content: flex-end;
}

.review__status {
  flex: 1 1 10rem;
}

.review__actions {
  display: flex;
  gap: var(--ghost-space-gap-sm);
}

.review__submitted {
  border-block-start: var(--ghost-border-hairline-width) solid
    var(--ghost-border-default);
  display: grid;
  gap: var(--ghost-space-gap-sm);
  margin-block-start: var(--ghost-space-stack-md);
  padding-block-start: var(--ghost-space-stack-md);
}

.review__entries {
  display: grid;
  gap: var(--ghost-space-gap-xs);
  margin: 0;
}

.review__entry {
  column-gap: var(--ghost-space-gap-md);
  display: grid;
  font-size: var(--ghost-type-size-sm);
  grid-template-columns: minmax(0, 6rem) minmax(0, 1fr);
  line-height: var(--ghost-type-line-snug);
}

.review__entry dt,
.review__entry dd {
  margin: 0;
  min-inline-size: 0;
  overflow-wrap: anywhere;
}

.review__entry dt {
  color: var(--ghost-text-muted);
}

.review__entry dd {
  color: var(--ghost-text-default);
  font-weight: var(--ghost-type-weight-medium);
}
</style>

<style>
/*
 * Unscoped on purpose: these classes land on the listbox content and its
 * options inside a body portal, where a scoped attribute is not guaranteed.
 * The themed list paints the surface and the checked fill; the check mark
 * only adds a second cue for multi-value rows and never shifts layout.
 */
.review-list {
  min-inline-size: 14rem;
}

.review-list__option {
  align-items: center;
  display: flex;
  gap: var(--ghost-space-gap-sm);
  justify-content: space-between;
}

.review-list__check {
  block-size: 1rem;
  fill: none;
  flex: none;
  inline-size: 1rem;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.75;
}
</style>
