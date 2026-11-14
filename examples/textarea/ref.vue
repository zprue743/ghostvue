<script setup lang="ts">
import { useTemplateRef } from 'vue'

import {
  GhostButton,
  GhostTextarea,
  type GhostTextareaExposed,
} from '@ghostvue/vue'

const field = useTemplateRef<GhostTextareaExposed>('field')

function focusNotes(): void {
  field.value?.focus()
}
</script>

<template>
  <div>
    <label for="ref-notes">Notes</label>
    <GhostTextarea id="ref-notes" ref="field" default-value="Focus me." />
    <GhostButton type="button" @click="focusNotes">
      Move focus to notes
    </GhostButton>
  </div>
</template>
