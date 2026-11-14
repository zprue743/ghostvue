<script setup lang="ts">
import { GhostSeparator } from '@ghostvue/vue'
</script>

<template>
  <ul>
    <li>New</li>
    <li>Open</li>
    <GhostSeparator as="li" />
    <li>Quit</li>
  </ul>
</template>
