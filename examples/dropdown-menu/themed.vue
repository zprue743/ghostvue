<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostButton,
  GhostDropdownMenu,
  GhostDropdownMenuCheckboxItem,
  GhostDropdownMenuContent,
  GhostDropdownMenuItem,
  GhostDropdownMenuLabel,
  GhostDropdownMenuRadioGroup,
  GhostDropdownMenuRadioItem,
  GhostDropdownMenuSeparator,
  GhostDropdownMenuTrigger,
} from '@ghostvue/themes'

const starred = ref(true)
const layout = ref('list')
</script>

<template>
  <GhostDropdownMenu>
    <GhostDropdownMenuTrigger :as="GhostButton" variant="outline">
      View options
    </GhostDropdownMenuTrigger>
    <GhostDropdownMenuContent :offset="8" placement="bottom-start">
      <GhostDropdownMenuLabel>Display</GhostDropdownMenuLabel>
      <GhostDropdownMenuSeparator decorative />
      <GhostDropdownMenuCheckboxItem v-model:checked="starred">
        Starred only
      </GhostDropdownMenuCheckboxItem>
      <GhostDropdownMenuSeparator decorative />
      <GhostDropdownMenuRadioGroup v-model="layout">
        <GhostDropdownMenuRadioItem value="list"
          >List</GhostDropdownMenuRadioItem
        >
        <GhostDropdownMenuRadioItem value="grid"
          >Grid</GhostDropdownMenuRadioItem
        >
      </GhostDropdownMenuRadioGroup>
      <GhostDropdownMenuSeparator decorative />
      <GhostDropdownMenuItem>Reset filters</GhostDropdownMenuItem>
    </GhostDropdownMenuContent>
  </GhostDropdownMenu>
</template>
