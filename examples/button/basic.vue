<script setup lang="ts">
import { ref } from 'vue'

import { GhostButton } from '@ghostvue/vue'

const saved = ref(false)

function save(): void {
  saved.value = true
}
</script>

<template>
  <GhostButton @click="save">Save changes</GhostButton>
</template>
