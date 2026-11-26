<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

import { GhostButton } from '@ghostvue/themes'

const saving = ref(false)
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
  <!--
    Visual props describe intent. `type` defaults to button so this control
    does not submit a surrounding form. Loading keeps the control focusable
    while the pending request runs.
  -->
  <GhostButton
    variant="solid"
    tone="accent"
    size="md"
    :loading="saving"
    @click="save"
  >
    Save changes
  </GhostButton>
</template>
