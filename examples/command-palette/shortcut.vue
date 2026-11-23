<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'

import {
  GhostCommandPalette,
  GhostCommandPaletteContent,
  GhostCommandPaletteEmpty,
  GhostCommandPaletteInput,
  GhostCommandPaletteItem,
  GhostCommandPaletteList,
  GhostCommandPaletteOverlay,
  GhostCommandPaletteTitle,
  GhostKbd,
  type GhostCommandPaletteCommandPayload,
  type GhostCommandPaletteExposed,
} from '@ghostvue/vue'

const commands = [
  { id: 'bold', label: 'Toggle bold' },
  { id: 'italic', label: 'Toggle italic' },
  { id: 'clear', label: 'Clear formatting' },
] as const

const palette = useTemplateRef<GhostCommandPaletteExposed>('palette')
const lastCommand = ref('None yet')

/*
 * The application owns the shortcut. The palette installs no global
 * listener; this one calls the exposed `open()`. Focus returns to whatever
 * was focused when the shortcut fired (here, the draft) because the dialog
 * saves the opener even without a visible trigger.
 */
function onKeydown(event: KeyboardEvent): void {
  if (
    (event.metaKey || event.ctrlKey) &&
    !event.altKey &&
    event.key.toLowerCase() === 'k'
  ) {
    event.preventDefault()
    palette.value?.open()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})

function onCommand({ id }: GhostCommandPaletteCommandPayload): void {
  lastCommand.value = commands.find((command) => command.id === id)?.label ?? id
}
</script>

<template>
  <div>
    <p>
      Press <GhostKbd :keys="['mod']">K</GhostKbd> anywhere on this page to open
      the formatting commands.
    </p>
    <textarea aria-label="Draft" rows="3">Release notes draft</textarea>
    <p>
      Last command: <output>{{ lastCommand }}</output>
    </p>
    <GhostCommandPalette ref="palette" @command="onCommand">
      <GhostCommandPaletteOverlay />
      <GhostCommandPaletteContent>
        <GhostCommandPaletteTitle>Formatting commands</GhostCommandPaletteTitle>
        <GhostCommandPaletteInput placeholder="Type a command" />
        <GhostCommandPaletteList>
          <GhostCommandPaletteItem
            v-for="command in commands"
            :id="command.id"
            :key="command.id"
          >
            {{ command.label }}
          </GhostCommandPaletteItem>
          <GhostCommandPaletteEmpty
            >No commands found.</GhostCommandPaletteEmpty
          >
        </GhostCommandPaletteList>
      </GhostCommandPaletteContent>
    </GhostCommandPalette>
  </div>
</template>
