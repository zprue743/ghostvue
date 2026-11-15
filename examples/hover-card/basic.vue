<script setup lang="ts">
import {
  GhostHoverCard,
  GhostHoverCardContent,
  GhostHoverCardTrigger,
} from '@ghostvue/vue'
</script>

<template>
  <GhostHoverCard :open-delay="300" :close-delay="150">
    <GhostHoverCardTrigger aria-label="Contributor profile preview">
      @ghostvue
    </GhostHoverCardTrigger>
    <GhostHoverCardContent :offset="8">
      <p><strong>GhostVue</strong> — headless Vue primitives.</p>
      <a href="https://github.com/zprue743/ghostvue">View repository</a>
    </GhostHoverCardContent>
  </GhostHoverCard>
</template>
