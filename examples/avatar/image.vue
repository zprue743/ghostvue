<script setup lang="ts">
import { GhostAvatar } from '@ghostvue/vue'

const src =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#4f46e5"/></svg>',
  )
</script>

<template>
  <GhostAvatar :src="src" name="Indigo Square" alt="Indigo avatar" />
</template>
