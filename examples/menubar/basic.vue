<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostMenubar,
  GhostMenubarCheckboxItem,
  GhostMenubarContent,
  GhostMenubarItem,
  GhostMenubarLabel,
  GhostMenubarMenu,
  GhostMenubarRadioGroup,
  GhostMenubarRadioItem,
  GhostMenubarSeparator,
  GhostMenubarTrigger,
} from '@ghostvue/vue'

const showHidden = ref(false)
const sort = ref('name')
</script>

<template>
  <GhostMenubar>
    <GhostMenubarMenu>
      <GhostMenubarTrigger>File</GhostMenubarTrigger>
      <GhostMenubarContent :offset="8">
        <GhostMenubarLabel>File</GhostMenubarLabel>
        <GhostMenubarSeparator decorative />
        <GhostMenubarItem>New</GhostMenubarItem>
        <GhostMenubarItem disabled>Archive (disabled)</GhostMenubarItem>
      </GhostMenubarContent>
    </GhostMenubarMenu>
    <GhostMenubarMenu>
      <GhostMenubarTrigger>Edit</GhostMenubarTrigger>
      <GhostMenubarContent :offset="8">
        <GhostMenubarCheckboxItem v-model:checked="showHidden">
          Show hidden files
        </GhostMenubarCheckboxItem>
        <GhostMenubarSeparator decorative />
        <GhostMenubarRadioGroup v-model="sort">
          <GhostMenubarRadioItem value="name"
            >Sort by name</GhostMenubarRadioItem
          >
          <GhostMenubarRadioItem value="date"
            >Sort by date</GhostMenubarRadioItem
          >
        </GhostMenubarRadioGroup>
      </GhostMenubarContent>
    </GhostMenubarMenu>
  </GhostMenubar>
</template>
