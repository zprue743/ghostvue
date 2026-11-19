<script setup lang="ts">
import { useTemplateRef } from 'vue'

import { GhostSwitch, type GhostSwitchExposed } from '@ghostvue/vue'

const control = useTemplateRef<GhostSwitchExposed>('control')

function focusSwitch(): void {
  control.value?.focus()
}
</script>

<template>
  <div class="switch-row">
    <label for="focus-demo">Focus demo</label>
    <GhostSwitch id="focus-demo" ref="control" />
    <button type="button" @click="focusSwitch">Move focus to switch</button>
  </div>
</template>

<style scoped>
/*
 * Headless path ships no visuals; this is consumer CSS for the sample. The
 * track and thumb render inside the switch button, so scoped CSS needs
 * :deep(). System colors follow light and dark mode without a theme.
 */
.switch-row {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.switch-row :deep([data-part='track']) {
  background: Canvas;
  block-size: 1.25rem;
  border: 1px solid GrayText;
  border-radius: 999px;
  box-sizing: border-box;
  display: block;
  inline-size: 2.25rem;
  position: relative;
}

.switch-row :deep([data-part='thumb']) {
  background: GrayText;
  block-size: 0.875rem;
  border-radius: 50%;
  inline-size: 0.875rem;
  inset-block-start: calc(50% - 0.4375rem);
  inset-inline-start: 0.125rem;
  position: absolute;
}

.switch-row :deep([aria-checked='true'] [data-part='track']) {
  background: Highlight;
  border-color: Highlight;
}

.switch-row :deep([aria-checked='true'] [data-part='thumb']) {
  background: HighlightText;
  inset-inline-start: calc(100% - 1rem);
}
</style>
