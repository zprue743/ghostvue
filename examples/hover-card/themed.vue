<script setup lang="ts">
import {
  GhostHoverCard,
  GhostHoverCardContent,
  GhostHoverCardTrigger,
} from '@ghostvue/themes'
</script>

<template>
  <fieldset class="ghost-theme" data-ghost-mode="light">
    <legend>Themed hover card</legend>
    <GhostHoverCard :open-delay="0" :close-delay="100">
      <GhostHoverCardTrigger>Design token preview</GhostHoverCardTrigger>
      <GhostHoverCardContent placement="top" :offset="6">
        <p>Elevation-3 surface with interactive link.</p>
        <a href="#">Open style guide</a>
      </GhostHoverCardContent>
    </GhostHoverCard>
  </fieldset>
</template>
