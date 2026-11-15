<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostDropdownMenu,
  GhostDropdownMenuCheckboxItem,
  GhostDropdownMenuContent,
  GhostDropdownMenuItem,
  GhostDropdownMenuLabel,
  GhostDropdownMenuRadioGroup,
  GhostDropdownMenuRadioItem,
  GhostDropdownMenuSeparator,
  GhostDropdownMenuTrigger,
} from '@ghostvue/vue'

const showHidden = ref(false)
const sort = ref('name')
</script>

<template>
  <GhostDropdownMenu>
    <GhostDropdownMenuTrigger>File actions</GhostDropdownMenuTrigger>
    <GhostDropdownMenuContent :offset="8" placement="bottom-start">
      <GhostDropdownMenuLabel>Actions</GhostDropdownMenuLabel>
      <GhostDropdownMenuSeparator decorative />
      <GhostDropdownMenuItem>Edit</GhostDropdownMenuItem>
      <GhostDropdownMenuItem disabled>Archive (disabled)</GhostDropdownMenuItem>
      <GhostDropdownMenuSeparator decorative />
      <GhostDropdownMenuCheckboxItem v-model:checked="showHidden">
        Show hidden files
      </GhostDropdownMenuCheckboxItem>
      <GhostDropdownMenuSeparator decorative />
      <GhostDropdownMenuRadioGroup v-model="sort">
        <GhostDropdownMenuRadioItem value="name">
          Sort by name
        </GhostDropdownMenuRadioItem>
        <GhostDropdownMenuRadioItem value="date">
          Sort by date
        </GhostDropdownMenuRadioItem>
      </GhostDropdownMenuRadioGroup>
    </GhostDropdownMenuContent>
  </GhostDropdownMenu>
</template>
