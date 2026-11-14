<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostCheckbox,
  GhostField,
  GhostFieldControl,
  GhostFieldLabel,
} from '@ghostvue/vue'

const digest = ref(false)
</script>

<template>
  <GhostField>
    <GhostFieldLabel associate="wrap">
      <GhostFieldControl v-slot="field">
        <GhostCheckbox v-bind="field" v-model="digest" name="digest" />
      </GhostFieldControl>
      Weekly activity digest
    </GhostFieldLabel>
  </GhostField>
</template>
