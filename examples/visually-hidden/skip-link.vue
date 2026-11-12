<script setup lang="ts">
import { GhostVisuallyHidden } from '@ghostvue/vue'
</script>

<template>
  <GhostVisuallyHidden focusable>
    <a href="#visually-hidden-skip-link-main">Skip to content</a>
  </GhostVisuallyHidden>
  <div id="visually-hidden-skip-link-main" tabindex="-1">
    Page content starts here.
  </div>
</template>
