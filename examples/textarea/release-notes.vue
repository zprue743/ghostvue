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
  GhostTextarea,
} from '@ghostvue/themes'

const summary = ref(
  'Added adaptive contrast tokens for solid inline alerts and scaled stepper controls across sm, md, and lg densities.',
)
const deployChecklist =
  'Run database migrations before rolling out worker replicas v2.14.3.'
const deprecatedNotice =
  'Legacy v1 webhook payloads are frozen and cannot be edited.'

const published = ref(false)
const limit = 280

const summaryInvalid = computed(() => summary.value.trim() === '')
const wordCount = computed(() => {
  const trimmed = summary.value.trim()
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length
})

function publish(event: SubmitEvent): void {
  published.value = !summaryInvalid.value
  if (published.value) return
  const form = event.currentTarget
  if (!(form instanceof HTMLFormElement)) return
  form.querySelector<HTMLTextAreaElement>('[aria-invalid="true"]')?.focus()
}

function clearStatus(): void {
  published.value = false
}
</script>

<template>
  <form
    class="release-form"
    novalidate
    @submit.prevent="publish"
    @input="clearStatus"
  >
    <GhostCard as="section" aria-labelledby="release-notes-title">
      <template #header>
        <div class="release-form__header">
          <h2 id="release-notes-title" class="release-form__title">
            Release v2.14.3 notes
          </h2>
          <p class="release-form__lead">
            Published to the workspace changelog when deployment completes.
          </p>
        </div>
      </template>

      <div class="release-form__fields">
        <GhostField required :invalid="summaryInvalid">
          <GhostFieldLabel>Release summary</GhostFieldLabel>
          <GhostFieldDescription>
            {{ summary.length }} / {{ limit }} characters ({{ wordCount }}
            words). Grows automatically as you type.
          </GhostFieldDescription>
          <GhostFieldControl v-slot="field">
            <GhostTextarea
              v-bind="field"
              v-model="summary"
              auto-resize
              :rows="3"
              :maxlength="limit"
              name="summary"
              block
            />
          </GhostFieldControl>
          <GhostFieldError v-if="summaryInvalid">
            Add a short summary before publishing.
          </GhostFieldError>
        </GhostField>

        <GhostField>
          <GhostFieldLabel>Deployment checklist</GhostFieldLabel>
          <GhostFieldDescription>
            Read-only operator note. Focusable and included in submission.
          </GhostFieldDescription>
          <GhostFieldControl v-slot="field">
            <GhostTextarea
              v-bind="field"
              :model-value="deployChecklist"
              readonly
              :rows="2"
              name="checklist"
              block
            />
          </GhostFieldControl>
        </GhostField>

        <GhostField disabled>
          <GhostFieldLabel>Deprecation notice</GhostFieldLabel>
          <GhostFieldControl v-slot="field">
            <GhostTextarea
              v-bind="field"
              :model-value="deprecatedNotice"
              :rows="2"
              name="deprecation"
              block
            />
          </GhostFieldControl>
        </GhostField>
      </div>

      <template #footer>
        <div class="release-form__actions">
          <p class="release-form__status" role="status">
            {{ published ? 'Release notes published.' : '' }}
          </p>
          <GhostButton type="submit" class="release-form__action">
            Publish notes
          </GhostButton>
        </div>
      </template>
    </GhostCard>
  </form>
</template>

<style scoped>
.release-form {
  max-inline-size: 34rem;
}

.release-form__header {
  display: grid;
  gap: var(--ghost-space-gap-xs);
  padding-block-end: var(--ghost-space-stack-sm);
}

.release-form__title {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-lg);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-tight);
  margin: 0;
}

.release-form__lead,
.release-form__status {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-snug);
  margin: 0;
  overflow-wrap: anywhere;
}

.release-form__fields {
  display: grid;
  gap: var(--ghost-space-stack-lg);
}

.release-form :deep([data-part='description']),
.release-form :deep([data-part='error']) {
  overflow-wrap: anywhere;
}

.release-form__actions {
  display: grid;
  gap: var(--ghost-space-gap-sm) var(--ghost-space-gap-md);
}

.release-form :deep(.release-form__action) {
  inline-size: 100%;
}

@container ghost-demo (min-width: 30rem) {
  .release-form__actions {
    align-items: center;
    display: flex;
    justify-content: flex-end;
  }

  .release-form__status {
    flex: 1 1 auto;
  }

  .release-form :deep(.release-form__action) {
    inline-size: auto;
  }
}
</style>
