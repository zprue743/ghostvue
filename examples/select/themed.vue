<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostSelect,
  GhostSelectContent,
  GhostSelectOption,
  GhostSelectTrigger,
  GhostSelectValue,
} from '@ghostvue/themes'

const pageSize = ref<string | undefined>('25')
const sort = ref<string | undefined>('updated')
</script>

<template>
  <div class="toolbar">
    <div class="toolbar__control">
      <span id="toolbar-sort-label" class="toolbar__label">Sort by</span>
      <GhostSelect v-model="sort" placeholder="Sort by">
        <GhostSelectTrigger aria-labelledby="toolbar-sort-label">
          <GhostSelectValue />
        </GhostSelectTrigger>
        <GhostSelectContent :offset="6">
          <GhostSelectOption value="updated">Last updated</GhostSelectOption>
          <GhostSelectOption value="name">Name</GhostSelectOption>
          <GhostSelectOption value="owner">Owner</GhostSelectOption>
        </GhostSelectContent>
      </GhostSelect>
    </div>

    <div class="toolbar__control toolbar__control--narrow">
      <span id="toolbar-rows-label" class="toolbar__label">Rows per page</span>
      <GhostSelect v-model="pageSize" placeholder="Rows per page">
        <GhostSelectTrigger aria-labelledby="toolbar-rows-label">
          <GhostSelectValue />
        </GhostSelectTrigger>
        <GhostSelectContent :offset="6">
          <GhostSelectOption value="10">10 rows</GhostSelectOption>
          <GhostSelectOption value="25">25 rows</GhostSelectOption>
          <GhostSelectOption value="50">50 rows</GhostSelectOption>
        </GhostSelectContent>
      </GhostSelect>
    </div>
  </div>
</template>

<style scoped>
/* A table toolbar: controls sit side by side and wrap on narrow previews. */
.toolbar {
  align-items: end;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-stack-md) var(--ghost-space-gap-md);
}

.toolbar__control {
  display: grid;
  flex: 0 1 12rem;
  gap: var(--ghost-space-gap-xs);
  min-inline-size: 0;
}

.toolbar__control--narrow {
  flex-basis: 9rem;
}

.toolbar__label {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  font-weight: var(--ghost-type-weight-medium);
  line-height: var(--ghost-type-line-snug);
}
</style>
