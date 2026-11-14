<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostSelect,
  GhostSelectContent,
  GhostSelectOption,
  GhostSelectTrigger,
  GhostSelectValue,
} from '@ghostvue/themes'

const pageSize = ref('25')
</script>

<template>
  <div class="ghost-themed-scope">
    <GhostSelect v-model="pageSize">
      <GhostSelectTrigger aria-label="Rows per page">
        <GhostSelectValue placeholder="Rows per page" />
      </GhostSelectTrigger>
      <GhostSelectContent :offset="6">
        <GhostSelectOption value="10">10 rows</GhostSelectOption>
        <GhostSelectOption value="25">25 rows</GhostSelectOption>
        <GhostSelectOption value="50">50 rows</GhostSelectOption>
      </GhostSelectContent>
    </GhostSelect>
  </div>
</template>
