<script setup>
import { ref } from 'vue'

import { GhostButton, GhostInput } from '@ghostvue/themes'

const name = ref('')
</script>

<template>
  <GhostInput v-model="name" aria-label="Name" data-testid="name" />
  <GhostButton variant="outline" type="submit">Save</GhostButton>
</template>
