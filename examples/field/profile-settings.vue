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
  GhostTextarea,
} from '@ghostvue/themes'

/*
 * Deterministic seed data. Support email starts without a domain suffix so the
 * invalid state and aria-describedby error link are visible on first render.
 */
const displayName = ref('Ada Lovelace')
const supportEmail = ref('ada@analytical-engines')
const bio = ref(
  'Maintains compiler notes and runtime benchmarks for the Analytical Engine.',
)
const billingId = 'org_01J9XK2M8P'
const saved = ref(false)

const nameInvalid = computed(() => displayName.value.trim() === '')
const emailInvalid = computed(
  () => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail.value.trim()),
)

function save(event: SubmitEvent): void {
  saved.value = !nameInvalid.value && !emailInvalid.value
  if (saved.value) return
  const form = event.currentTarget
  if (!(form instanceof HTMLFormElement)) return
  form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
}

function restore(): void {
  displayName.value = 'Ada Lovelace'
  supportEmail.value = 'ada@analytical-engines'
  bio.value =
    'Maintains compiler notes and runtime benchmarks for the Analytical Engine.'
  saved.value = false
}

function clearStatus(): void {
  saved.value = false
}
</script>

<template>
  <form
    class="profile-form"
    novalidate
    @submit.prevent="save"
    @input="clearStatus"
  >
    <GhostCard as="section" aria-labelledby="field-profile-title">
      <template #header>
        <div class="profile-form__header">
          <h2 id="field-profile-title" class="profile-form__title">
            Workspace profile
          </h2>
          <p class="profile-form__lead">
            Visible to members across shared projects and audit logs.
          </p>
        </div>
      </template>

      <div class="profile-form__fields">
        <GhostField required :invalid="nameInvalid">
          <GhostFieldLabel>Display name</GhostFieldLabel>
          <GhostFieldControl v-slot="field">
            <GhostInput
              v-bind="field"
              v-model="displayName"
              name="display-name"
              autocomplete="name"
              block
            />
          </GhostFieldControl>
          <GhostFieldError v-if="nameInvalid">
            Enter a display name.
          </GhostFieldError>
        </GhostField>

        <GhostField required :invalid="emailInvalid">
          <GhostFieldLabel>Support email</GhostFieldLabel>
          <GhostFieldDescription>
            Alerts and billing receipts are sent to this address.
          </GhostFieldDescription>
          <GhostFieldControl v-slot="field">
            <GhostInput
              v-bind="field"
              v-model="supportEmail"
              type="email"
              name="support-email"
              autocomplete="email"
              block
            />
          </GhostFieldControl>
          <GhostFieldError v-if="emailInvalid">
            Enter an address like team@company.com.
          </GhostFieldError>
        </GhostField>

        <GhostField>
          <GhostFieldLabel>Bio</GhostFieldLabel>
          <GhostFieldDescription>
            {{ bio.length }} of 200 characters.
          </GhostFieldDescription>
          <GhostFieldControl v-slot="field">
            <GhostTextarea
              v-bind="field"
              v-model="bio"
              :rows="3"
              maxlength="200"
              name="bio"
            />
          </GhostFieldControl>
        </GhostField>

        <GhostField disabled>
          <GhostFieldLabel>Organization ID</GhostFieldLabel>
          <GhostFieldDescription>
            Assigned by your workspace administrator.
          </GhostFieldDescription>
          <GhostFieldControl v-slot="field">
            <GhostInput
              v-bind="field"
              :model-value="billingId"
              name="org-id"
              block
            />
          </GhostFieldControl>
        </GhostField>
      </div>

      <template #footer>
        <div class="profile-form__actions">
          <p class="profile-form__status" role="status">
            {{ saved ? 'Profile saved.' : '' }}
          </p>
          <GhostButton
            type="button"
            variant="ghost"
            tone="neutral"
            class="profile-form__action"
            @click="restore"
          >
            Reset
          </GhostButton>
          <GhostButton type="submit" class="profile-form__action">
            Save profile
          </GhostButton>
        </div>
      </template>
    </GhostCard>
  </form>
</template>

<style scoped>
.profile-form {
  max-inline-size: 32rem;
}

.profile-form__header {
  display: grid;
  gap: var(--ghost-space-gap-xs);
  padding-block-end: var(--ghost-space-stack-sm);
}

.profile-form__title {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-lg);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-tight);
  margin: 0;
}

.profile-form__lead,
.profile-form__status {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-snug);
  margin: 0;
  overflow-wrap: anywhere;
}

.profile-form__fields {
  display: grid;
  gap: var(--ghost-space-stack-lg);
}

.profile-form :deep([data-part='description']),
.profile-form :deep([data-part='error']) {
  overflow-wrap: anywhere;
}

.profile-form__actions {
  display: grid;
  gap: var(--ghost-space-gap-sm) var(--ghost-space-gap-md);
}

.profile-form :deep(.profile-form__action) {
  inline-size: 100%;
}

@container ghost-demo (min-width: 30rem) {
  .profile-form__actions {
    align-items: center;
    display: flex;
    justify-content: flex-end;
  }

  .profile-form__status {
    flex: 1 1 auto;
  }

  .profile-form :deep(.profile-form__action) {
    inline-size: auto;
  }
}
</style>
