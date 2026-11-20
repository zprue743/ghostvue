<script setup lang="ts">
import { computed, ref } from 'vue'

import {
  GhostCard,
  GhostToggleGroup,
  GhostToggleGroupItem,
} from '@ghostvue/themes'

const alignment = ref<'left' | 'center' | 'right'>('left')
const formats = ref<string[]>(['bold'])

const previewStyle = computed(() => ({
  textAlign: alignment.value,
  fontWeight: formats.value.includes('bold') ? '700' : '400',
  fontStyle: formats.value.includes('italic') ? 'italic' : 'normal',
  textDecoration: formats.value.includes('underline') ? 'underline' : 'none',
}))
</script>

<template>
  <section class="editor" aria-labelledby="editor-title">
    <GhostCard>
      <template #header>
        <div class="editor__header">
          <h2 id="editor-title" class="editor__title">Announcement draft</h2>
          <p class="editor__lead">
            Combine single-select alignment with multi-select text formatting.
          </p>
        </div>
      </template>

      <div class="editor__body">
        <div class="editor__toolbar" role="toolbar" aria-label="Formatting">
          <GhostToggleGroup
            v-model="formats"
            type="multiple"
            aria-label="Text formatting"
          >
            <GhostToggleGroupItem value="bold" aria-label="Bold">
              B
            </GhostToggleGroupItem>
            <GhostToggleGroupItem value="italic" aria-label="Italic">
              I
            </GhostToggleGroupItem>
            <GhostToggleGroupItem value="underline" aria-label="Underline">
              U
            </GhostToggleGroupItem>
          </GhostToggleGroup>

          <GhostToggleGroup
            v-model="alignment"
            type="single"
            aria-label="Text alignment"
          >
            <GhostToggleGroupItem value="left">Left</GhostToggleGroupItem>
            <GhostToggleGroupItem value="center">Center</GhostToggleGroupItem>
            <GhostToggleGroupItem value="right">Right</GhostToggleGroupItem>
          </GhostToggleGroup>
        </div>

        <p class="editor__preview" :style="previewStyle">
          Scheduled maintenance completes Sunday at 04:00 UTC with zero expected
          downtime for read replicas.
        </p>
      </div>

      <template #footer>
        <p class="editor__status" role="status">
          Alignment: {{ alignment }} · Formatting:
          {{ formats.length > 0 ? formats.join(', ') : 'none' }}
        </p>
      </template>
    </GhostCard>
  </section>
</template>

<style scoped>
.editor {
  max-inline-size: 36rem;
}

.editor__header {
  display: grid;
  gap: var(--ghost-space-gap-xs);
  padding-block-end: var(--ghost-space-stack-sm);
}

.editor__title {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-lg);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-tight);
  margin: 0;
}

.editor__lead,
.editor__status {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-snug);
  margin: 0;
  overflow-wrap: anywhere;
}

.editor__body {
  display: grid;
  gap: var(--ghost-space-stack-md);
}

.editor__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm) var(--ghost-space-gap-md);
}

.editor__preview {
  border: var(--ghost-border-hairline-width) solid var(--ghost-border-muted);
  border-radius: var(--ghost-radius-md);
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-md);
  line-height: var(--ghost-type-line-normal);
  margin: 0;
  padding: var(--ghost-space-inset-md);
}
</style>
