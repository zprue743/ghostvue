<script setup lang="ts">
import { reactive, ref } from 'vue'

import {
  GhostButton,
  GhostCard,
  GhostField,
  GhostFieldControl,
  GhostFieldDescription,
  GhostFieldLabel,
  GhostSwitch,
} from '@ghostvue/themes'

interface Setting {
  id: string
  label: string
  description: string
  enabled: boolean
  disabled?: boolean
}

const seed: readonly Setting[] = [
  {
    id: 'mfa',
    label: 'Require two-factor authentication',
    description:
      'Members must verify sign-ins with an authenticator app or passkey.',
    enabled: true,
  },
  {
    id: 'public-links',
    label: 'Allow public share links',
    description:
      'Anyone with a read-only link can inspect published dashboards.',
    enabled: false,
  },
  {
    id: 'audit-stream',
    label: 'Stream audit events',
    description: 'Forward security and permission changes to your SIEM sink.',
    enabled: true,
  },
  {
    id: 'hardware-keys',
    label: 'Enforce hardware security keys',
    description: 'Managed by your organization policy.',
    enabled: true,
    disabled: true,
  },
]

const settings = reactive(seed.map((item) => ({ ...item })))
const saved = ref(false)

function save(): void {
  saved.value = true
}

function restore(): void {
  settings.forEach((item, index) => {
    item.enabled = seed[index]?.enabled ?? false
  })
  saved.value = false
}

function clearSaved(): void {
  saved.value = false
}
</script>

<template>
  <form class="security-form" @submit.prevent="save" @change="clearSaved">
    <GhostCard as="section" aria-labelledby="security-title">
      <template #header>
        <div class="security-form__header">
          <h2 id="security-title" class="security-form__title">
            Workspace security
          </h2>
          <p class="security-form__lead">
            Control authentication and sharing policies across all projects.
          </p>
        </div>
      </template>

      <div class="security-form__rows">
        <GhostField
          v-for="item in settings"
          :key="item.id"
          class="security-row"
          :disabled="Boolean(item.disabled)"
        >
          <GhostFieldLabel>{{ item.label }}</GhostFieldLabel>
          <GhostFieldDescription>
            {{ item.description }}
          </GhostFieldDescription>
          <GhostFieldControl v-slot="field">
            <GhostSwitch
              v-bind="field"
              v-model="item.enabled"
              :name="item.id"
            />
          </GhostFieldControl>
        </GhostField>
      </div>

      <template #footer>
        <div class="security-form__actions">
          <p class="security-form__status" role="status">
            {{ saved ? 'Security policy saved.' : '' }}
          </p>
          <GhostButton
            type="button"
            variant="ghost"
            tone="neutral"
            class="security-form__action"
            @click="restore"
          >
            Restore defaults
          </GhostButton>
          <GhostButton type="submit" class="security-form__action">
            Save policy
          </GhostButton>
        </div>
      </template>
    </GhostCard>
  </form>
</template>

<style scoped>
.security-form {
  max-inline-size: 38rem;
}

.security-form__header {
  display: grid;
  gap: var(--ghost-space-gap-xs);
  padding-block-end: var(--ghost-space-stack-sm);
}

.security-form__title {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-lg);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-tight);
  margin: 0;
}

.security-form__lead,
.security-form__status {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-snug);
  margin: 0;
  overflow-wrap: anywhere;
}

.security-form__rows {
  display: grid;
  gap: var(--ghost-space-stack-md);
}

.security-form :deep(.security-row) {
  align-items: start;
  column-gap: var(--ghost-space-gap-md);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  row-gap: var(--ghost-space-gap-xs);
}

.security-form :deep(.security-row + .security-row) {
  border-block-start: var(--ghost-border-hairline-width) solid
    var(--ghost-border-muted);
  padding-block-start: var(--ghost-space-stack-md);
}

.security-form :deep(.security-row > [data-part='label']) {
  cursor: pointer;
  grid-column: 1;
}

.security-form
  :deep(.security-row[data-state='disabled'] > [data-part='label']) {
  cursor: not-allowed;
}

.security-form :deep(.security-row > [data-part='description']) {
  grid-column: 1;
  overflow-wrap: anywhere;
}

.security-form :deep(.security-row > .ghost-themed-scope) {
  align-self: center;
  grid-column: 2;
  grid-row: 1 / span 2;
}

.security-form__actions {
  display: grid;
  gap: var(--ghost-space-gap-sm) var(--ghost-space-gap-md);
}

.security-form :deep(.security-form__action) {
  inline-size: 100%;
}

@container ghost-demo (min-width: 30rem) {
  .security-form__actions {
    align-items: center;
    display: flex;
    justify-content: flex-end;
  }

  .security-form__status {
    flex: 1 1 auto;
  }

  .security-form :deep(.security-form__action) {
    inline-size: auto;
  }
}
</style>
