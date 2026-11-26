<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

import { useGhostButton } from '@ghostvue/vue'

const saving = ref(false)
const { rootProps } = useGhostButton({ loading: saving })
let resetTimer: ReturnType<typeof setTimeout> | undefined

function save(): void {
  saving.value = true
  resetTimer = setTimeout(() => {
    saving.value = false
  }, 1200)
}

onBeforeUnmount(() => {
  clearTimeout(resetTimer)
})
</script>

<template>
  <button v-bind="rootProps" @click="save">Save</button>
</template>
