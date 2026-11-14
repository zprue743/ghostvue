<script setup lang="ts">
import { useTemplateRef } from 'vue'

import { GhostBadge, type GhostBadgeExposed } from '../src'

const badge = useTemplateRef<GhostBadgeExposed>('badge')

function handleClick(event: MouseEvent) {
  event.preventDefault()
}

void badge
void handleClick
</script>

<template>
  <GhostBadge
    id="row-status"
    ref="badge"
    class="meta"
    lang="en"
    title="Open"
    aria-label="12 unread"
    data-tone="neutral"
    @click="handleClick"
  >
    12
  </GhostBadge>
</template>
