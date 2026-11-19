<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'

import {
  GhostAvatar,
  GhostButton,
  GhostCard,
  GhostCombobox,
  GhostComboboxContent,
  GhostComboboxEmpty,
  GhostComboboxGroup,
  GhostComboboxInput,
  GhostComboboxLabel,
  GhostComboboxOption,
  GhostField,
  GhostFieldControl,
  GhostFieldDescription,
  GhostFieldLabel,
  GhostSpinner,
  GhostSwitch,
  useGhostComboboxAsyncSearch,
  type GhostComboboxMessages,
} from '@ghostvue/themes'

interface Person {
  id: string
  name: string
  role: string
  team: string
}

// Deterministic local directory: no network, clocks, or random ids.
const directory: readonly Person[] = [
  { id: 'maya-chen', name: 'Maya Chen', role: 'Design lead', team: 'Payments' },
  {
    id: 'marcus-reed',
    name: 'Marcus Reed',
    role: 'Backend engineer',
    team: 'Payments',
  },
  {
    id: 'priya-natarajan',
    name: 'Priya Natarajan',
    role: 'Product manager',
    team: 'Checkout',
  },
  {
    id: 'jonas-weber',
    name: 'Jonas Weber',
    role: 'Frontend engineer',
    team: 'Checkout',
  },
  {
    id: 'amara-okafor',
    name: 'Amara Okafor',
    role: 'QA engineer',
    team: 'Platform',
  },
  { id: 'li-wei', name: 'Li Wei', role: 'Site reliability', team: 'Platform' },
  {
    id: 'sofia-alvarez',
    name: 'Sofia Alvarez',
    role: 'Support lead',
    team: 'Customer care',
  },
  {
    id: 'daniel-kim',
    name: 'Daniel Kim',
    role: 'Data analyst',
    team: 'Growth',
  },
  {
    id: 'hannah-moore',
    name: 'Hannah Moore',
    role: 'Engineering manager',
    team: 'Payments',
  },
  {
    id: 'tomas-novak',
    name: 'Tomas Novak',
    role: 'Security engineer',
    team: 'Platform',
  },
]

// Shown before anyone types: the team that owns the issue.
const suggested = directory.filter((person) => person.team === 'Payments')

/*
 * Stand-in for a people API. Shorter queries match more people and answer
 * more slowly, so typing quickly makes an earlier request resolve after a
 * later one. The latency depends only on the query, so the out-of-order
 * case is reproducible in tests.
 */
function latencyFor(query: string): number {
  return Math.max(120, 600 - 160 * query.length)
}

function searchPeople(query: string, offline: boolean): Promise<Person[]> {
  const needle = query.toLowerCase()
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (offline) {
        reject(new Error('Directory unavailable'))
        return
      }
      resolve(
        directory.filter((person) =>
          `${person.name} ${person.role} ${person.team}`
            .toLowerCase()
            .includes(needle),
        ),
      )
    }, latencyFor(query))
  })
}

const combobox = useTemplateRef<{ focus: () => void }>('combobox')
const assigneeId = ref<string | undefined>(undefined)
const query = ref('')
const results = ref<readonly Person[]>(suggested)
// The query the rendered results (or the error) belong to.
const resultQuery = ref('')
const loading = ref(false)
const failed = ref(false)
const offline = ref(false)
const status = ref('')

const assignee = computed(() =>
  directory.find((person) => person.id === assigneeId.value),
)

const groupLabel = computed(() =>
  resultQuery.value === '' ? 'Suggested' : 'Matching people',
)

// Live-region wording for the combobox's own polite announcer.
const messages = computed<GhostComboboxMessages>(() => ({
  loading: 'Searching people',
  empty: failed.value ? 'Could not load people' : 'No people found',
  results: (count) =>
    count === 1 ? '1 person found' : `${String(count)} people found`,
}))

const { begin, isLatest } = useGhostComboboxAsyncSearch()

async function onSearch(payload: {
  query: string
  requestId: number
}): Promise<void> {
  const { requestId } = payload
  const trimmed = payload.query.trim()
  // Every query, even an empty one, becomes the latest request, so a slower
  // response that is still in flight can never overwrite these results.
  begin(requestId)
  failed.value = false
  if (trimmed === '') {
    loading.value = false
    results.value = suggested
    resultQuery.value = ''
    return
  }
  loading.value = true
  let people: Person[] = []
  let error = false
  try {
    people = await searchPeople(trimmed, offline.value)
  } catch {
    error = true
  }
  // A newer query owns the list and the loading state.
  if (!isLatest(requestId)) return
  loading.value = false
  results.value = people
  resultQuery.value = trimmed
  failed.value = error
}

function onAssign(value: string | string[] | undefined): void {
  if (typeof value !== 'string') return
  assigneeId.value = value
  const person = directory.find((entry) => entry.id === value)
  if (person) status.value = `Assigned to ${person.name}.`
}

function unassign(): void {
  assigneeId.value = undefined
  query.value = ''
  results.value = suggested
  resultQuery.value = ''
  loading.value = false
  failed.value = false
  status.value = 'Issue is unassigned.'
  // The Unassign button leaves with the assignee, so focus moves back to
  // the search instead of falling to the page.
  combobox.value?.focus()
}
</script>

<template>
  <div class="assign">
    <GhostCard as="section" aria-label="Assign issue PAY-412">
      <template #header>
        <!--
          The heading has no id: VitePress builds the page outline from
          headings with ids, and this one belongs to the demo, not the page.
        -->
        <div class="assign__header">
          <span class="assign__key">PAY-412 · Payments</span>
          <h2 class="assign__title">Checkout rejects saved cards</h2>
        </div>
      </template>

      <div class="assign__body">
        <GhostField>
          <GhostFieldLabel>Assignee</GhostFieldLabel>
          <GhostFieldDescription>
            Search people by name, role, or team.
          </GhostFieldDescription>
          <GhostFieldControl v-slot="field">
            <GhostCombobox
              ref="combobox"
              v-model:search="query"
              :model-value="assigneeId"
              :loading="loading"
              :messages="messages"
              @update:model-value="onAssign"
              @search="onSearch"
            >
              <GhostComboboxInput
                v-bind="field"
                placeholder="Search people"
                spellcheck="false"
              />
              <GhostComboboxContent
                class="assignee-results"
                placement="bottom-start"
                :offset="6"
              >
                <!--
                  Visual only: the combobox announces "Searching people" and
                  sets aria-busy on the listbox while loading.
                -->
                <div
                  v-if="loading"
                  class="assignee-results__loading"
                  aria-hidden="true"
                >
                  <GhostSpinner size="sm" tone="neutral" />
                  Searching…
                </div>
                <GhostComboboxGroup v-else-if="results.length > 0">
                  <GhostComboboxLabel class="assignee-results__label">
                    {{ groupLabel }}
                  </GhostComboboxLabel>
                  <GhostComboboxOption
                    v-for="person in results"
                    :key="person.id"
                    :value="person.id"
                    :text-value="person.name"
                    class="assignee-option"
                  >
                    <span class="assignee-option__avatar" aria-hidden="true">
                      <GhostAvatar size="sm" :name="person.name" />
                    </span>
                    <span class="assignee-option__text">
                      <span class="assignee-option__name">
                        {{ person.name }}
                      </span>
                      <span class="assignee-option__meta">
                        {{ person.role }} · {{ person.team }}
                      </span>
                    </span>
                    <svg
                      v-if="person.id === assigneeId"
                      class="assignee-option__check"
                      aria-hidden="true"
                      viewBox="0 0 16 16"
                    >
                      <path d="M3.5 8.5l3 3 6-7" />
                    </svg>
                  </GhostComboboxOption>
                </GhostComboboxGroup>
                <GhostComboboxEmpty class="assignee-results__empty">
                  <template v-if="failed">
                    <strong class="assignee-results__empty-title">
                      Couldn’t reach the directory
                    </strong>
                    <span>Go back online, then edit the search to retry.</span>
                  </template>
                  <template v-else>
                    <strong class="assignee-results__empty-title">
                      No one matches “{{ resultQuery }}”
                    </strong>
                    <span>Try a first name, a role, or a team.</span>
                  </template>
                </GhostComboboxEmpty>
              </GhostComboboxContent>
            </GhostCombobox>
          </GhostFieldControl>
        </GhostField>

        <div class="assign__current">
          <span class="assign__current-label">Current assignee</span>
          <div v-if="assignee" class="assign__person">
            <span class="assign__avatar" aria-hidden="true">
              <GhostAvatar :name="assignee.name" />
            </span>
            <span class="assign__person-text">
              <span class="assign__person-name">{{ assignee.name }}</span>
              <span class="assign__person-meta">
                {{ assignee.role }} · {{ assignee.team }}
              </span>
            </span>
            <GhostButton
              variant="ghost"
              tone="neutral"
              size="sm"
              :aria-label="`Unassign ${assignee.name}`"
              @click="unassign"
            >
              Unassign
            </GhostButton>
          </div>
          <span v-else class="assign__unassigned">Unassigned</span>
        </div>
      </div>

      <template #footer>
        <div class="assign__footer">
          <p class="assign__status" role="status">{{ status }}</p>
          <div class="assign__offline">
            <label class="assign__offline-label" for="assignee-offline">
              Simulate offline
            </label>
            <GhostSwitch id="assignee-offline" v-model="offline" />
          </div>
        </div>
      </template>
    </GhostCard>
  </div>
</template>

<style scoped>
/* The card owns its width and shrinks with the preview on phones. */
.assign {
  max-inline-size: 40rem;
}

.assign__header {
  display: grid;
  gap: var(--ghost-space-gap-xs);
  min-inline-size: 0;
  padding-block-end: var(--ghost-space-stack-sm);
}

/* Native text picks up docs prose styles, so each element resets its own. */
.assign__key,
.assign__current-label {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-xs);
  font-weight: var(--ghost-type-weight-medium);
  line-height: var(--ghost-type-line-snug);
}

.assign__title {
  border: 0;
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-lg);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-tight);
  margin: 0;
  overflow-wrap: anywhere;
  padding: 0;
}

/*
 * Search and the current assignee stack on narrow previews and sit side by
 * side once each column can keep a readable measure.
 */
.assign__body {
  display: grid;
  gap: var(--ghost-space-stack-lg);
}

@container ghost-demo (min-width: 32rem) {
  .assign__body {
    align-items: start;
    grid-template-columns: minmax(0, 1fr) minmax(0, 14rem);
  }
}

.assign__current {
  border: var(--ghost-border-hairline-width) solid var(--ghost-border-default);
  border-radius: var(--ghost-radius-md);
  display: grid;
  gap: var(--ghost-space-gap-sm);
  min-inline-size: 0;
  padding: var(--ghost-space-inset-sm);
}

.assign__person {
  align-items: center;
  column-gap: var(--ghost-space-gap-sm);
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
}

.assign__avatar {
  display: flex;
}

.assign__person-text {
  display: grid;
  min-inline-size: 0;
}

.assign__person-name {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-sm);
  font-weight: var(--ghost-type-weight-medium);
  line-height: var(--ghost-type-line-snug);
  overflow-wrap: anywhere;
}

.assign__person-meta,
.assign__unassigned {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-xs);
  line-height: var(--ghost-type-line-snug);
  overflow-wrap: anywhere;
}

.assign__unassigned {
  font-size: var(--ghost-type-size-sm);
}

.assign__footer {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm) var(--ghost-space-gap-md);
  justify-content: flex-end;
}

.assign__status {
  color: var(--ghost-text-muted);
  flex: 1 1 12rem;
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-snug);
  margin: 0;
}

.assign__offline {
  align-items: center;
  display: flex;
  gap: var(--ghost-space-gap-sm);
}

.assign__offline-label {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-snug);
}
</style>

<style>
/*
 * Unscoped on purpose: these classes land on the listbox content and its
 * options inside a body portal, where a scoped attribute is not guaranteed.
 * Prefixed so they cannot collide with page styles.
 *
 * The list keeps a readable fixed measure, capped to the viewport on phones.
 * Highlight and selection only recolor rows, so pointer and keyboard
 * movement never shift layout.
 */
.assignee-results {
  inline-size: min(22rem, calc(100vw - 2 * var(--ghost-space-inset-lg)));
}

.assignee-results__label {
  font-size: var(--ghost-type-size-xs);
  font-weight: var(--ghost-type-weight-medium);
}

.assignee-results__loading {
  align-items: center;
  color: var(--ghost-text-muted);
  display: flex;
  font-size: var(--ghost-type-size-sm);
  gap: var(--ghost-space-gap-sm);
  padding: var(--ghost-space-inset-sm);
}

.assignee-results__empty {
  display: grid;
  font-size: var(--ghost-type-size-sm);
  gap: var(--ghost-space-gap-xs);
  line-height: var(--ghost-type-line-snug);
}

.assignee-results__empty-title {
  color: var(--ghost-text-default);
  font-weight: var(--ghost-type-weight-medium);
}

.assignee-option {
  align-items: center;
  column-gap: var(--ghost-space-gap-sm);
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) 1rem;
}

.assignee-option__avatar {
  display: flex;
}

.assignee-option__text {
  display: grid;
  min-inline-size: 0;
}

.assignee-option__name {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-snug);
}

.assignee-option__meta {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-xs);
  line-height: var(--ghost-type-line-snug);
}

.assignee-option__check {
  block-size: 1rem;
  fill: none;
  inline-size: 1rem;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.75;
}
</style>
