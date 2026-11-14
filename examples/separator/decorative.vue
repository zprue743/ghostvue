<script setup lang="ts">
import { GhostSeparator } from '@ghostvue/vue'
</script>

<template>
  <section>
    <p>The line below is visual only.</p>
    <GhostSeparator decorative />
    <p>Assistive technology reads these paragraphs as contiguous.</p>
  </section>
</template>
