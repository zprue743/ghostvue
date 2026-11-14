<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'

import { GhostInput, type GhostInputExposed } from '../src'

const query = ref('reports')
const field = useTemplateRef<GhostInputExposed>('field')

function handleInput(event: Event) {
  event.preventDefault()
}

function focusField() {
  field.value?.focus({ preventScroll: true })
}

void focusField
</script>

<template>
  <GhostInput
    id="global-search"
    ref="field"
    v-model="query"
    class="product-input"
    type="search"
    name="q"
    placeholder="Search reports"
    autocomplete="off"
    aria-label="Search reports"
    aria-describedby="search-help"
    @input="handleInput"
  />
</template>
