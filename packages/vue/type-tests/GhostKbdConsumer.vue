<script setup lang="ts">
import { GhostKbd } from '../src'

function handleClick(event: MouseEvent) {
  event.preventDefault()
}

void handleClick
</script>

<template>
  <GhostKbd
    id="save-shortcut"
    class="docs-kbd"
    lang="en"
    title="Save"
    aria-label="Save shortcut"
    :keys="['mod', 's']"
    platform="pc"
    @click="handleClick"
  />
</template>
