<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostCollapsible,
  GhostCollapsibleContent,
  GhostCollapsibleTrigger,
  type GhostCollapsibleSlotProps,
} from '../src'

const expanded = ref(true)

function handleOpenChange(open: boolean) {
  void open
}

function useSlotProps(props: GhostCollapsibleSlotProps) {
  const isOpen: boolean = props.open
  props.toggle()
  void isOpen
}

void useSlotProps
void handleOpenChange
</script>

<template>
  <GhostCollapsible v-model:open="expanded" @update:open="handleOpenChange">
    <template #default="{ open, toggle }">
      <GhostCollapsibleTrigger>Details</GhostCollapsibleTrigger>
      <GhostCollapsibleContent v-if="open">
        <p>Expanded: {{ open }}</p>
        <button type="button" @click="toggle()">Collapse</button>
      </GhostCollapsibleContent>
    </template>
  </GhostCollapsible>
</template>
