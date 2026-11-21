<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostBadge,
  GhostCard,
  GhostContextMenu,
  GhostContextMenuCheckboxItem,
  GhostContextMenuContent,
  GhostContextMenuItem,
  GhostContextMenuLabel,
  GhostContextMenuRadioGroup,
  GhostContextMenuRadioItem,
  GhostContextMenuSeparator,
  GhostContextMenuTrigger,
} from '@ghostvue/themes'

interface ProjectFile {
  id: string
  name: string
  kind: string
  updated: string
  pinned: boolean
}

const files = ref<ProjectFile[]>([
  {
    id: 'launch-brief',
    name: 'Q3 launch brief.md',
    kind: 'Markdown · 14 KB',
    updated: 'Updated 2h ago',
    pinned: true,
  },
  {
    id: 'token-audit',
    name: 'Token audit.csv',
    kind: 'Spreadsheet · 48 KB',
    updated: 'Updated yesterday',
    pinned: false,
  },
  {
    id: 'release-checklist',
    name: 'Release checklist.md',
    kind: 'Markdown · 8 KB',
    updated: 'Updated Nov 12',
    pinned: false,
  },
])

const density = ref<'compact' | 'comfortable'>('comfortable')
const statusMessage = ref(
  'Right-click any file row or press Shift+F10 for actions.',
)

function openFile(file: ProjectFile): void {
  statusMessage.value = `Opened "${file.name}".`
}

function duplicateFile(file: ProjectFile): void {
  statusMessage.value = `Duplicated "${file.name}".`
}

function setPinned(file: ProjectFile, pinned: boolean): void {
  file.pinned = pinned
  statusMessage.value = pinned
    ? `Pinned "${file.name}".`
    : `Unpinned "${file.name}".`
}

function setDensity(value: string): void {
  if (value === 'compact' || value === 'comfortable') {
    density.value = value
    statusMessage.value = `Row density set to ${value}.`
  }
}
</script>

<template>
  <GhostCard class="file-browser" :data-density="density">
    <template #header>
      <div class="file-browser__header">
        <span class="file-browser__title">Project files</span>
        <GhostBadge tone="neutral" variant="soft">
          {{ files.filter((file) => file.pinned).length }} pinned
        </GhostBadge>
      </div>
    </template>

    <ul class="file-browser__list" aria-label="Project files">
      <li v-for="file in files" :key="file.id" class="file-browser__item">
        <GhostContextMenu>
          <GhostContextMenuTrigger
            class="file-browser__row"
            data-testid="context-themed-trigger"
            tabindex="0"
          >
            <span class="file-browser__name">
              <span>{{ file.name }}</span>
              <GhostBadge v-if="file.pinned" tone="accent" variant="soft">
                Pinned
              </GhostBadge>
            </span>
            <span class="file-browser__meta">
              {{ file.kind }} · {{ file.updated }}
            </span>
          </GhostContextMenuTrigger>

          <GhostContextMenuContent data-testid="context-themed-content">
            <GhostContextMenuLabel>{{ file.name }}</GhostContextMenuLabel>
            <GhostContextMenuSeparator decorative />
            <GhostContextMenuItem @select="openFile(file)">
              <span class="context-menu__indicator" aria-hidden="true" />
              Open
            </GhostContextMenuItem>
            <GhostContextMenuItem @select="duplicateFile(file)">
              <span class="context-menu__indicator" aria-hidden="true" />
              Duplicate
            </GhostContextMenuItem>
            <GhostContextMenuSeparator decorative />
            <GhostContextMenuCheckboxItem
              :checked="file.pinned"
              @update:checked="setPinned(file, $event)"
            >
              <span class="context-menu__indicator" aria-hidden="true">
                {{ file.pinned ? '✓' : '' }}
              </span>
              Pin to top
            </GhostContextMenuCheckboxItem>
            <GhostContextMenuSeparator decorative />
            <GhostContextMenuLabel>Row density</GhostContextMenuLabel>
            <GhostContextMenuRadioGroup
              :model-value="density"
              @update:model-value="setDensity"
            >
              <GhostContextMenuRadioItem value="compact">
                <span class="context-menu__indicator" aria-hidden="true">
                  {{ density === 'compact' ? '●' : '' }}
                </span>
                Compact
              </GhostContextMenuRadioItem>
              <GhostContextMenuRadioItem value="comfortable">
                <span class="context-menu__indicator" aria-hidden="true">
                  {{ density === 'comfortable' ? '●' : '' }}
                </span>
                Comfortable
              </GhostContextMenuRadioItem>
            </GhostContextMenuRadioGroup>
          </GhostContextMenuContent>
        </GhostContextMenu>
      </li>
    </ul>

    <template #footer>
      <div class="file-browser__status" role="status" aria-live="polite">
        {{ statusMessage }}
      </div>
    </template>
  </GhostCard>
</template>

<style scoped>
.file-browser {
  inline-size: 100%;
  max-inline-size: 34rem;
}

.file-browser__header {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm);
  justify-content: space-between;
}

.file-browser__title {
  color: var(--ghost-surface-fg);
  font-size: var(--ghost-type-size-md);
  font-weight: var(--ghost-type-weight-semibold);
}

.file-browser__list {
  display: grid;
  gap: var(--ghost-space-gap-xs);
  list-style: none;
  margin: 0;
  padding: 0;
}

.file-browser__item {
  margin: 0;
}

.file-browser__row {
  align-items: center;
  background-color: var(--ghost-surface-subtle-bg);
  border: var(--ghost-border-hairline-width) solid var(--ghost-border-subtle);
  border-radius: var(--ghost-radius-md);
  color: var(--ghost-surface-fg);
  cursor: context-menu;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-xs) var(--ghost-space-gap-md);
  justify-content: space-between;
  padding: var(--ghost-space-inset-sm) var(--ghost-space-inset-md);
}

.file-browser[data-density='compact'] .file-browser__row {
  padding: var(--ghost-space-inset-xs) var(--ghost-space-inset-sm);
}

.file-browser__row:hover {
  background-color: var(--ghost-elevation-2-bg);
}

.file-browser__row:focus-visible {
  outline: var(--ghost-focus-ring-width) solid var(--ghost-focus-ring-color);
  outline-offset: var(--ghost-focus-ring-offset);
}

.file-browser__name {
  align-items: center;
  display: inline-flex;
  flex-wrap: wrap;
  font-size: var(--ghost-type-size-sm);
  font-weight: var(--ghost-type-weight-medium);
  gap: var(--ghost-space-gap-xs);
}

.file-browser__meta {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-xs);
}

.file-browser__status {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-xs);
}

.context-menu__indicator {
  display: inline-block;
  inline-size: 1em;
  text-align: center;
}
</style>
