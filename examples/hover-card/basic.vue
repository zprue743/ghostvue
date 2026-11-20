<script setup lang="ts">
import {
  GhostHoverCard,
  GhostHoverCardContent,
  GhostHoverCardTrigger,
} from '@ghostvue/vue'
</script>

<template>
  <div class="hover-card-basic">
    <GhostHoverCard :open-delay="300" :close-delay="150">
      <GhostHoverCardTrigger aria-label="Contributor profile preview">
        @ghostvue
      </GhostHoverCardTrigger>
      <GhostHoverCardContent class="hover-card-basic__panel" :offset="8">
        <p class="hover-card-basic__text">
          <strong>GhostVue</strong> — headless Vue primitives.
        </p>
        <a href="https://github.com/zprue743/ghostvue">View repository</a>
      </GhostHoverCardContent>
    </GhostHoverCard>
  </div>
</template>

<style scoped>
.hover-card-basic {
  display: inline-block;
}

.hover-card-basic__text {
  margin: 0 0 0.25rem;
}
</style>
