<script setup lang="ts">
import { computed, ref } from 'vue'

import {
  GhostButton,
  GhostCard,
  GhostMenubar,
  GhostMenubarCheckboxItem,
  GhostMenubarContent,
  GhostMenubarItem,
  GhostMenubarLabel,
  GhostMenubarMenu,
  GhostMenubarRadioGroup,
  GhostMenubarRadioItem,
  GhostMenubarSeparator,
  GhostMenubarTrigger,
} from '@ghostvue/themes'

type LayoutMode = 'comfortable' | 'compact'

const wordWrap = ref(true)
const lineNumbers = ref(true)
const layout = ref<LayoutMode>('comfortable')
const lastAction = ref('Ready')

const statusSummary = computed(() => {
  const flags = [
    wordWrap.value ? 'Word wrap on' : 'Word wrap off',
    lineNumbers.value ? 'Line numbers on' : 'Line numbers off',
    layout.value === 'comfortable' ? 'Comfortable layout' : 'Compact layout',
  ].join(' · ')
  return `${lastAction.value} — ${flags}`
})

function runAction(label: string): void {
  lastAction.value = label
}

function setLayout(value: string): void {
  if (value === 'comfortable' || value === 'compact') {
    layout.value = value
    lastAction.value = `Layout: ${value}`
  }
}
</script>

<template>
  <GhostCard class="editor-shell">
    <template #header>
      <div class="editor-shell__bar">
        <GhostMenubar class="editor-menubar" aria-label="Document actions">
          <GhostMenubarMenu>
            <GhostMenubarTrigger :as="GhostButton" variant="ghost" size="sm">
              File
            </GhostMenubarTrigger>
            <GhostMenubarContent :offset="6">
              <GhostMenubarItem @select="runAction('Created new draft')">
                <span class="menubar__indicator" aria-hidden="true" />
                New draft
              </GhostMenubarItem>
              <GhostMenubarItem @select="runAction('Duplicated document')">
                <span class="menubar__indicator" aria-hidden="true" />
                Duplicate
              </GhostMenubarItem>
              <GhostMenubarSeparator decorative />
              <GhostMenubarItem @select="runAction('Exported PDF')">
                <span class="menubar__indicator" aria-hidden="true" />
                Export PDF
              </GhostMenubarItem>
              <GhostMenubarItem disabled>
                <span class="menubar__indicator" aria-hidden="true" />
                Publish (read-only)
              </GhostMenubarItem>
            </GhostMenubarContent>
          </GhostMenubarMenu>

          <GhostMenubarMenu>
            <GhostMenubarTrigger :as="GhostButton" variant="ghost" size="sm">
              Edit
            </GhostMenubarTrigger>
            <GhostMenubarContent :offset="6">
              <GhostMenubarItem @select="runAction('Undid last change')">
                <span class="menubar__indicator" aria-hidden="true" />
                Undo
              </GhostMenubarItem>
              <GhostMenubarItem @select="runAction('Redid change')">
                <span class="menubar__indicator" aria-hidden="true" />
                Redo
              </GhostMenubarItem>
              <GhostMenubarSeparator decorative />
              <GhostMenubarItem @select="runAction('Opened find & replace')">
                <span class="menubar__indicator" aria-hidden="true" />
                Find &amp; replace
              </GhostMenubarItem>
            </GhostMenubarContent>
          </GhostMenubarMenu>

          <GhostMenubarMenu>
            <GhostMenubarTrigger :as="GhostButton" variant="ghost" size="sm">
              View
            </GhostMenubarTrigger>
            <GhostMenubarContent :offset="6">
              <GhostMenubarLabel>Editor</GhostMenubarLabel>
              <GhostMenubarCheckboxItem v-model:checked="wordWrap">
                <span class="menubar__indicator" aria-hidden="true">
                  {{ wordWrap ? '✓' : '' }}
                </span>
                Word wrap
              </GhostMenubarCheckboxItem>
              <GhostMenubarCheckboxItem v-model:checked="lineNumbers">
                <span class="menubar__indicator" aria-hidden="true">
                  {{ lineNumbers ? '✓' : '' }}
                </span>
                Line numbers
              </GhostMenubarCheckboxItem>
              <GhostMenubarSeparator decorative />
              <GhostMenubarLabel>Density</GhostMenubarLabel>
              <GhostMenubarRadioGroup
                :model-value="layout"
                @update:model-value="setLayout"
              >
                <GhostMenubarRadioItem value="comfortable">
                  <span class="menubar__indicator" aria-hidden="true">
                    {{ layout === 'comfortable' ? '●' : '' }}
                  </span>
                  Comfortable
                </GhostMenubarRadioItem>
                <GhostMenubarRadioItem value="compact">
                  <span class="menubar__indicator" aria-hidden="true">
                    {{ layout === 'compact' ? '●' : '' }}
                  </span>
                  Compact
                </GhostMenubarRadioItem>
              </GhostMenubarRadioGroup>
            </GhostMenubarContent>
          </GhostMenubarMenu>
        </GhostMenubar>
      </div>
    </template>

    <div class="editor-shell__body">
      <span class="editor-shell__doc">release-notes.md</span>
      <span class="editor-shell__hint">
        Use ArrowLeft / ArrowRight across menus, ArrowDown to open.
      </span>
    </div>

    <template #footer>
      <div class="editor-shell__status" role="status" aria-live="polite">
        {{ statusSummary }}
      </div>
    </template>
  </GhostCard>
</template>

<style scoped>
.editor-shell {
  inline-size: 100%;
  max-inline-size: 32rem;
}

.editor-shell__bar {
  display: flex;
  flex-wrap: wrap;
}

.editor-menubar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-xs);
}

.editor-shell__body {
  display: grid;
  gap: var(--ghost-space-gap-xs);
}

.editor-shell__doc {
  color: var(--ghost-surface-fg);
  font-size: var(--ghost-type-size-sm);
  font-weight: var(--ghost-type-weight-semibold);
}

.editor-shell__hint,
.editor-shell__status {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-xs);
}

.menubar__indicator {
  display: inline-block;
  inline-size: 1em;
  text-align: center;
}
</style>
