<script setup lang="ts">
import { useTemplateRef } from 'vue'

import { SlButton, type SlButtonExposed } from '../src'

const button = useTemplateRef<SlButtonExposed>('button')

function handleClick(event: MouseEvent) {
  event.preventDefault()
}

function focusButton() {
  button.value?.focus({ preventScroll: true })
}

void focusButton
</script>

<template>
  <SlButton
    ref="button"
    class="product-button"
    type="submit"
    name="intent"
    value="save"
    form="settings-form"
    formaction="/settings"
    formmethod="post"
    autofocus
    aria-label="Save changes"
    data-variant="soft"
    data-tone="neutral"
    @click="handleClick"
  />
</template>
