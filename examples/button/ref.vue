<script setup lang="ts">
import { useTemplateRef } from 'vue'

import { GhostButton, type GhostButtonExposed } from '@ghostvue/vue'

const saveButton = useTemplateRef<GhostButtonExposed>('saveButton')

function returnFocus(): void {
  saveButton.value?.focus()
}
</script>

<template>
  <GhostButton ref="saveButton">Save changes</GhostButton>
  <button type="button" @click="returnFocus">Move focus to save</button>
</template>
