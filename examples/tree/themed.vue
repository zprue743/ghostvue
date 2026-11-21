<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostCard,
  GhostTree,
  GhostTreeGroup,
  GhostTreeItem,
  GhostTreeTrigger,
  type GhostTreeValue,
} from '@ghostvue/themes'

const selected = ref<GhostTreeValue>('components/tree')
</script>

<template>
  <GhostCard class="explorer-card">
    <template #header>
      <span class="explorer-card__title">Workspace explorer</span>
    </template>

    <GhostTree
      v-model="selected"
      class="themed-tree"
      aria-label="Library"
      :default-expanded="['components']"
    >
      <GhostTreeItem value="components">
        <template #default="{ expanded }">
          <GhostTreeTrigger>
            <span class="chevron" aria-hidden="true" :data-open="expanded"
              >›</span
            >
            Components
          </GhostTreeTrigger>
          <GhostTreeGroup>
            <GhostTreeItem value="components/button">
              <GhostTreeTrigger>
                <span class="chevron-spacer" aria-hidden="true"></span>
                Button
              </GhostTreeTrigger>
            </GhostTreeItem>
            <GhostTreeItem value="components/tree">
              <GhostTreeTrigger>
                <span class="chevron-spacer" aria-hidden="true"></span>
                Tree
              </GhostTreeTrigger>
            </GhostTreeItem>
            <GhostTreeItem value="components/forms">
              <template #default="{ expanded: formsExpanded }">
                <GhostTreeTrigger>
                  <span
                    class="chevron"
                    aria-hidden="true"
                    :data-open="formsExpanded"
                    >›</span
                  >
                  Forms
                </GhostTreeTrigger>
                <GhostTreeGroup>
                  <GhostTreeItem value="components/forms/input">
                    <GhostTreeTrigger>
                      <span class="chevron-spacer" aria-hidden="true"></span>
                      Input
                    </GhostTreeTrigger>
                  </GhostTreeItem>
                  <GhostTreeItem value="components/forms/select" disabled>
                    <GhostTreeTrigger>
                      <span class="chevron-spacer" aria-hidden="true"></span>
                      Select (beta)
                    </GhostTreeTrigger>
                  </GhostTreeItem>
                </GhostTreeGroup>
              </template>
            </GhostTreeItem>
          </GhostTreeGroup>
        </template>
      </GhostTreeItem>
      <GhostTreeItem value="tokens">
        <GhostTreeTrigger>
          <span class="chevron-spacer" aria-hidden="true"></span>
          Tokens
        </GhostTreeTrigger>
      </GhostTreeItem>
    </GhostTree>

    <template #footer>
      <div class="explorer-card__status" role="status" aria-live="polite">
        Selected: {{ selected ?? 'none' }}
      </div>
    </template>
  </GhostCard>
</template>

<style scoped>
.explorer-card {
  inline-size: 100%;
  max-inline-size: 22rem;
}

.explorer-card__title {
  color: var(--ghost-surface-fg);
  font-size: var(--ghost-type-size-md);
  font-weight: var(--ghost-type-weight-semibold);
}

.explorer-card__status {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-xs);
}

.themed-tree {
  inline-size: 100%;
}

.chevron,
.chevron-spacer {
  display: inline-block;
  inline-size: 1em;
  text-align: center;
}

.chevron[data-open='true'] {
  rotate: 90deg;
}

[dir='rtl'] .chevron:not([data-open='true']) {
  scale: -1 1;
}
</style>
