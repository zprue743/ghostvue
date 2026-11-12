<script setup lang="ts">
import { ref } from 'vue'

import { GhostButton } from '@ghostvue/themes'

const saving = ref(false)
</script>

<template>
  <GhostButton variant="outline" tone="danger" :loading="saving">
    Delete
  </GhostButton>
</template>
