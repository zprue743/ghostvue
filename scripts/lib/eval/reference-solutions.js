/**
 * Deterministic reference Vue SFCs for the five fixed eval tasks plus
 * representative `docs-only` baseline fixtures for offline `mock` runs.
 *
 * Reference solutions follow every shipped GhostVue manifest contract and
 * accessibility pattern so both the Playwright e2e grading suite and the
 * `--provider mock` runner can verify the complete pipeline at $0.00 cost.
 */

const REFERENCE_SFCS = Object.freeze({
  'login-form': `<script setup lang="ts">
import { computed, ref } from 'vue'

import {
  GhostButton,
  GhostCard,
  GhostCheckbox,
  GhostField,
  GhostFieldControl,
  GhostFieldError,
  GhostFieldLabel,
  GhostInput,
} from '@ghostvue/themes'

const email = ref('')
const password = ref('')
const rememberMe = ref(false)
const submitted = ref(false)
const signedInEmail = ref('')

const emailInvalid = computed(
  () => !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email.value.trim()),
)
const passwordInvalid = computed(() => password.value.length < 8)
const showEmailError = computed(() => submitted.value && emailInvalid.value)
const showPasswordError = computed(() => submitted.value && passwordInvalid.value)

function onSubmit(): void {
  submitted.value = true
  if (emailInvalid.value || passwordInvalid.value) {
    signedInEmail.value = ''
    return
  }
  signedInEmail.value = email.value.trim()
}
</script>

<template>
  <GhostCard as="section" class="login-card" aria-label="Sign in">
    <form class="login-form" novalidate @submit.prevent="onSubmit">
      <h1 class="login-title">Sign in to GhostVue</h1>

      <GhostField required :invalid="showEmailError">
        <GhostFieldLabel required>Email</GhostFieldLabel>
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
        <GhostFieldError v-if="showEmailError">
          Enter a valid email address.
        </GhostFieldError>
      </GhostField>

      <GhostField required :invalid="showPasswordError">
        <GhostFieldLabel required>Password</GhostFieldLabel>
        <GhostFieldControl v-slot="field">
          <GhostInput
            v-bind="field"
            v-model="password"
            type="password"
            name="password"
            autocomplete="current-password"
            block
          />
        </GhostFieldControl>
        <GhostFieldError v-if="showPasswordError">
          Password must be at least 8 characters.
        </GhostFieldError>
      </GhostField>

      <label class="remember-row" for="remember-me">
        <GhostCheckbox id="remember-me" v-model="rememberMe" />
        <span>Remember me</span>
      </label>

      <div class="login-actions">
        <GhostButton type="submit" block>Sign in</GhostButton>
      </div>

      <p v-if="signedInEmail" class="login-status" role="status">
        Signed in as {{ signedInEmail }}
      </p>
    </form>
  </GhostCard>
</template>

<style scoped>
.login-card {
  max-inline-size: 26rem;
}

.login-form {
  display: grid;
  gap: var(--ghost-space-stack-md);
}

.login-title {
  margin: 0;
  font-size: var(--ghost-type-size-lg);
  font-weight: var(--ghost-type-weight-semibold);
}

.remember-row {
  align-items: center;
  display: flex;
  gap: var(--ghost-space-gap-sm);
  font-size: var(--ghost-type-size-sm);
}

.login-actions {
  display: grid;
}

.login-status {
  margin: 0;
  font-size: var(--ghost-type-size-sm);
}
</style>
`,

  'settings-dialog': `<script setup lang="ts">
import { reactive, ref } from 'vue'

import {
  GhostButton,
  GhostCard,
  GhostDialog,
  GhostDialogClose,
  GhostDialogContent,
  GhostDialogDescription,
  GhostDialogOverlay,
  GhostDialogTitle,
  GhostDialogTrigger,
  GhostField,
  GhostFieldControl,
  GhostFieldLabel,
  GhostInput,
  GhostSwitch,
} from '@ghostvue/themes'

const saved = reactive({
  displayName: 'Ada Lovelace',
  emailNotifications: true,
})

const draft = reactive({
  displayName: saved.displayName,
  emailNotifications: saved.emailNotifications,
})

const open = ref(false)
const status = ref('')

function onOpenChange(next: boolean): void {
  if (next) {
    draft.displayName = saved.displayName
    draft.emailNotifications = saved.emailNotifications
  }
  open.value = next
}

function saveSettings(): void {
  const trimmed = draft.displayName.trim()
  if (trimmed !== '') {
    saved.displayName = trimmed
  }
  saved.emailNotifications = draft.emailNotifications
  status.value = \`Saved settings for \${saved.displayName}.\`
  open.value = false
}
</script>

<template>
  <GhostCard as="section" class="settings-card" aria-label="Workspace settings">
    <div class="settings-summary">
      <h1 class="settings-heading">Workspace settings</h1>
      <p class="settings-meta">
        Display name: <strong>{{ saved.displayName }}</strong> · Notifications:
        <strong>{{ saved.emailNotifications ? 'Enabled' : 'Paused' }}</strong>
      </p>
      <p v-if="status" class="settings-status" role="status">{{ status }}</p>
    </div>

    <template #footer>
      <GhostDialog :open="open" @update:open="onOpenChange">
        <GhostDialogTrigger :as="GhostButton" variant="outline">
          Open settings
        </GhostDialogTrigger>
        <GhostDialogOverlay />
        <GhostDialogContent>
          <GhostDialogTitle>Settings</GhostDialogTitle>
          <GhostDialogDescription>
            Update your workspace display name and notification preferences.
          </GhostDialogDescription>

          <form class="settings-form" @submit.prevent="saveSettings">
            <GhostField>
              <GhostFieldLabel>Display name</GhostFieldLabel>
              <GhostFieldControl v-slot="field">
                <GhostInput
                  v-bind="field"
                  v-model="draft.displayName"
                  name="displayName"
                  block
                />
              </GhostFieldControl>
            </GhostField>

            <div class="settings-switch-row">
              <label for="email-notifications">Email notifications</label>
              <GhostSwitch
                id="email-notifications"
                v-model="draft.emailNotifications"
              />
            </div>

            <div class="settings-actions">
              <GhostDialogClose
                :as="GhostButton"
                variant="soft"
                tone="neutral"
              >
                Cancel
              </GhostDialogClose>
              <GhostButton type="submit">Save settings</GhostButton>
            </div>
          </form>
        </GhostDialogContent>
      </GhostDialog>
    </template>
  </GhostCard>
</template>

<style scoped>
.settings-card {
  max-inline-size: 32rem;
}

.settings-summary {
  display: grid;
  gap: var(--ghost-space-gap-xs);
}

.settings-heading {
  margin: 0;
  font-size: var(--ghost-type-size-lg);
}

.settings-meta,
.settings-status {
  margin: 0;
  font-size: var(--ghost-type-size-sm);
}

.settings-form {
  display: grid;
  gap: var(--ghost-space-stack-md);
}

.settings-switch-row {
  align-items: center;
  display: flex;
  justify-content: space-between;
  gap: var(--ghost-space-gap-md);
}

.settings-actions {
  display: flex;
  gap: var(--ghost-space-gap-sm);
  justify-content: flex-end;
}
</style>
`,

  'async-combobox-search': `<script setup lang="ts">
import { computed, ref } from 'vue'

import {
  GhostCard,
  GhostCombobox,
  GhostComboboxContent,
  GhostComboboxEmpty,
  GhostComboboxInput,
  GhostComboboxOption,
  GhostField,
  GhostFieldControl,
  GhostFieldLabel,
  GhostSpinner,
  useGhostComboboxAsyncSearch,
  type GhostComboboxMessages,
} from '@ghostvue/themes'

interface Person {
  id: string
  name: string
  role: string
}

const directory: readonly Person[] = [
  { id: 'maya-chen', name: 'Maya Chen', role: 'Design lead' },
  { id: 'amara-okafor', name: 'Amara Okafor', role: 'QA engineer' },
  { id: 'tomas-novak', name: 'Tomas Novak', role: 'Security engineer' },
  { id: 'li-wei', name: 'Li Wei', role: 'Site reliability' },
]

function latencyFor(query: string): number {
  return query.length <= 1 ? 180 : 30
}

function searchPeople(query: string): Promise<Person[]> {
  const needle = query.trim().toLowerCase()
  return new Promise((resolve) => {
    setTimeout(() => {
      if (needle === '') {
        resolve([...directory])
        return
      }
      resolve(
        directory.filter((person) =>
          \`\${person.name} \${person.role}\`.toLowerCase().includes(needle),
        ),
      )
    }, latencyFor(needle))
  })
}

const assigneeId = ref<string | undefined>(undefined)
const query = ref('')
const results = ref<readonly Person[]>(directory)
const loading = ref(false)
const { begin, isLatest } = useGhostComboboxAsyncSearch()

const selectedPerson = computed(() =>
  directory.find((person) => person.id === assigneeId.value),
)

const messages: GhostComboboxMessages = {
  loading: 'Searching assignees',
  empty: 'No matching assignees',
  results: (count) =>
    count === 1 ? '1 assignee found' : \`\${String(count)} assignees found\`,
}

async function onSearch(payload: {
  query: string
  requestId: number
}): Promise<void> {
  const { requestId } = payload
  const trimmed = payload.query.trim()
  begin(requestId)
  if (trimmed === '') {
    loading.value = false
    results.value = directory
    return
  }
  loading.value = true
  const matched = await searchPeople(trimmed)
  if (!isLatest(requestId)) return
  loading.value = false
  results.value = matched
}
</script>

<template>
  <GhostCard as="section" class="assignee-card" aria-label="Assignee picker">
    <div class="assignee-stack">
      <GhostField>
        <GhostFieldLabel>Search assignee</GhostFieldLabel>
        <GhostFieldControl v-slot="field">
          <GhostCombobox
            v-model:search="query"
            v-model="assigneeId"
            :loading="loading"
            :messages="messages"
            @search="onSearch"
          >
            <GhostComboboxInput
              v-bind="field"
              placeholder="Type a name"
              spellcheck="false"
            />
            <GhostComboboxContent placement="bottom-start" :offset="6">
              <div v-if="loading" class="loading-row" aria-hidden="true">
                <GhostSpinner size="sm" tone="neutral" />
                <span>Searching…</span>
              </div>
              <template v-else-if="results.length > 0">
                <GhostComboboxOption
                  v-for="person in results"
                  :key="person.id"
                  :value="person.id"
                  :text-value="person.name"
                >
                  {{ person.name }}
                </GhostComboboxOption>
              </template>
              <GhostComboboxEmpty>
                No matching assignees found.
              </GhostComboboxEmpty>
            </GhostComboboxContent>
          </GhostCombobox>
        </GhostFieldControl>
      </GhostField>

      <p class="assignee-status" role="status">
        {{
          selectedPerson
            ? \`Assigned to \${selectedPerson.name}\`
            : 'No assignee selected'
        }}
      </p>
    </div>
  </GhostCard>
</template>

<style scoped>
.assignee-card {
  max-inline-size: 28rem;
}

.assignee-stack {
  display: grid;
  gap: var(--ghost-space-stack-md);
}

.loading-row {
  align-items: center;
  display: flex;
  gap: var(--ghost-space-gap-sm);
  padding: var(--ghost-space-inset-sm);
}

.assignee-status {
  margin: 0;
  font-size: var(--ghost-type-size-sm);
}
</style>
`,

  'paginated-table': `<script setup lang="ts">
import { computed, ref } from 'vue'

import { GhostCard, GhostPagination, GhostTable } from '@ghostvue/themes'
import {
  GhostTableBody,
  GhostTableCaption,
  GhostTableCell,
  GhostTableHead,
  GhostTableHeaderCell,
  GhostTableRow,
} from '@ghostvue/vue'

interface MemberRow {
  id: string
  name: string
  role: string
}

const rows: readonly MemberRow[] = Array.from({ length: 12 }, (_, index) => {
  const num = String(index + 1).padStart(2, '0')
  return {
    id: \`row-\${num}\`,
    name: \`Row \${num}\`,
    role: index % 2 === 0 ? 'Engineer' : 'Designer',
  }
})

const pageSize = 5
const page = ref(1)
const pageCount = Math.ceil(rows.length / pageSize)

const pagedRows = computed(() => {
  const start = (page.value - 1) * pageSize
  return rows.slice(start, start + pageSize)
})

const rangeLabel = computed(() => {
  const start = (page.value - 1) * pageSize + 1
  const end = Math.min(page.value * pageSize, rows.length)
  return \`Showing \${String(start)}–\${String(end)} of \${String(rows.length)}\`
})
</script>

<template>
  <GhostCard as="section" class="table-card" aria-label="Paginated members">
    <GhostTable aria-label="Team roster">
      <GhostTableCaption>Team roster</GhostTableCaption>
      <GhostTableHead>
        <GhostTableRow>
          <GhostTableHeaderCell scope="col">ID</GhostTableHeaderCell>
          <GhostTableHeaderCell scope="col">Name</GhostTableHeaderCell>
          <GhostTableHeaderCell scope="col">Role</GhostTableHeaderCell>
        </GhostTableRow>
      </GhostTableHead>
      <GhostTableBody>
        <GhostTableRow v-for="row in pagedRows" :key="row.id">
          <GhostTableCell>{{ row.id }}</GhostTableCell>
          <GhostTableCell>{{ row.name }}</GhostTableCell>
          <GhostTableCell>{{ row.role }}</GhostTableCell>
        </GhostTableRow>
      </GhostTableBody>
    </GhostTable>

    <template #footer>
      <div class="table-footer">
        <p class="table-range" role="status">{{ rangeLabel }}</p>
        <GhostPagination
          v-model="page"
          :page-count="pageCount"
          size="sm"
          aria-label="Roster pages"
        />
      </div>
    </template>
  </GhostCard>
</template>

<style scoped>
.table-card {
  max-inline-size: 40rem;
}

.table-footer {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-md);
  justify-content: space-between;
}

.table-range {
  margin: 0;
  font-size: var(--ghost-type-size-sm);
}
</style>
`,

  'validation-error-form': `<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'

import {
  GhostButton,
  GhostCard,
  GhostField,
  GhostFieldControl,
  GhostFieldDescription,
  GhostFieldError,
  GhostFieldLabel,
  GhostInlineAlert,
  GhostInput,
} from '@ghostvue/themes'

const workspaceName = ref('')
const contactEmail = ref('')
const submitted = ref(false)
const createdMessage = ref('')

const nameInvalid = computed(() => workspaceName.value.trim().length < 3)
const emailInvalid = computed(
  () => !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(contactEmail.value.trim()),
)

const showNameError = computed(() => submitted.value && nameInvalid.value)
const showEmailError = computed(() => submitted.value && emailInvalid.value)
const hasSummaryError = computed(
  () => showNameError.value || showEmailError.value,
)

async function onSubmit(event: SubmitEvent): Promise<void> {
  submitted.value = true
  if (nameInvalid.value || emailInvalid.value) {
    createdMessage.value = ''
    const form = event.currentTarget
    if (form instanceof HTMLFormElement) {
      await nextTick()
      form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    }
    return
  }
  createdMessage.value = \`Created workspace \${workspaceName.value.trim()}\`
}
</script>

<template>
  <GhostCard as="section" class="workspace-card" aria-label="Create workspace">
    <form class="workspace-form" novalidate @submit.prevent="onSubmit">
      <h1 class="workspace-title">Create workspace</h1>

      <GhostInlineAlert
        v-if="hasSummaryError"
        tone="danger"
        variant="soft"
        announce="alert"
        :heading-level="2"
      >
        <template #title>Fix validation errors</template>
        <template #message>
          Review the highlighted fields before continuing.
        </template>
      </GhostInlineAlert>

      <GhostField required :invalid="showNameError">
        <GhostFieldLabel required>Workspace name</GhostFieldLabel>
        <GhostFieldDescription>
          Minimum 3 characters.
        </GhostFieldDescription>
        <GhostFieldControl v-slot="field">
          <GhostInput
            v-bind="field"
            v-model="workspaceName"
            name="workspaceName"
            block
          />
        </GhostFieldControl>
        <GhostFieldError v-if="showNameError">
          Enter at least 3 characters.
        </GhostFieldError>
      </GhostField>

      <GhostField required :invalid="showEmailError">
        <GhostFieldLabel required>Contact email</GhostFieldLabel>
        <GhostFieldDescription>
          Billing and audit notifications go here.
        </GhostFieldDescription>
        <GhostFieldControl v-slot="field">
          <GhostInput
            v-bind="field"
            v-model="contactEmail"
            type="email"
            name="contactEmail"
            block
          />
        </GhostFieldControl>
        <GhostFieldError v-if="showEmailError">
          Enter a valid email address.
        </GhostFieldError>
      </GhostField>

      <div class="workspace-actions">
        <GhostButton type="submit">Create workspace</GhostButton>
      </div>

      <p v-if="createdMessage" class="workspace-status" role="status">
        {{ createdMessage }}
      </p>
    </form>
  </GhostCard>
</template>

<style scoped>
.workspace-card {
  max-inline-size: 30rem;
}

.workspace-form {
  display: grid;
  gap: var(--ghost-space-stack-md);
}

.workspace-title {
  margin: 0;
  font-size: var(--ghost-type-size-lg);
}

.workspace-actions {
  display: flex;
  justify-content: flex-end;
}

.workspace-status {
  margin: 0;
  font-size: var(--ghost-type-size-sm);
}
</style>
`,
})

/**
 * Representative `docs-only` baseline in `comparison` mock profile: simulates a
 * realistic mistake an agent without MCP manifest/example inspection makes
 * (e.g. guessing an undeclared prop `errorText` or reaching for `GhostDataTable`
 * on the paginated-table task), while `reference` profile returns valid SFCs.
 */
const COMPARISON_DOCS_ONLY_OVERRIDES = Object.freeze({
  'paginated-table': `<script setup lang="ts">
import { ref } from 'vue'

import { GhostDataTable } from '@ghostvue/vue'

const page = ref(1)
const rows = [{ id: 'row-01', name: 'Row 01', role: 'Engineer' }]
</script>

<template>
  <GhostDataTable :rows="rows" :page="page" />
</template>
`,
  'validation-error-form': `<script setup lang="ts">
import { ref } from 'vue'

import { GhostButton, GhostField, GhostInput } from '@ghostvue/themes'

const workspaceName = ref('')
const contactEmail = ref('')
</script>

<template>
  <form @submit.prevent>
    <GhostField error-text="Guessed prop">
      <GhostInput v-model="workspaceName" label="Workspace name" />
    </GhostField>
    <GhostInput v-model="contactEmail" label="Contact email" />
    <GhostButton type="submit">Create workspace</GhostButton>
  </form>
</template>
`,
})

/**
 * @param {import('./types.d.ts').EvalTaskDefinition['id']} taskId
 * @returns {string}
 */
export function getReferenceSolutionSfc(taskId) {
  return REFERENCE_SFCS[taskId]
}

/**
 * @param {import('./types.d.ts').EvalTaskDefinition['id']} taskId
 * @param {import('./types.d.ts').MockProfile} profile
 * @returns {string}
 */
export function getMockDocsOnlyBaselineSfc(taskId, profile) {
  if (
    profile === 'comparison' &&
    Object.hasOwn(COMPARISON_DOCS_ONLY_OVERRIDES, taskId)
  ) {
    return COMPARISON_DOCS_ONLY_OVERRIDES[
      /** @type {keyof typeof COMPARISON_DOCS_ONLY_OVERRIDES} */ (taskId)
    ]
  }
  return REFERENCE_SFCS[taskId]
}
