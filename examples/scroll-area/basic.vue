<script setup lang="ts">
import { GhostScrollArea } from '@ghostvue/vue'
</script>

<template>
  <div class="scroll-area-example">
    <GhostScrollArea
      label="Activity log"
      style="max-block-size: 8rem"
      data-testid="scroll-area-vertical"
    >
      <p v-for="index in 12" :key="index">
        Event {{ index }}: backup checkpoint completed.
      </p>
    </GhostScrollArea>
  </div>
</template>

<style scoped>
.scroll-area-example {
  inline-size: 100%;
  max-inline-size: 24rem;
}
</style>
