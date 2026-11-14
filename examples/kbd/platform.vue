<script setup lang="ts">
import { GhostKbd } from '@ghostvue/vue'
</script>

<template>
  <p>
    Apple:
    <GhostKbd :keys="['mod', 'shift', 'p']" platform="apple" />
  </p>
  <p>
    PC:
    <GhostKbd :keys="['mod', 'shift', 'p']" platform="pc" />
  </p>
</template>
