<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostTree,
  GhostTreeGroup,
  GhostTreeItem,
  GhostTreeTrigger,
  type GhostTreeValue,
} from '@ghostvue/themes'

const selected = ref<GhostTreeValue>('components/tree')
</script>

<template>
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
</template>

<style scoped>
.themed-tree {
  max-inline-size: 18rem;
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
