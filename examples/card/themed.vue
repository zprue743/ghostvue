<script setup lang="ts">
import { GhostCard } from '@ghostvue/themes'
</script>

<template>
  <GhostCard interactive="spotlight" style="max-width: 24rem">
    <template #header>
      <h2 style="margin: 0">Themed card</h2>
    </template>
    Default elevation and padding from <code>@ghostvue/themes</code>.
    <template #footer>
      <span>Footer slot</span>
    </template>
  </GhostCard>
</template>
