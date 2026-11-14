<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostField,
  GhostFieldControl,
  GhostFieldDescription,
  GhostFieldLabel,
  GhostInput,
} from '@ghostvue/themes'

const region = ref('')
</script>

<template>
  <div class="ghost-theme">
    <GhostField>
      <GhostFieldLabel>Data region</GhostFieldLabel>
      <GhostFieldDescription>
        Stored replicas stay in this region.
      </GhostFieldDescription>
      <GhostFieldControl v-slot="field">
        <GhostInput v-bind="field" v-model="region" name="region" />
      </GhostFieldControl>
    </GhostField>
  </div>
</template>
