<script setup lang="ts">
import { computed, ref, useId } from 'vue'

import {
  GhostAvatar,
  GhostBadge,
  GhostButton,
  GhostCard,
  GhostPopover,
  GhostPopoverClose,
  GhostPopoverContent,
  GhostPopoverTrigger,
  GhostRadioGroup,
  GhostRadioGroupItem,
  GhostSegmentedControl,
  GhostSegmentedControlItem,
  GhostSwitch,
} from '@ghostvue/themes'

type Access = 'restricted' | 'workspace' | 'link'
type LinkRole = 'view' | 'comment' | 'edit'

interface Collaborator {
  name: string
  email: string
  role: 'Owner' | 'Editor' | 'Viewer'
}

/*
 * Deterministic seed data. Settings apply as soon as they change, the way
 * sharing panels in document tools usually behave, so there is no Save step:
 * the card summary, a polite live region, always reflects the current state.
 */
const collaborators: readonly Collaborator[] = [
  { name: 'Priya Patel', email: 'priya@northwind.example', role: 'Owner' },
  { name: 'Marcus Chen', email: 'marcus@northwind.example', role: 'Editor' },
  { name: 'Lena Vogel', email: 'lena@northwind.example', role: 'Viewer' },
]

const accessOptions: readonly {
  value: Access
  label: string
  hint: string
}[] = [
  {
    value: 'restricted',
    label: 'Restricted',
    hint: 'Only the people listed on the plan.',
  },
  {
    value: 'workspace',
    label: 'Northwind workspace',
    hint: 'Anyone signed in at Northwind.',
  },
  {
    value: 'link',
    label: 'Anyone with the link',
    hint: 'No sign-in needed.',
  },
]

const roleLabels: Record<LinkRole, string> = {
  view: 'view',
  comment: 'comment on',
  edit: 'edit',
}

const access = ref<Access>('restricted')
const linkRole = ref<LinkRole>('view')
const allowReshare = ref(true)
const allowDownload = ref(false)

const headingId = useId()
const restricted = computed(() => access.value === 'restricted')

const policy = computed(() => {
  const invite = allowReshare.value
    ? 'Editors can invite others'
    : 'Only the owner can invite'
  const download = allowDownload.value
    ? 'viewers can download'
    : 'downloads are off for viewers'
  return `${invite}; ${download}.`
})

const summary = computed(() => {
  if (restricted.value) return 'Only the 3 people listed can open this plan.'
  const audience =
    access.value === 'workspace'
      ? 'Anyone at Northwind'
      : 'Anyone with the link'
  return `${audience} can ${roleLabels[linkRole.value]} this plan.`
})

function isAccess(value: string): value is Access {
  return accessOptions.some((option) => option.value === value)
}

function isLinkRole(value: unknown): value is LinkRole {
  return value === 'view' || value === 'comment' || value === 'edit'
}

function setAccess(value: string): void {
  if (isAccess(value)) access.value = value
}

function setLinkRole(value: unknown): void {
  // Segmented controls emit `undefined` when deselectable; this one is not, but
  // the guard keeps the role a known value either way.
  if (isLinkRole(value)) linkRole.value = value
}
</script>

<template>
  <GhostCard class="share">
    <template #header>
      <div class="share__header">
        <h2 class="share__title">Q3 launch plan</h2>
        <p class="share__meta">Planning doc · Edited today by Priya Patel</p>
      </div>
    </template>

    <ul class="share__people" aria-label="People with access">
      <li
        v-for="person in collaborators"
        :key="person.email"
        class="share__person"
      >
        <GhostAvatar :name="person.name" />
        <div class="share__identity">
          <span class="share__name">{{ person.name }}</span>
          <span class="share__email">{{ person.email }}</span>
        </div>
        <GhostBadge :tone="person.role === 'Owner' ? 'accent' : 'neutral'">
          {{ person.role }}
        </GhostBadge>
      </li>
    </ul>

    <template #footer>
      <div class="share__footer">
        <!--
          The summary is the polite live region, so each change is announced
          as its outcome (who can open the plan and what they can do) while the
          control itself reports its own new state.
        -->
        <div class="share__state" role="status">
          <p class="share__summary">{{ summary }}</p>
          <p class="share__policy">{{ policy }}</p>
        </div>

        <GhostPopover>
          <GhostPopoverTrigger :as="GhostButton" variant="outline">
            Share
          </GhostPopoverTrigger>
          <!--
            The panel names itself after its heading rather than the one-word
            trigger, so assistive tech announces what the settings belong to.
            Keep it next to Share in the DOM so Tab continues through the page
            in reading order when it leaves the non-modal panel. Position the
            panel against the viewport so the card cannot clip it.
          -->
          <GhostPopoverContent
            :portal="false"
            :offset="8"
            :shift="{ padding: 8 }"
            :flip="{ padding: 8 }"
            placement="bottom-end"
            strategy="fixed"
            :aria-labelledby="headingId"
          >
            <div class="share-panel">
              <div class="share-panel__header">
                <p :id="headingId" class="share-panel__title">
                  Share “Q3 launch plan”
                </p>
                <p class="share-panel__copy">Changes apply right away.</p>
              </div>

              <GhostRadioGroup
                :model-value="access"
                name="general-access"
                class="share-panel__options"
                @update:model-value="setAccess"
              >
                <legend class="share-panel__label">General access</legend>
                <label
                  v-for="option in accessOptions"
                  :key="option.value"
                  class="share-panel__option"
                >
                  <GhostRadioGroupItem :value="option.value" />
                  <span class="share-panel__option-text">
                    <span class="share-panel__option-label">
                      {{ option.label }}
                    </span>
                    <span class="share-panel__hint">{{ option.hint }}</span>
                  </span>
                </label>
              </GhostRadioGroup>

              <div class="share-panel__group">
                <span :id="`${headingId}-role`" class="share-panel__label">
                  Link permission
                </span>
                <GhostSegmentedControl
                  :model-value="linkRole"
                  :disabled="restricted"
                  :aria-labelledby="`${headingId}-role`"
                  :aria-describedby="
                    restricted ? `${headingId}-role-hint` : undefined
                  "
                  class="share-panel__roles"
                  @update:model-value="setLinkRole"
                >
                  <GhostSegmentedControlItem value="view">
                    Viewer
                  </GhostSegmentedControlItem>
                  <GhostSegmentedControlItem value="comment">
                    Commenter
                  </GhostSegmentedControlItem>
                  <GhostSegmentedControlItem value="edit">
                    Editor
                  </GhostSegmentedControlItem>
                </GhostSegmentedControl>
                <p
                  v-if="restricted"
                  :id="`${headingId}-role-hint`"
                  class="share-panel__hint"
                >
                  Available with workspace or link access.
                </p>
              </div>

              <div class="share-panel__switches">
                <label
                  :for="`${headingId}-reshare`"
                  class="share-panel__switch-label"
                >
                  Editors can invite others
                </label>
                <GhostSwitch
                  :id="`${headingId}-reshare`"
                  v-model="allowReshare"
                />
                <label
                  :for="`${headingId}-download`"
                  class="share-panel__switch-label"
                >
                  Viewers can download
                </label>
                <GhostSwitch
                  :id="`${headingId}-download`"
                  v-model="allowDownload"
                />
              </div>

              <div class="share-panel__actions">
                <GhostPopoverClose :as="GhostButton" size="sm">
                  Done
                </GhostPopoverClose>
              </div>
            </div>
          </GhostPopoverContent>
        </GhostPopover>
      </div>
    </template>
  </GhostCard>
</template>

<style scoped>
/* The card owns its width and shrinks with the preview on phones. */
.share {
  max-inline-size: 34rem;
}

.share__header {
  display: grid;
  gap: var(--ghost-space-gap-xs);
  min-inline-size: 0;
  padding-block-end: var(--ghost-space-stack-sm);
}

/* Native text picks up docs prose styles, so each element resets its own. */
.share__title {
  border: 0;
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-lg);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-tight);
  margin: 0;
  padding: 0;
}

.share__meta,
.share__summary,
.share__policy {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-snug);
  margin: 0;
}

.share__summary {
  color: var(--ghost-text-default);
}

.share__people {
  display: grid;
  gap: var(--ghost-space-stack-sm);
  list-style: none;
  margin: 0;
  padding: 0;
}

/* Name and email take the free space; the role badge keeps its size. */
.share__person {
  align-items: center;
  display: grid;
  gap: var(--ghost-space-gap-md);
  grid-template-columns: auto minmax(0, 1fr) auto;
  margin: 0;
}

.share__identity {
  display: grid;
  min-inline-size: 0;
}

.share__name {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-sm);
  font-weight: var(--ghost-type-weight-medium);
  line-height: var(--ghost-type-line-snug);
}

.share__email {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-xs);
  line-height: var(--ghost-type-line-snug);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.share__footer {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm) var(--ghost-space-gap-md);
  justify-content: flex-end;
}

.share__state {
  display: grid;
  flex: 1 1 14rem;
  gap: var(--ghost-space-gap-xs);
  min-inline-size: 0;
}

/*
 * Set the panel type locally so it reads the same inside the docs and in the
 * playground. Bound the width to leave room for the surface padding and the
 * shift middleware's edge gap on 320px phones.
 */
.share-panel {
  color: var(--ghost-text-default);
  display: grid;
  font-size: var(--ghost-type-size-sm);
  gap: var(--ghost-space-stack-sm);
  inline-size: min(20rem, 100vw - 4rem);
  line-height: var(--ghost-type-line-snug);
}

.share-panel__header {
  display: grid;
  gap: var(--ghost-space-gap-xs);
}

.share-panel__title {
  font-size: var(--ghost-type-size-md);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-tight);
  margin: 0;
  overflow-wrap: anywhere;
}

.share-panel__copy,
.share-panel__hint {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-xs);
  line-height: var(--ghost-type-line-snug);
  margin: 0;
}

.share-panel__label {
  font-size: var(--ghost-type-size-xs);
  font-weight: var(--ghost-type-weight-semibold);
  padding: 0;
}

/* Overrides the theme's flex column gap only; the fieldset reset stays. */
.share-panel__options {
  gap: var(--ghost-space-gap-xs);
}

.share-panel__option {
  align-items: start;
  cursor: pointer;
  display: grid;
  gap: var(--ghost-space-gap-xs);
  grid-template-columns: auto minmax(0, 1fr);
}

/* Line the text up with the radio's centered dot inside its hit area. */
.share-panel__option-text {
  display: grid;
  min-block-size: var(--ghost-control-size-md-min);
  align-content: center;
}

.share-panel__option-label {
  font-weight: var(--ghost-type-weight-medium);
}

.share-panel__group {
  display: grid;
  gap: var(--ghost-space-gap-xs);
}

/*
 * The theme's segments already flex equally; a block-level flex root lets
 * the three share the full panel width instead of sizing to their labels.
 */
.share-panel__roles {
  display: flex;
}

.share-panel__switches {
  align-items: center;
  border-block-start: var(--ghost-border-hairline-width) solid
    var(--ghost-border-default);
  display: grid;
  gap: var(--ghost-space-gap-sm) var(--ghost-space-gap-md);
  grid-template-columns: minmax(0, 1fr) auto;
  padding-block-start: var(--ghost-space-stack-sm);
}

.share-panel__switch-label {
  cursor: pointer;
}

.share-panel__actions {
  display: flex;
  justify-content: flex-end;
}
</style>
