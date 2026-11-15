<script setup lang="ts">
import { GhostButton, GhostCard } from '@ghostvue/vue'
</script>

<template>
  <GhostCard>
    <template #header>
      <h2 style="margin: 0">Notifications</h2>
    </template>
    <p style="margin: 0">You have no unread notifications.</p>
    <template #footer>
      <GhostButton type="button">View archive</GhostButton>
    </template>
  </GhostCard>
</template>
