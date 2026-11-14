<script setup lang="ts">
import { GhostKbd } from '@ghostvue/themes'
</script>

<template>
  Save with <GhostKbd :keys="['mod', 's']" platform="pc" /> or
  <GhostKbd size="sm">Esc</GhostKbd> to cancel.
</template>
