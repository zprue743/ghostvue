<script setup lang="ts">
import { useTemplateRef } from 'vue'

import { GhostSwitch, type GhostSwitchExposed } from '../src'

const control = useTemplateRef<GhostSwitchExposed>('control')

function handleClick(event: MouseEvent) {
  event.preventDefault()
}

function focusSwitch() {
  control.value?.focus({ preventScroll: true })
}

void focusSwitch
</script>

<template>
  <GhostSwitch
    id="airplane"
    ref="control"
    class="setting"
    name="air"
    value="on"
    form="settings-form"
    aria-label="Airplane mode"
    @click="handleClick"
  />
</template>
