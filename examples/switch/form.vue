<script setup lang="ts">
import { ref } from 'vue'

import { GhostButton, GhostSwitch } from '@ghostvue/themes'

const submitted = ref('')

function onSubmit(event: Event): void {
  event.preventDefault()
  const data = new FormData(event.target as HTMLFormElement)
  const digest = data.get('digest')
  submitted.value = typeof digest === 'string' ? digest : 'off'
}
</script>

<template>
  <form @submit="onSubmit">
    <label for="digest">Daily digest</label>
    <GhostSwitch id="digest" name="digest" value="daily" default-value />
    <GhostButton type="submit">Save</GhostButton>
    <GhostButton type="reset" variant="ghost" tone="neutral">Reset</GhostButton>
    <p v-if="submitted">Submitted: {{ submitted }}</p>
  </form>
</template>
