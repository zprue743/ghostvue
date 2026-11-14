<script setup lang="ts">
import { ref } from 'vue'

import { GhostButton, GhostTextarea } from '@ghostvue/themes'

const comment = ref('')
const submitted = ref('')

function submit(event: Event): void {
  event.preventDefault()
  const value = new FormData(event.target as HTMLFormElement).get('comment')
  submitted.value = typeof value === 'string' ? value : ''
}
</script>

<template>
  <form @submit="submit">
    <label for="comment">Comment</label>
    <GhostTextarea id="comment" v-model="comment" name="comment" required />
    <GhostButton type="submit">Send</GhostButton>
    <p v-if="submitted">Sent: {{ submitted }}</p>
  </form>
</template>
