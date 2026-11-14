<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostField,
  GhostFieldControl,
  GhostFieldDescription,
  GhostFieldLabel,
  GhostInput,
} from '@ghostvue/vue'

const name = ref('')
</script>

<template>
  <GhostField>
    <GhostFieldLabel>Display name</GhostFieldLabel>
    <GhostFieldDescription>
      Visible to teammates in your workspace.
    </GhostFieldDescription>
    <GhostFieldControl v-slot="field">
      <GhostInput v-bind="field" v-model="name" name="display-name" />
    </GhostFieldControl>
  </GhostField>
</template>
