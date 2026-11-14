<script setup lang="ts">
import { useTemplateRef } from 'vue'

import { GhostSwitch, type GhostSwitchExposed } from '@ghostvue/vue'

const control = useTemplateRef<GhostSwitchExposed>('control')

function focusSwitch(): void {
  control.value?.focus()
}
</script>

<template>
  <div>
    <label for="focus-demo">Focus demo</label>
    <GhostSwitch id="focus-demo" ref="control" />
    <button type="button" @click="focusSwitch">Move focus to switch</button>
  </div>
</template>
