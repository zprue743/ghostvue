<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostTree,
  GhostTreeGroup,
  GhostTreeItem,
  GhostTreeTrigger,
  type GhostTreeSelectPayload,
  type GhostTreeTogglePayload,
  type GhostTreeValue,
} from '../src'

const selected = ref<GhostTreeValue>(['docs'])
const expanded = ref<string[]>([])

function onSelect(payload: GhostTreeSelectPayload) {
  void payload.selected
}

function onToggle(payload: GhostTreeTogglePayload) {
  void payload.expanded
}
</script>

<template>
  <GhostTree
    v-model="selected"
    v-model:expanded="expanded"
    selection-mode="multiple"
    aria-label="Files"
    @select="onSelect"
    @toggle="onToggle"
  >
    <template #default="{ isSelected, toggleExpanded }">
      <GhostTreeItem
        value="docs"
        :text-value="isSelected('docs') ? 'Docs' : undefined"
      >
        <template #default="{ expanded: open, level, toggle }">
          <GhostTreeTrigger action="toggle" @click="toggleExpanded('docs')">
            {{ open ? 'v' : '>' }} {{ level }}
          </GhostTreeTrigger>
          <GhostTreeTrigger action="select">
            <template #default="{ selected: checked }">
              Docs {{ checked }}
            </template>
          </GhostTreeTrigger>
          <GhostTreeGroup :disable-animation="true">
            <GhostTreeItem value="readme" @click="toggle()"
              >Readme</GhostTreeItem
            >
          </GhostTreeGroup>
        </template>
      </GhostTreeItem>
    </template>
  </GhostTree>
</template>
