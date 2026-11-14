<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostTabs,
  GhostTabsContent,
  GhostTabsList,
  GhostTabsTrigger,
  type GhostTabsSlotProps,
} from '../src'

const selected = ref('reports')

function handleTabChange(value: string) {
  void value
}

function useSlotProps(props: GhostTabsSlotProps) {
  const current: string | undefined = props.modelValue
  void current
}

void useSlotProps
void handleTabChange
</script>

<template>
  <GhostTabs
    v-model="selected"
    default-value="reports"
    activation-mode="manual"
    orientation="vertical"
    @update:model-value="handleTabChange"
  >
    <template #default="{ modelValue }">
      <GhostTabsList aria-label="Sections">
        <GhostTabsTrigger value="reports">Reports</GhostTabsTrigger>
        <GhostTabsTrigger value="settings" :disabled="modelValue === 'reports'">
          Settings
        </GhostTabsTrigger>
      </GhostTabsList>
      <GhostTabsContent value="reports">Reports panel</GhostTabsContent>
      <GhostTabsContent value="settings">Settings panel</GhostTabsContent>
    </template>
  </GhostTabs>
</template>
