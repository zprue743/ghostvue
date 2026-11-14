<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostField,
  GhostFieldControl,
  GhostFieldDescription,
  GhostFieldError,
  GhostFieldLabel,
  GhostRadioGroup,
  GhostRadioGroupItem,
} from '@ghostvue/vue'

const channel = ref('email')
</script>

<template>
  <GhostField invalid required>
    <GhostFieldLabel>Preferred alert channel</GhostFieldLabel>
    <GhostFieldDescription>
      On-call routing uses this preference first.
    </GhostFieldDescription>
    <GhostFieldControl v-slot="field">
      <GhostRadioGroup v-bind="field" v-model="channel" name="alert-channel">
        <label>
          <GhostRadioGroupItem value="email" />
          Email
        </label>
        <label>
          <GhostRadioGroupItem value="sms" />
          SMS
        </label>
        <label>
          <GhostRadioGroupItem value="push" />
          Push
        </label>
      </GhostRadioGroup>
    </GhostFieldControl>
    <GhostFieldError>Choose a channel before saving.</GhostFieldError>
  </GhostField>
</template>

<style scoped>
label {
  align-items: center;
  display: flex;
  gap: 0.5rem;
}
</style>
