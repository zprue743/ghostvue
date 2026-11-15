<script setup lang="ts">
import { ref } from 'vue'

import { GhostButton } from '@ghostvue/themes'
import {
  GhostMenubar,
  GhostMenubarCheckboxItem,
  GhostMenubarContent,
  GhostMenubarItem,
  GhostMenubarMenu,
  GhostMenubarTrigger,
} from '@ghostvue/themes'

const starred = ref(true)
</script>

<template>
  <GhostMenubar>
    <GhostMenubarMenu>
      <GhostMenubarTrigger :as="GhostButton" variant="ghost"
        >View</GhostMenubarTrigger
      >
      <GhostMenubarContent :offset="8">
        <GhostMenubarCheckboxItem v-model:checked="starred">
          Starred only
        </GhostMenubarCheckboxItem>
        <GhostMenubarItem>Reset filters</GhostMenubarItem>
      </GhostMenubarContent>
    </GhostMenubarMenu>
  </GhostMenubar>
</template>
