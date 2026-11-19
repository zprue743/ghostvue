<script setup lang="ts">
import { computed, ref, useId } from 'vue'

import {
  GhostButton,
  GhostDropdownMenu,
  GhostDropdownMenuCheckboxItem,
  GhostDropdownMenuContent,
  GhostDropdownMenuGroup,
  GhostDropdownMenuItem,
  GhostDropdownMenuLabel,
  GhostDropdownMenuRadioGroup,
  GhostDropdownMenuRadioItem,
  GhostDropdownMenuSeparator,
  GhostDropdownMenuTrigger,
} from '@ghostvue/themes'

type Sort = 'newest' | 'oldest' | 'sender'

const defaults = { unreadFirst: true, previews: true, sort: 'newest' } as const

const unreadFirst = ref<boolean>(defaults.unreadFirst)
const previews = ref<boolean>(defaults.previews)
const sort = ref<Sort>(defaults.sort)

const sortOptions: readonly { value: Sort; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'sender', label: 'Sender A–Z' },
]
const showLabelId = useId()
const sortLabelId = useId()

const summary = computed(() =>
  [
    sortOptions.find((option) => option.value === sort.value)?.label,
    unreadFirst.value ? 'unread on top' : null,
    previews.value ? 'previews on' : 'previews off',
  ]
    .filter(Boolean)
    .join(' · '),
)

// The radio group emits plain strings; accept only the options listed above.
function setSort(value: string): void {
  const option = sortOptions.find((candidate) => candidate.value === value)
  if (option) sort.value = option.value
}

function resetView(): void {
  unreadFirst.value = defaults.unreadFirst
  previews.value = defaults.previews
  sort.value = defaults.sort
}
</script>

<template>
  <div class="inbox-bar">
    <div class="inbox-bar__summary">
      <span class="inbox-bar__title">Inbox</span>
      <span class="inbox-bar__meta">{{ summary }}</span>
    </div>
    <GhostDropdownMenu>
      <GhostDropdownMenuTrigger
        :as="GhostButton"
        variant="outline"
        tone="neutral"
      >
        View
      </GhostDropdownMenuTrigger>
      <GhostDropdownMenuContent placement="bottom-end" :offset="4">
        <GhostDropdownMenuGroup :aria-labelledby="showLabelId">
          <GhostDropdownMenuLabel :id="showLabelId"
            >Show</GhostDropdownMenuLabel
          >
          <!--
            The theme does not draw a check mark, so each item renders its own
            indicator. aria-checked already carries the state; the glyph is
            hidden from assistive technology.
          -->
          <GhostDropdownMenuCheckboxItem v-model:checked="unreadFirst">
            <span class="view-menu__check" aria-hidden="true">
              {{ unreadFirst ? '✓' : '' }}
            </span>
            Unread on top
          </GhostDropdownMenuCheckboxItem>
          <GhostDropdownMenuCheckboxItem v-model:checked="previews">
            <span class="view-menu__check" aria-hidden="true">
              {{ previews ? '✓' : '' }}
            </span>
            Message previews
          </GhostDropdownMenuCheckboxItem>
        </GhostDropdownMenuGroup>
        <GhostDropdownMenuSeparator />
        <GhostDropdownMenuLabel :id="sortLabelId"
          >Sort by</GhostDropdownMenuLabel
        >
        <GhostDropdownMenuRadioGroup
          :model-value="sort"
          :aria-labelledby="sortLabelId"
          @update:model-value="setSort"
        >
          <GhostDropdownMenuRadioItem
            v-for="option in sortOptions"
            :key="option.value"
            :value="option.value"
          >
            <span class="view-menu__check" aria-hidden="true">
              {{ sort === option.value ? '●' : '' }}
            </span>
            {{ option.label }}
          </GhostDropdownMenuRadioItem>
        </GhostDropdownMenuRadioGroup>
        <GhostDropdownMenuSeparator />
        <GhostDropdownMenuItem @select="resetView">
          <span class="view-menu__check" aria-hidden="true" />
          Reset view
        </GhostDropdownMenuItem>
      </GhostDropdownMenuContent>
    </GhostDropdownMenu>
  </div>
</template>

<style scoped>
/* The summary takes the free space; the View trigger stays at the end. */
.inbox-bar {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm) var(--ghost-space-gap-md);
  justify-content: space-between;
  max-inline-size: 36rem;
}

.inbox-bar__summary {
  display: grid;
  flex: 1 1 12rem;
  gap: var(--ghost-space-gap-xs);
  min-inline-size: 0;
}

.inbox-bar__title {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-md);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-snug);
}

.inbox-bar__meta {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-normal);
}

/* A fixed-width slot keeps labels aligned whether or not an item is checked. */
.view-menu__check {
  flex: none;
  inline-size: 1em;
  text-align: center;
}
</style>
