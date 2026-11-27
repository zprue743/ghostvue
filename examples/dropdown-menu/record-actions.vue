<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue'

import {
  GhostBadge,
  GhostButton,
  GhostCard,
  GhostDropdownMenu,
  GhostDropdownMenuContent,
  GhostDropdownMenuGroup,
  GhostDropdownMenuItem,
  GhostDropdownMenuSeparator,
  GhostDropdownMenuTrigger,
  GhostInput,
} from '@ghostvue/themes'

type BriefStatus = 'draft' | 'published'

interface Brief {
  id: string
  title: string
  owner: string
  updated: string
  status: BriefStatus
}

// Deterministic seed data: no clocks or random ids, so every render matches.
const records = ref<Brief[]>([
  {
    id: 'spring-launch',
    title: 'Spring launch brief',
    owner: 'Maya Chen',
    updated: 'Nov 12',
    status: 'published',
  },
  {
    id: 'pricing-refresh',
    title: 'Pricing page refresh',
    owner: 'Jonas Weber',
    updated: 'Nov 14',
    status: 'draft',
  },
  {
    id: 'onboarding-emails',
    title: 'Onboarding email series',
    owner: 'Priya Natarajan',
    updated: 'Nov 18',
    status: 'draft',
  },
])

const root = useTemplateRef<HTMLElement>('root')
const status = ref('')
const editingId = ref<string | null>(null)
const draftTitle = ref('')
// Only the latest archive can be undone, at the position it left.
const lastArchived = ref<{ record: Brief; index: number } | null>(null)
let copies = 0

const summary = computed(() => {
  const count = records.value.length
  const published = records.value.filter(
    (record) => record.status === 'published',
  ).length
  return `${String(count)} active · ${String(published)} published`
})

/*
 * A menu item closes the menu, and the menu returns focus to its trigger in
 * the same update. Waiting one tick lets that finish before focus moves to the
 * target the action calls for (the title field, or a neighbouring row when
 * the row that owned the trigger is gone).
 */
async function focusAfterUpdate(selector: string): Promise<void> {
  await nextTick()
  root.value?.querySelector<HTMLElement>(selector)?.focus()
}

function triggerSelector(id: string): string {
  return `[data-record-trigger="${id}"]`
}

function startEdit(record: Brief): void {
  editingId.value = record.id
  draftTitle.value = record.title
  status.value = ''
  void focusAfterUpdate('[data-record-title-input]')
}

function finishEdit(record: Brief, save: boolean): void {
  const title = draftTitle.value.trim()
  if (save && title !== '' && title !== record.title) {
    record.title = title
    record.updated = 'Just now'
    status.value = `Renamed to “${title}”.`
  } else if (save && title === '') {
    // An empty title is not saved; keep editing so the user can fix it.
    status.value = 'Enter a title to save.'
    return
  }
  editingId.value = null
  void focusAfterUpdate(triggerSelector(record.id))
}

function duplicate(record: Brief): void {
  copies += 1
  const index = records.value.indexOf(record)
  records.value.splice(index + 1, 0, {
    ...record,
    id: `${record.id}-copy-${String(copies)}`,
    title: `${record.title} (copy)`,
    updated: 'Just now',
    status: 'draft',
  })
  status.value = `Duplicated “${record.title}” as a draft.`
}

function toggleStatus(record: Brief): void {
  record.status = record.status === 'draft' ? 'published' : 'draft'
  record.updated = 'Just now'
  status.value =
    record.status === 'published'
      ? `Published “${record.title}”.`
      : `Moved “${record.title}” back to drafts.`
}

function archive(record: Brief): void {
  const index = records.value.indexOf(record)
  if (index === -1) return
  records.value.splice(index, 1)
  lastArchived.value = { record, index }
  if (editingId.value === record.id) editingId.value = null
  status.value = `Archived “${record.title}”.`
  // The trigger left with its row: focus the row that took its place, the one
  // before it, or Undo when the list is empty.
  const next = records.value[index] ?? records.value[index - 1]
  void focusAfterUpdate(next ? triggerSelector(next.id) : '[data-record-undo]')
}

function undoArchive(): void {
  const archived = lastArchived.value
  if (!archived) return
  records.value.splice(
    Math.min(archived.index, records.value.length),
    0,
    archived.record,
  )
  lastArchived.value = null
  status.value = `Restored “${archived.record.title}”.`
  void focusAfterUpdate(triggerSelector(archived.record.id))
}
</script>

<template>
  <div ref="root" class="briefs">
    <GhostCard>
      <template #header>
        <!--
          The heading has no id: VitePress builds the page outline from
          headings with ids, and this one belongs to the demo, not the page.
        -->
        <div class="briefs__header">
          <h2 class="briefs__title">Launch briefs</h2>
          <p class="briefs__summary">{{ summary }}</p>
        </div>
      </template>

      <ul
        v-if="records.length > 0"
        class="briefs__list"
        aria-label="Launch briefs"
      >
        <li v-for="record in records" :key="record.id" class="briefs__row">
          <form
            v-if="editingId === record.id"
            class="briefs__edit"
            @submit.prevent="finishEdit(record, true)"
            @keydown.esc.stop="finishEdit(record, false)"
          >
            <div class="briefs__edit-field">
              <GhostInput
                v-model="draftTitle"
                aria-label="Brief title"
                name="title"
                autocomplete="off"
                size="sm"
                block
                data-record-title-input
              />
            </div>
            <div class="briefs__edit-actions">
              <GhostButton
                variant="ghost"
                tone="neutral"
                size="sm"
                @click="finishEdit(record, false)"
              >
                Cancel
              </GhostButton>
              <GhostButton type="submit" size="sm">Save</GhostButton>
            </div>
          </form>

          <template v-else>
            <div class="briefs__record">
              <span class="briefs__name">{{ record.title }}</span>
              <span class="briefs__meta">
                {{ record.owner }} · Updated {{ record.updated }}
              </span>
            </div>
            <span class="briefs__badge">
              <GhostBadge
                :tone="record.status === 'published' ? 'accent' : 'neutral'"
              >
                {{ record.status === 'published' ? 'Published' : 'Draft' }}
              </GhostBadge>
            </span>
            <GhostDropdownMenu>
              <!-- Icon-only, so the accessible name carries the record title. -->
              <GhostDropdownMenuTrigger
                :as="GhostButton"
                variant="ghost"
                tone="neutral"
                size="sm"
                icon-only
                :aria-label="`Actions for ${record.title}`"
                :data-record-trigger="record.id"
              >
                <svg
                  data-part="icon"
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  width="16"
                  height="16"
                >
                  <circle cx="3" cy="8" r="1.25" fill="currentColor" />
                  <circle cx="8" cy="8" r="1.25" fill="currentColor" />
                  <circle cx="13" cy="8" r="1.25" fill="currentColor" />
                </svg>
              </GhostDropdownMenuTrigger>
              <!--
              bottom-end keeps the panel under the trigger at the row's end;
              flip and shift (on by default) keep it inside the viewport when
              the row sits near the bottom or the inline edge.
            -->
              <GhostDropdownMenuContent
                class="record-menu"
                placement="bottom-end"
                :offset="4"
              >
                <GhostDropdownMenuGroup aria-label="Edit">
                  <GhostDropdownMenuItem @select="startEdit(record)">
                    <svg
                      class="record-menu__icon"
                      aria-hidden="true"
                      viewBox="0 0 16 16"
                    >
                      <path d="M10.5 3l2.5 2.5L6 12.5H3.5V10z" />
                    </svg>
                    Edit title
                  </GhostDropdownMenuItem>
                  <GhostDropdownMenuItem @select="duplicate(record)">
                    <svg
                      class="record-menu__icon"
                      aria-hidden="true"
                      viewBox="0 0 16 16"
                    >
                      <path d="M5.5 5.5h7v7h-7z M3.5 10.5v-7h7" />
                    </svg>
                    Duplicate
                  </GhostDropdownMenuItem>
                </GhostDropdownMenuGroup>
                <GhostDropdownMenuSeparator />
                <GhostDropdownMenuGroup aria-label="Status">
                  <GhostDropdownMenuItem @select="toggleStatus(record)">
                    <svg
                      class="record-menu__icon"
                      aria-hidden="true"
                      viewBox="0 0 16 16"
                    >
                      <path
                        v-if="record.status === 'draft'"
                        d="M8 11V3M4.5 6.5L8 3l3.5 3.5M3 13h10"
                      />
                      <path v-else d="M3 4h10M3 8h10M3 12h6" />
                    </svg>
                    {{
                      record.status === 'draft' ? 'Publish' : 'Move to drafts'
                    }}
                  </GhostDropdownMenuItem>
                </GhostDropdownMenuGroup>
                <GhostDropdownMenuSeparator />
                <!-- Destructive: set apart last, in the danger text color. -->
                <GhostDropdownMenuItem
                  class="record-menu__danger"
                  @select="archive(record)"
                >
                  <svg
                    class="record-menu__icon"
                    aria-hidden="true"
                    viewBox="0 0 16 16"
                  >
                    <path d="M2.5 3.5h11v3h-11z M3.5 6.5v6h9v-6 M6.5 9h3" />
                  </svg>
                  Archive
                </GhostDropdownMenuItem>
              </GhostDropdownMenuContent>
            </GhostDropdownMenu>
          </template>
        </li>
      </ul>
      <p v-else class="briefs__empty">No active briefs.</p>

      <template #footer>
        <div class="briefs__footer">
          <p class="briefs__status" role="status">{{ status }}</p>
          <GhostButton
            v-if="lastArchived"
            variant="outline"
            tone="neutral"
            size="sm"
            data-record-undo
            @click="undoArchive"
          >
            Undo archive
          </GhostButton>
        </div>
      </template>
    </GhostCard>
  </div>
</template>

<style scoped>
/* The card owns its width and shrinks with the preview on phones. */
.briefs {
  max-inline-size: 36rem;
}

.briefs__header {
  display: grid;
  gap: var(--ghost-space-gap-xs);
  min-inline-size: 0;
}

/* Native text picks up docs prose styles, so each element resets its own. */
.briefs__title {
  border: 0;
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-lg);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-tight);
  margin: 0;
  padding: 0;
}

.briefs__summary,
.briefs__status,
.briefs__empty {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-snug);
  margin: 0;
}

.briefs__list {
  display: grid;
  list-style: none;
  margin: 0;
  padding: 0;
}

/*
 * Title and meta take the free space; the badge and the trigger keep their
 * size at the row's end. Below about 22rem the badge drops under the title so
 * the trigger never leaves the row.
 */
.briefs__row {
  align-items: center;
  border-block-start: var(--ghost-border-hairline-width) solid
    var(--ghost-border-default);
  column-gap: var(--ghost-space-gap-md);
  display: grid;
  grid-template-areas:
    'record trigger'
    'badge trigger';
  grid-template-columns: minmax(0, 1fr) auto;
  margin: 0;
  padding-block: var(--ghost-space-stack-sm);
  row-gap: var(--ghost-space-gap-xs);
}

.briefs__row:first-child {
  border-block-start: 0;
}

.briefs__record {
  display: grid;
  gap: var(--ghost-space-gap-xs);
  grid-area: record;
  min-inline-size: 0;
}

.briefs__badge {
  display: flex;
  grid-area: badge;
  justify-content: flex-start;
}

.briefs__row > :deep([data-part='trigger']) {
  grid-area: trigger;
}

@container ghost-demo (min-width: 22rem) {
  .briefs__row {
    grid-template-areas: 'record badge trigger';
    grid-template-columns: minmax(0, 1fr) auto auto;
  }

  .briefs__badge {
    justify-content: flex-end;
  }
}

.briefs__name {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-sm);
  font-weight: var(--ghost-type-weight-medium);
  line-height: var(--ghost-type-line-snug);
  overflow-wrap: anywhere;
}

.briefs__meta {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-xs);
  line-height: var(--ghost-type-line-snug);
  overflow-wrap: anywhere;
}

.briefs__edit {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm);
  grid-column: 1 / -1;
  margin: 0;
}

.briefs__edit-field {
  flex: 1 1 12rem;
  min-inline-size: 0;
}

.briefs__edit-actions {
  display: flex;
  gap: var(--ghost-space-gap-sm);
  margin-inline-start: auto;
}

.briefs__footer {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm) var(--ghost-space-gap-md);
  justify-content: flex-end;
}

.briefs__status {
  flex: 1 1 auto;
}

.record-menu__icon {
  block-size: 1rem;
  fill: none;
  flex: none;
  inline-size: 1rem;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.5;
}
</style>

<style>
/* Keep the entire portaled surface opaque as soon as the menu opens so
 * Archive keeps its danger-text contrast against the menu background.
 * The theme supplies the scale entrance only when motion is enabled. */
.record-menu[data-state='open'] {
  transition-property: scale;
}

/*
 * Unscoped on purpose: the class lands on a menu item component's root inside
 * a body portal, where a scoped attribute is not guaranteed. The destructive
 * action keeps the theme's item geometry and focus ring and changes only
 * color, so hover and focus never shift layout.
 */
.record-menu__danger {
  color: var(--ghost-text-danger);
}

.record-menu__danger:hover,
.record-menu__danger:focus-visible {
  background-color: var(--ghost-status-danger-bg);
  color: var(--ghost-status-danger-fg);
}
</style>
