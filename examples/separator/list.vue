<script setup lang="ts">
import { GhostSeparator } from '@ghostvue/vue'
</script>

<template>
  <ul role="menu" aria-label="File">
    <li role="menuitem">New</li>
    <li role="menuitem">Open</li>
    <GhostSeparator as="li" />
    <li role="menuitem">Quit</li>
  </ul>
</template>
