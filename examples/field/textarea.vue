<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostField,
  GhostFieldControl,
  GhostFieldDescription,
  GhostFieldLabel,
  GhostTextarea,
} from '@ghostvue/vue'

const notes = ref('')
</script>

<template>
  <GhostField>
    <GhostFieldLabel>Release notes</GhostFieldLabel>
    <GhostFieldDescription>
      Summarize what changed for operators.
    </GhostFieldDescription>
    <GhostFieldControl v-slot="field">
      <GhostTextarea v-bind="field" v-model="notes" name="notes" :rows="3" />
    </GhostFieldControl>
  </GhostField>
</template>
