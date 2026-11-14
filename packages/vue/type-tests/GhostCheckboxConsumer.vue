<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'

import { GhostCheckbox, type GhostCheckboxExposed } from '../src'

const accepted = ref(false)
const checkbox = useTemplateRef<GhostCheckboxExposed>('checkbox')

function handleChange(event: Event) {
  event.preventDefault()
}

function focusCheckbox() {
  checkbox.value?.focus({ preventScroll: true })
}

void focusCheckbox
</script>

<template>
  <label for="tos">Accept terms</label>
  <GhostCheckbox
    id="tos"
    ref="checkbox"
    v-model="accepted"
    class="product-checkbox"
    name="tos"
    value="accepted"
    form="signup-form"
    required
    aria-describedby="tos-help"
    @change="handleChange"
  />
</template>
