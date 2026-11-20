<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostButton,
  GhostCard,
  GhostSeparator,
  GhostToolbar,
} from '@ghostvue/themes'

const lastAction = ref('No formatting action applied yet')

function runAction(name: string): void {
  lastAction.value = `Applied: ${name}`
}
</script>

<template>
  <div class="toolbar-showcase">
    <GhostCard>
      <template #header>
        <div class="toolbar-showcase__header">
          <span class="toolbar-showcase__title">Document toolbar</span>
          <span class="toolbar-showcase__status" role="status">
            {{ lastAction }}
          </span>
        </div>
      </template>

      <GhostToolbar label="Document formatting" class="toolbar-showcase__bar">
        <GhostButton
          size="sm"
          variant="outline"
          tone="neutral"
          @click="runAction('Bold')"
        >
          Bold
        </GhostButton>
        <GhostButton
          size="sm"
          variant="outline"
          tone="neutral"
          @click="runAction('Italic')"
        >
          Italic
        </GhostButton>
        <GhostButton
          size="sm"
          variant="outline"
          tone="neutral"
          @click="runAction('Code')"
        >
          Code
        </GhostButton>
        <GhostSeparator orientation="vertical" />
        <GhostButton
          size="sm"
          variant="ghost"
          tone="neutral"
          @click="runAction('Insert link')"
        >
          Link
        </GhostButton>
        <GhostButton
          size="sm"
          variant="ghost"
          tone="danger"
          @click="runAction('Clear formatting')"
        >
          Clear
        </GhostButton>
      </GhostToolbar>
    </GhostCard>
  </div>
</template>

<style scoped>
.toolbar-showcase {
  display: grid;
}

.toolbar-showcase__header {
  display: grid;
  gap: var(--ghost-space-gap-2xs);
}

.toolbar-showcase__title {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-md);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-snug);
}

.toolbar-showcase__status {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-xs);
  line-height: var(--ghost-type-line-normal);
}

.toolbar-showcase__bar {
  flex-wrap: wrap;
}

@container ghost-demo (min-width: 28rem) {
  .toolbar-showcase__header {
    align-items: baseline;
    grid-template-columns: auto minmax(0, 1fr);
    justify-content: space-between;
  }

  .toolbar-showcase__status {
    text-align: end;
  }
}
</style>
