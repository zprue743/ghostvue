<script setup lang="ts">
import { ref } from 'vue'

import { GhostRadioGroup, GhostRadioGroupItem } from '@ghostvue/vue'

const plan = ref('starter')
</script>

<template>
  <GhostRadioGroup v-model="plan" name="plan">
    <label>
      <GhostRadioGroupItem value="starter" />
      Starter
    </label>
    <label>
      <GhostRadioGroupItem value="pro" />
      Pro
    </label>
    <label>
      <GhostRadioGroupItem value="enterprise" />
      Enterprise
    </label>
  </GhostRadioGroup>
  <p>Selected plan: {{ plan }}</p>
</template>

<style scoped>
label {
  align-items: center;
  display: flex;
  gap: 0.5rem;
}
</style>
