<script setup lang="ts">
import { ref } from 'vue'

import { useGhostCheckbox } from '@ghostvue/vue'

const accepted = ref(false)
const { rootProps } = useGhostCheckbox({
  modelValue: accepted,
  onChange: (value) => {
    accepted.value = value
  },
})
</script>

<template>
  <label>
    <input v-bind="rootProps" name="tos" />
    Accept terms
  </label>
</template>

<style scoped>
label {
  align-items: center;
  display: inline-flex;
  gap: 0.5rem;
}
</style>
