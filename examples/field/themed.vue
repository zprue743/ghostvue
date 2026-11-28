<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostField,
  GhostFieldControl,
  GhostFieldDescription,
  GhostFieldLabel,
  GhostInput,
} from '@ghostvue/themes'

// Colors and density come from the `data-ghost-theme` host on `<html>`. Do
// not wrap the template in `.ghost-theme`: that class hosts the default
// palette and would override the app's flagship around the field.
const region = ref('')
</script>

<template>
  <GhostField>
    <GhostFieldLabel>Data region</GhostFieldLabel>
    <GhostFieldDescription>
      Stored replicas stay in this region.
    </GhostFieldDescription>
    <GhostFieldControl v-slot="field">
      <GhostInput v-bind="field" v-model="region" name="region" />
    </GhostFieldControl>
  </GhostField>
</template>
