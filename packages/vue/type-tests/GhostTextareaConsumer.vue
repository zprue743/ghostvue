<script setup lang="ts">
import { useTemplateRef } from 'vue'

import { GhostTextarea, type GhostTextareaExposed } from '../src'

const field = useTemplateRef<GhostTextareaExposed>('field')

function handleInput(event: Event) {
  void (event.target as HTMLTextAreaElement).value
}

function focusField() {
  field.value?.focus({ preventScroll: true })
}

void focusField
</script>

<template>
  <GhostTextarea
    id="bio"
    ref="field"
    class="profile-bio"
    name="bio"
    form="profile-form"
    :rows="4"
    :maxlength="400"
    placeholder="About you"
    aria-describedby="bio-hint"
    data-size="lg"
    @input="handleInput"
  />
</template>
