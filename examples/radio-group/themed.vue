<script setup lang="ts">
import { ref } from 'vue'

import { GhostRadioGroup, GhostRadioGroupItem } from '@ghostvue/themes'

const density = ref('comfortable')
</script>

<template>
  <div class="ghost-theme">
    <GhostRadioGroup v-model="density" name="density" orientation="horizontal">
      <label>
        <GhostRadioGroupItem value="compact" />
        Compact
      </label>
      <label>
        <GhostRadioGroupItem value="comfortable" />
        Comfortable
      </label>
      <label>
        <GhostRadioGroupItem value="spacious" />
        Spacious
      </label>
    </GhostRadioGroup>
  </div>
</template>

<style scoped>
label {
  align-items: center;
  display: inline-flex;
  gap: 0.5rem;
  margin-inline-end: 1rem;
}
</style>
