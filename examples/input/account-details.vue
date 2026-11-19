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
  GhostInput,
} from '@ghostvue/themes'

/*
 * Deterministic seed data. The work email starts without a top-level domain
 * so the invalid state is visible on first render; fixing it clears the
 * error without a submit.
 */
const firstName = ref('Ada')
const lastName = ref('Lovelace')
const email = ref('ada@analytical-engines')
const workspaceUrl =
  'https://app.example.com/workspaces/analytical-engines-research-and-development'
const billingContact = 'finance@analytical-engines.example'

const saved = ref(false)

// A deliberately small check: the browser still runs native email validation.
const emailInvalid = computed(
  () => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value),
)
const nameInvalid = computed(() => firstName.value.trim() === '')

function save(event: SubmitEvent): void {
  saved.value = !emailInvalid.value && !nameInvalid.value
  if (saved.value) return
  // Move focus to the first field that needs attention.
  const form = event.currentTarget
  if (!(form instanceof HTMLFormElement)) return
  form.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus()
}

function resetSaved(): void {
  saved.value = false
}
</script>

<template>
  <form class="account" novalidate @submit.prevent="save" @input="resetSaved">
    <GhostCard as="section" aria-labelledby="account-title">
      <template #header>
        <div class="account__header">
          <h2 id="account-title" class="account__title">Account details</h2>
          <p class="account__lead">
            Shown on invoices, shared reports, and workspace invitations.
          </p>
        </div>
      </template>

      <div class="account__fields">
        <div class="account__row">
          <GhostField required :invalid="nameInvalid">
            <GhostFieldLabel required>First name</GhostFieldLabel>
            <GhostFieldControl v-slot="field">
              <GhostInput
                v-bind="field"
                v-model="firstName"
                name="given-name"
                autocomplete="given-name"
                block
              />
            </GhostFieldControl>
            <GhostFieldError v-if="nameInvalid">
              Enter a first name.
            </GhostFieldError>
          </GhostField>

          <GhostField>
            <GhostFieldLabel>Last name</GhostFieldLabel>
            <GhostFieldControl v-slot="field">
              <GhostInput
                v-bind="field"
                v-model="lastName"
                name="family-name"
                autocomplete="family-name"
                block
              />
            </GhostFieldControl>
          </GhostField>
        </div>

        <GhostField required :invalid="emailInvalid">
          <GhostFieldLabel required>Work email</GhostFieldLabel>
          <GhostFieldDescription>
            Sign-in links and billing receipts go here.
          </GhostFieldDescription>
          <GhostFieldControl v-slot="field">
            <GhostInput
              v-bind="field"
              v-model="email"
              type="email"
              name="email"
              autocomplete="email"
              block
            />
          </GhostFieldControl>
          <GhostFieldError v-if="emailInvalid">
            Enter an address like name@company.com.
          </GhostFieldError>
        </GhostField>

        <GhostField>
          <GhostFieldLabel>Workspace URL</GhostFieldLabel>
          <GhostFieldDescription>
            Set by your workspace owner. Share it with teammates.
          </GhostFieldDescription>
          <GhostFieldControl v-slot="field">
            <GhostInput
              v-bind="field"
              :model-value="workspaceUrl"
              type="url"
              name="workspace-url"
              readonly
              block
              class="account__long-value"
            />
          </GhostFieldControl>
        </GhostField>

        <GhostField disabled>
          <GhostFieldLabel>Billing contact</GhostFieldLabel>
          <GhostFieldDescription>
            Managed by your organization's finance team.
          </GhostFieldDescription>
          <GhostFieldControl v-slot="field">
            <GhostInput
              v-bind="field"
              :model-value="billingContact"
              type="email"
              name="billing-contact"
              block
              class="account__long-value"
            />
          </GhostFieldControl>
        </GhostField>
      </div>

      <template #footer>
        <div class="account__actions">
          <p class="account__status" role="status">
            {{ saved ? 'Changes saved.' : '' }}
          </p>
          <GhostButton type="submit">Save changes</GhostButton>
        </div>
      </template>
    </GhostCard>
  </form>
</template>

<style scoped>
/*
 * The form owns its width: 28rem keeps labels, hints, and fields at a
 * readable measure and lets the card shrink with the preview on phones.
 */
.account {
  max-inline-size: 28rem;
}

.account__header {
  display: grid;
  gap: var(--ghost-space-gap-xs);
  padding-block-end: var(--ghost-space-stack-sm);
}

.account__title {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-lg);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-tight);
  margin: 0;
}

.account__lead,
.account__status {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-snug);
  margin: 0;
}

.account__fields {
  display: grid;
  gap: var(--ghost-space-stack-lg);
}

/* Two names share a row when each can keep about 11rem; otherwise they stack. */
.account__row {
  display: grid;
  gap: var(--ghost-space-stack-lg) var(--ghost-space-gap-md);
  grid-template-columns: repeat(auto-fit, minmax(min(11rem, 100%), 1fr));
}

/* Long hints and errors wrap instead of widening the card. */
.account :deep([data-part='description']),
.account :deep([data-part='error']) {
  overflow-wrap: anywhere;
}

/*
 * Long single-line values stay on one line and end with an ellipsis at rest.
 * `:deep()` because the input renders inside GhostFieldControl's slot.
 */
.account :deep(.account__long-value) {
  text-overflow: ellipsis;
}

.account__actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm) var(--ghost-space-gap-md);
  justify-content: flex-end;
}

.account__status {
  flex: 1 1 auto;
}
</style>
