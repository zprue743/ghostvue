<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostTree,
  GhostTreeGroup,
  GhostTreeItem,
  GhostTreeTrigger,
  type GhostTreeValue,
} from '@ghostvue/vue'

interface Topic {
  id: string
  label: string
  children?: Topic[]
}

// Consumer-owned data: the tree only reads the `id` keys passed as `value`.
const topics: Topic[] = [
  {
    id: 'frontend',
    label: 'Frontend',
    children: [
      { id: 'vue', label: 'Vue' },
      { id: 'css', label: 'CSS' },
      { id: 'a11y', label: 'Accessibility' },
    ],
  },
  {
    id: 'backend',
    label: 'Backend',
    children: [
      { id: 'node', label: 'Node.js' },
      { id: 'postgres', label: 'PostgreSQL' },
    ],
  },
  { id: 'design', label: 'Design' },
]

const selected = ref<GhostTreeValue>(['css'])
const expanded = ref<string[]>(['frontend'])
</script>

<template>
  <div>
    <GhostTree
      v-model="selected"
      v-model:expanded="expanded"
      selection-mode="multiple"
      aria-label="Topics"
    >
      <GhostTreeItem v-for="topic in topics" :key="topic.id" :value="topic.id">
        <template #default="{ expanded: open, selected: checked }">
          <GhostTreeTrigger>
            <span aria-hidden="true"
              >{{ topic.children ? (open ? '▾' : '▸') : '•' }}
              {{ checked ? '☑' : '☐' }} </span
            >{{ topic.label }}
          </GhostTreeTrigger>
          <GhostTreeGroup v-if="topic.children">
            <GhostTreeItem
              v-for="child in topic.children"
              :key="child.id"
              :value="child.id"
            >
              <template #default="{ selected: childChecked }">
                <GhostTreeTrigger>
                  <span aria-hidden="true">{{ childChecked ? '☑' : '☐' }} </span
                  >{{ child.label }}
                </GhostTreeTrigger>
              </template>
            </GhostTreeItem>
          </GhostTreeGroup>
        </template>
      </GhostTreeItem>
    </GhostTree>
    <p>Selected: {{ Array.isArray(selected) ? selected.join(', ') : '' }}</p>
    <p>Expanded: {{ expanded.join(', ') }}</p>
  </div>
</template>
