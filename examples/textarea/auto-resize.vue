<script setup lang="ts">
import { ref } from 'vue'

import { GhostTextarea } from '@ghostvue/themes'

const draft = ref('Type more lines.\nThe field grows until maxRows.')
</script>

<template>
  <div>
    <label for="auto-notes">Draft</label>
    <GhostTextarea
      id="auto-notes"
      v-model="draft"
      :rows="3"
      :max-rows="6"
      auto-resize
    />
  </div>
</template>
