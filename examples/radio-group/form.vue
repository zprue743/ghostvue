<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostButton,
  GhostRadioGroup,
  GhostRadioGroupItem,
} from '@ghostvue/vue'

const region = ref('us-east')
const submitted = ref('')
</script>

<template>
  <form @submit.prevent="submitted = region" @reset="submitted = ''">
    <GhostRadioGroup v-model="region" name="region" default-value="us-east">
      <legend>Deploy region</legend>
      <label>
        <GhostRadioGroupItem value="us-east" />
        US East
      </label>
      <label>
        <GhostRadioGroupItem value="eu-west" />
        EU West
      </label>
    </GhostRadioGroup>
    <GhostButton type="submit">Save region</GhostButton>
    <GhostButton type="reset">Reset region</GhostButton>
    <p v-if="submitted">Saved region: {{ submitted }}</p>
  </form>
</template>

<style scoped>
label {
  align-items: center;
  display: flex;
  gap: 0.5rem;
}
form {
  display: grid;
  gap: 0.75rem;
}
</style>
