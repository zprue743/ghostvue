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
  <section
    aria-labelledby="select-heading"
    data-testid="select-demo-section"
    class="select-section"
  >
    <h2 id="select-heading">GhostSelect</h2>
    <GhostSelect v-model="pageSize">
      <GhostSelectTrigger
        data-testid="select-demo-trigger"
        aria-label="Rows per page"
      >
        <GhostSelectValue placeholder="Rows per page" />
      </GhostSelectTrigger>
      <GhostSelectContent data-testid="select-demo-content" :offset="6">
        <GhostSelectOption value="10">10 rows</GhostSelectOption>
        <GhostSelectOption value="25">25 rows</GhostSelectOption>
        <GhostSelectOption value="50">50 rows</GhostSelectOption>
      </GhostSelectContent>
    </GhostSelect>
  </section>
</template>
