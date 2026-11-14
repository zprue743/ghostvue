<script setup lang="ts">
import { GhostButton, GhostEmptyState } from '@ghostvue/themes'
</script>

<template>
  <div class="ghost-theme" data-ghost-mode="light">
    <GhostEmptyState :heading-level="2">
      <template #visual>
        <svg aria-hidden="true" viewBox="0 0 48 48" width="48" height="48">
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          />
          <path
            d="M16 24h16M24 16v16"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </template>
      <template #title>Start a project</template>
      <template #description>
        Projects you create will appear in this list.
      </template>
      <template #actions>
        <GhostButton type="button">New project</GhostButton>
      </template>
    </GhostEmptyState>
  </div>
</template>
