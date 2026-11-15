<script setup lang="ts">
import { GhostCard } from '../src'
</script>

<template>
  <GhostCard :effects="['spotlight']" as="article" class="panel">
    <template #header>Title</template>
    Body copy
    <template #footer>
      <button type="button">Action</button>
    </template>
  </GhostCard>
</template>
