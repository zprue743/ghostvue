<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostField,
  GhostFieldControl,
  GhostFieldDescription,
  GhostFieldError,
  GhostFieldLabel,
  GhostInput,
} from '@ghostvue/vue'

const query = ref('a')
</script>

<template>
  <GhostField invalid required>
    <GhostFieldLabel required>Filter keyword</GhostFieldLabel>
    <GhostFieldDescription>
      Matches product titles in the catalog.
    </GhostFieldDescription>
    <GhostFieldControl v-slot="field">
      <GhostInput v-bind="field" v-model="query" name="filter" />
    </GhostFieldControl>
    <GhostFieldError>Enter at least two characters.</GhostFieldError>
  </GhostField>
</template>
