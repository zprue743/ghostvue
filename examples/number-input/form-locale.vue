<script setup lang="ts">
import { ref } from 'vue'

import { GhostNumberInput } from '@ghostvue/vue'

const submitted = ref('')

function onSubmit(event: Event): void {
  event.preventDefault()
  const data = new FormData(event.target as HTMLFormElement)
  const entry = data.get('amount')
  submitted.value = typeof entry === 'string' ? entry : ''
}
</script>

<template>
  <form data-testid="amount-form" @submit="onSubmit">
    <label for="amount-de">Betrag</label>
    <GhostNumberInput
      id="amount-de"
      :default-value="1234.5"
      locale="de-DE"
      :format-options="{ minimumFractionDigits: 1, maximumFractionDigits: 1 }"
      name="amount"
    />
    <button type="submit">Senden</button>
  </form>
  <p data-testid="amount-submitted">Submitted: {{ submitted }}</p>
</template>
