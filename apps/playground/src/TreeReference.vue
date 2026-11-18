<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostTree as GhostTreeThemed,
  GhostTreeGroup as GhostTreeGroupThemed,
  GhostTreeItem as GhostTreeItemThemed,
  GhostTreeTrigger as GhostTreeTriggerThemed,
} from '@ghostvue/themes'
import {
  GhostTree,
  GhostTreeGroup,
  GhostTreeItem,
  GhostTreeTrigger,
  type GhostTreeValue,
} from '@ghostvue/vue'

interface Node {
  id: string
  label: string
}

// Dynamic fixture: keyed insertion and removal while the tree keeps focus.
const files = ref<Node[]>([
  { id: 'alpha', label: 'alpha.ts' },
  { id: 'beta', label: 'beta.ts' },
  { id: 'gamma', label: 'gamma.ts' },
])
let nextId = 1

function prependFile(): void {
  files.value = [
    { id: `new-${String(nextId)}`, label: `new-${String(nextId)}.ts` },
    ...files.value,
  ]
  nextId += 1
}

function removeFile(id: string): void {
  files.value = files.value.filter((file) => file.id !== id)
}

function reverseFiles(): void {
  files.value = [...files.value].reverse()
}

const single = ref<GhostTreeValue>()
const multiple = ref<GhostTreeValue>([])
const expanded = ref<string[]>([])
</script>

<template>
  <section role="region" aria-labelledby="tree-heading" class="tree-section">
    <h2 id="tree-heading">GhostTree</h2>

    <div class="tree-row">
      <div>
        <GhostTree
          v-model="single"
          aria-label="Dynamic files"
          :default-expanded="['folder']"
          data-testid="tree-dynamic"
        >
          <GhostTreeItem value="folder">
            <GhostTreeTrigger>folder</GhostTreeTrigger>
            <GhostTreeGroup>
              <GhostTreeItem
                v-for="file in files"
                :key="file.id"
                :value="file.id"
              >
                <GhostTreeTrigger>{{ file.label }}</GhostTreeTrigger>
              </GhostTreeItem>
            </GhostTreeGroup>
          </GhostTreeItem>
          <GhostTreeItem value="outside">
            <GhostTreeTrigger>outside.ts</GhostTreeTrigger>
          </GhostTreeItem>
        </GhostTree>
        <div class="tree-actions">
          <button type="button" data-testid="tree-prepend" @click="prependFile">
            Prepend file
          </button>
          <button
            type="button"
            data-testid="tree-remove-beta"
            @click="removeFile('beta')"
          >
            Remove beta.ts
          </button>
          <button
            type="button"
            data-testid="tree-reverse"
            @click="reverseFiles"
          >
            Reverse files
          </button>
        </div>
        <p data-testid="tree-dynamic-value">Selected: {{ single ?? 'none' }}</p>
      </div>

      <div>
        <GhostTree
          v-model="multiple"
          v-model:expanded="expanded"
          selection-mode="multiple"
          aria-label="Controlled multi-select"
          data-testid="tree-multiple"
        >
          <GhostTreeItem value="reports">
            <GhostTreeTrigger>Reports</GhostTreeTrigger>
            <GhostTreeGroup>
              <GhostTreeItem value="q1">
                <GhostTreeTrigger>Q1</GhostTreeTrigger>
              </GhostTreeItem>
              <GhostTreeItem value="q2" disabled>
                <GhostTreeTrigger>Q2 (locked)</GhostTreeTrigger>
              </GhostTreeItem>
            </GhostTreeGroup>
          </GhostTreeItem>
          <GhostTreeItem value="invoices">
            <GhostTreeTrigger>Invoices</GhostTreeTrigger>
          </GhostTreeItem>
        </GhostTree>
        <button
          type="button"
          data-testid="tree-collapse-all"
          @click="expanded = []"
        >
          Collapse all
        </button>
        <p data-testid="tree-multiple-value">
          Selected:
          {{ Array.isArray(multiple) ? multiple.join(', ') : '' }}; expanded:
          {{ expanded.join(', ') }}
        </p>
      </div>

      <div dir="rtl">
        <GhostTree aria-label="شجرة" data-testid="tree-rtl">
          <GhostTreeItem value="rtl-a">
            <GhostTreeTrigger>أ</GhostTreeTrigger>
            <GhostTreeGroup>
              <GhostTreeItem value="rtl-a1">
                <GhostTreeTrigger>أ ١</GhostTreeTrigger>
              </GhostTreeItem>
            </GhostTreeGroup>
          </GhostTreeItem>
        </GhostTree>
      </div>
    </div>

    <fieldset class="ghost-theme" data-ghost-mode="light">
      <legend>Themed GhostTree</legend>
      <GhostTreeThemed
        aria-label="Themed outline"
        :default-expanded="['guide']"
        data-testid="tree-themed"
      >
        <GhostTreeItemThemed value="guide">
          <GhostTreeTriggerThemed>Guide</GhostTreeTriggerThemed>
          <GhostTreeGroupThemed>
            <GhostTreeItemThemed value="install">
              <GhostTreeTriggerThemed>Install</GhostTreeTriggerThemed>
            </GhostTreeItemThemed>
            <GhostTreeItemThemed value="usage">
              <GhostTreeTriggerThemed>Usage</GhostTreeTriggerThemed>
            </GhostTreeItemThemed>
          </GhostTreeGroupThemed>
        </GhostTreeItemThemed>
      </GhostTreeThemed>
    </fieldset>
  </section>
</template>

<style scoped>
.tree-section {
  margin-block: 2rem;
}

.tree-row {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  margin-block-end: 1rem;
}

.tree-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
