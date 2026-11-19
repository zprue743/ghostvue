<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

import {
  GhostButton,
  GhostCard,
  GhostCheckbox,
  GhostField,
  GhostFieldControl,
  GhostFieldDescription,
  GhostFieldLabel,
} from '@ghostvue/themes'

interface Preference {
  id: string
  label: string
  description: string
  enabled: boolean
}

/*
 * Deterministic seed data. Project activity starts partly on, so the
 * select-all row shows the mixed state on first render. Security alerts are
 * on and locked: workspace policy, not the member, owns that choice.
 */
const projectSeed: readonly Preference[] = [
  {
    id: 'mentions',
    label: 'Comments and mentions',
    description: 'Someone replies to you or mentions you by name.',
    enabled: true,
  },
  {
    id: 'assignments',
    label: 'Task assignments',
    description: 'A task is assigned to you or its due date changes.',
    enabled: true,
  },
  {
    id: 'digest',
    label: 'Weekly digest',
    description: 'A Monday summary of activity across your projects.',
    enabled: false,
  },
]
const accountSeed: readonly Preference[] = [
  {
    id: 'billing',
    label: 'Billing receipts',
    description: 'Invoices, payment confirmations, and failed charges.',
    enabled: false,
  },
]

const project = reactive(projectSeed.map((item) => ({ ...item })))
const account = reactive(accountSeed.map((item) => ({ ...item })))
const saved = ref(false)

const projectOn = computed(() => project.filter((item) => item.enabled).length)
const allProject = computed(() => projectOn.value === project.length)
// Mixed is display state derived here; the v-model below stays boolean.
const someProject = computed(() => projectOn.value > 0 && !allProject.value)

function setAllProject(enabled: boolean): void {
  for (const item of project) item.enabled = enabled
}

function restoreDefaults(): void {
  project.forEach((item, index) => {
    item.enabled = projectSeed[index]?.enabled ?? false
  })
  account.forEach((item, index) => {
    item.enabled = accountSeed[index]?.enabled ?? false
  })
  saved.value = false
}

function save(): void {
  saved.value = true
}

function resetSaved(): void {
  saved.value = false
}
</script>

<template>
  <form class="prefs" @submit.prevent="save" @change="resetSaved">
    <GhostCard as="section" aria-labelledby="prefs-title">
      <template #header>
        <div class="prefs__header">
          <h2 id="prefs-title" class="prefs__title">Email notifications</h2>
          <p class="prefs__lead">
            Choose what reaches ada@analytical-engines.example.
          </p>
        </div>
      </template>

      <div class="prefs__groups">
        <div
          class="prefs__group"
          role="group"
          aria-labelledby="prefs-project-title"
        >
          <div class="prefs__group-header">
            <h3 id="prefs-project-title" class="prefs__group-title">
              Project activity
            </h3>
            <p class="prefs__group-hint">Updates from projects you follow.</p>
          </div>

          <div class="prefs__options">
            <GhostField class="pref">
              <GhostFieldControl v-slot="field">
                <GhostCheckbox
                  v-bind="field"
                  :model-value="allProject"
                  :indeterminate="someProject"
                  @update:model-value="setAllProject"
                />
              </GhostFieldControl>
              <GhostFieldLabel>All project activity</GhostFieldLabel>
              <GhostFieldDescription>
                {{ projectOn }} of {{ project.length }} on
              </GhostFieldDescription>
            </GhostField>

            <div class="prefs__children">
              <GhostField v-for="item in project" :key="item.id" class="pref">
                <GhostFieldControl v-slot="field">
                  <GhostCheckbox
                    v-bind="field"
                    v-model="item.enabled"
                    name="notifications"
                    :value="item.id"
                  />
                </GhostFieldControl>
                <GhostFieldLabel>{{ item.label }}</GhostFieldLabel>
                <GhostFieldDescription>
                  {{ item.description }}
                </GhostFieldDescription>
              </GhostField>
            </div>
          </div>
        </div>

        <div
          class="prefs__group"
          role="group"
          aria-labelledby="prefs-account-title"
        >
          <div class="prefs__group-header">
            <h3 id="prefs-account-title" class="prefs__group-title">Account</h3>
            <p class="prefs__group-hint">Security and billing for you.</p>
          </div>

          <div class="prefs__options">
            <GhostField class="pref" disabled>
              <GhostFieldControl v-slot="field">
                <GhostCheckbox
                  v-bind="field"
                  :model-value="true"
                  name="notifications"
                  value="security"
                />
              </GhostFieldControl>
              <GhostFieldLabel>Security alerts</GhostFieldLabel>
              <GhostFieldDescription>
                New sign-ins and password changes. Required by your workspace.
              </GhostFieldDescription>
            </GhostField>

            <GhostField v-for="item in account" :key="item.id" class="pref">
              <GhostFieldControl v-slot="field">
                <GhostCheckbox
                  v-bind="field"
                  v-model="item.enabled"
                  name="notifications"
                  :value="item.id"
                />
              </GhostFieldControl>
              <GhostFieldLabel>{{ item.label }}</GhostFieldLabel>
              <GhostFieldDescription>
                {{ item.description }}
              </GhostFieldDescription>
            </GhostField>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="prefs__actions">
          <p class="prefs__status" role="status">
            {{ saved ? 'Preferences saved.' : '' }}
          </p>
          <GhostButton
            type="button"
            variant="ghost"
            tone="neutral"
            class="prefs__action"
            @click="restoreDefaults"
          >
            Restore defaults
          </GhostButton>
          <GhostButton type="submit" class="prefs__action">
            Save preferences
          </GhostButton>
        </div>
      </template>
    </GhostCard>
  </form>
</template>

<style scoped>
/* The form owns its measure; the card shrinks with the preview on phones. */
.prefs {
  max-inline-size: 42rem;
}

.prefs__header {
  display: grid;
  gap: var(--ghost-space-gap-xs);
  padding-block-end: var(--ghost-space-stack-md);
}

.prefs__title {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-lg);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-tight);
  margin: 0;
}

.prefs__lead,
.prefs__group-hint,
.prefs__status {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-snug);
  margin: 0;
  overflow-wrap: anywhere;
}

.prefs__groups {
  display: grid;
  gap: var(--ghost-space-stack-lg);
}

/* Each group heading sits above its options. */
.prefs__group {
  display: grid;
  gap: var(--ghost-space-stack-md);
}

.prefs__group + .prefs__group {
  border-block-start: var(--ghost-border-hairline-width) solid
    var(--ghost-border-muted);
  padding-block-start: var(--ghost-space-stack-lg);
}

.prefs__group-header {
  display: grid;
  gap: var(--ghost-space-gap-xs);
}

.prefs__group-title {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-md);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-tight);
  margin: 0;
}

.prefs__options,
.prefs__children {
  display: grid;
  gap: var(--ghost-space-stack-sm);
}

/*
 * Children start where the select-all label starts, so their boxes line up
 * under its text and the hierarchy reads without extra rules.
 */
.prefs__children {
  padding-inline-start: calc(
    var(--ghost-control-size-md-min) + var(--ghost-space-gap-sm)
  );
}

/*
 * One option: the checkbox's full hit target in the first column, label and
 * description stacked in the second. `:deep()` because GhostField passes the
 * class to its inner root and the label parts render inside it.
 */
.prefs :deep(.pref) {
  column-gap: var(--ghost-space-gap-sm);
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  row-gap: var(--ghost-space-gap-xs);
}

.prefs :deep(.pref > .ghost-themed-scope) {
  display: flex;
  grid-row: 1 / span 2;
}

/*
 * Center the label's first line on the painted box: pad it by half the
 * difference between the hit target and one line. Long labels wrap below
 * that line and the box stays put.
 */
.prefs :deep(.pref > [data-part='label']) {
  cursor: pointer;
  grid-column: 2;
  padding-block-start: calc((var(--ghost-control-size-md-min) - 1lh) / 2);
}

.prefs :deep(.pref[data-state='disabled'] > [data-part='label']) {
  cursor: not-allowed;
}

.prefs :deep(.pref > [data-part='description']) {
  grid-column: 2;
  overflow-wrap: anywhere;
}

/*
 * Narrow previews stack the actions at full width so neither label wraps
 * and both keep a comfortable target; the status reads first.
 */
.prefs__actions {
  display: grid;
  gap: var(--ghost-space-gap-sm) var(--ghost-space-gap-md);
}

.prefs :deep(.prefs__action) {
  inline-size: 100%;
}

/*
 * Wide previews put both actions on one row at the end. Driven by the
 * preview width, not the viewport, through the docs and playground
 * `ghost-demo` container.
 */
@container ghost-demo (min-width: 30rem) {
  .prefs__actions {
    align-items: center;
    display: flex;
    justify-content: flex-end;
  }

  .prefs__status {
    flex: 1 1 auto;
  }

  .prefs :deep(.prefs__action) {
    inline-size: auto;
  }
}
</style>
