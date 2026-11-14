<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'

import { GhostSwitch, type GhostSwitchExposed } from '../src'

const airplaneMode = ref(false)
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
    v-model="airplaneMode"
    class="setting"
    name="air"
    value="on"
    form="settings-form"
    aria-label="Airplane mode"
    @click="handleClick"
  />
</template>
