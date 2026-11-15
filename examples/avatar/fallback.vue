<script setup lang="ts">
import { GhostAvatar } from '@ghostvue/vue'
</script>

<template>
  <GhostAvatar src="/missing-avatar.png" name="Ghost Vue">
    <template #fallback>
      <span aria-hidden="true">👻</span>
    </template>
  </GhostAvatar>
</template>
