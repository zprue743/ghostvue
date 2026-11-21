<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostTree,
  GhostTreeGroup,
  GhostTreeItem,
  GhostTreeTrigger,
  type GhostTreeValue,
} from '@ghostvue/vue'

const selected = ref<GhostTreeValue>('src/main.ts')
</script>

<template>
  <div>
    <GhostTree
      v-model="selected"
      aria-label="Project files"
      :default-expanded="['src']"
    >
      <GhostTreeItem value="docs">
        <template #default="{ expanded }">
          <GhostTreeTrigger>
            <span aria-hidden="true">{{ expanded ? '▾' : '▸' }} </span>docs
          </GhostTreeTrigger>
          <GhostTreeGroup>
            <GhostTreeItem value="docs/readme.md">
              <GhostTreeTrigger>readme.md</GhostTreeTrigger>
            </GhostTreeItem>
            <GhostTreeItem value="docs/guides">
              <template #default="{ expanded: guidesExpanded }">
                <GhostTreeTrigger>
                  <span aria-hidden="true"
                    >{{ guidesExpanded ? '▾' : '▸' }} </span
                  >guides
                </GhostTreeTrigger>
                <GhostTreeGroup>
                  <GhostTreeItem value="docs/guides/install.md">
                    <GhostTreeTrigger>install.md</GhostTreeTrigger>
                  </GhostTreeItem>
                  <GhostTreeItem value="docs/guides/theming.md">
                    <GhostTreeTrigger>theming.md</GhostTreeTrigger>
                  </GhostTreeItem>
                </GhostTreeGroup>
              </template>
            </GhostTreeItem>
          </GhostTreeGroup>
        </template>
      </GhostTreeItem>
      <GhostTreeItem value="src">
        <template #default="{ expanded }">
          <GhostTreeTrigger>
            <span aria-hidden="true">{{ expanded ? '▾' : '▸' }} </span>src
          </GhostTreeTrigger>
          <GhostTreeGroup>
            <GhostTreeItem value="src/main.ts">
              <GhostTreeTrigger>main.ts</GhostTreeTrigger>
            </GhostTreeItem>
            <GhostTreeItem value="src/router.ts">
              <GhostTreeTrigger>router.ts</GhostTreeTrigger>
            </GhostTreeItem>
          </GhostTreeGroup>
        </template>
      </GhostTreeItem>
      <GhostTreeItem value="package.json">
        <GhostTreeTrigger>package.json</GhostTreeTrigger>
      </GhostTreeItem>
    </GhostTree>
    <p class="tree-status">Selected: {{ selected ?? 'none' }}</p>
  </div>
</template>

<style scoped>
.tree-status {
  margin: 0.5rem 0 0;
}
</style>
