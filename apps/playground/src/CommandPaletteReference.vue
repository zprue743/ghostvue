<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostCommandPalette,
  GhostCommandPaletteContent,
  GhostCommandPaletteInput,
  GhostCommandPaletteItem,
  GhostCommandPaletteList,
  GhostCommandPaletteOverlay,
  GhostCommandPaletteTitle,
  GhostCommandPaletteTrigger,
  GhostPopover,
  GhostPopoverClose,
  GhostPopoverContent,
  GhostPopoverTrigger,
} from '@ghostvue/themes'

const lastCommand = ref('none')

function onCommand({ id }: { id: string }): void {
  lastCommand.value = id
}
</script>

<!--
  Browser fixtures for behaviors the docs examples do not cover: a portaled
  popover nested in a modal palette (ADR 0012 cross-overlay Tab) and a
  non-modal palette that closes when focus departs (C4).
-->
<template>
  <section
    aria-labelledby="command-palette-heading"
    data-testid="command-palette-demo-section"
  >
    <h2 id="command-palette-heading">GhostCommandPalette</h2>
    <p>
      Last command:
      <output data-testid="palette-last">{{ lastCommand }}</output>
    </p>

    <GhostCommandPalette @command="onCommand">
      <GhostCommandPaletteTrigger data-testid="palette-nested-trigger">
        Palette with popover
      </GhostCommandPaletteTrigger>
      <GhostCommandPaletteOverlay />
      <GhostCommandPaletteContent data-testid="palette-nested-content">
        <GhostCommandPaletteTitle
          >Palette with popover</GhostCommandPaletteTitle
        >
        <GhostCommandPaletteInput placeholder="Type a command" />
        <GhostCommandPaletteList>
          <GhostCommandPaletteItem id="reload">Reload</GhostCommandPaletteItem>
        </GhostCommandPaletteList>
        <GhostPopover>
          <GhostPopoverTrigger data-testid="palette-popover-trigger">
            Palette options
          </GhostPopoverTrigger>
          <GhostPopoverContent
            data-testid="palette-popover-content"
            placement="bottom-start"
            :offset="8"
          >
            <label for="palette-popover-input">Scope</label>
            <input
              id="palette-popover-input"
              data-testid="palette-popover-input"
              type="text"
            />
            <GhostPopoverClose data-testid="palette-popover-close">
              Done
            </GhostPopoverClose>
          </GhostPopoverContent>
        </GhostPopover>
      </GhostCommandPaletteContent>
    </GhostCommandPalette>

    <GhostCommandPalette :modal="false" @command="onCommand">
      <GhostCommandPaletteTrigger data-testid="palette-nonmodal-trigger">
        Non-modal palette
      </GhostCommandPaletteTrigger>
      <GhostCommandPaletteContent
        data-testid="palette-nonmodal-content"
        :portal="false"
      >
        <GhostCommandPaletteTitle>Non-modal palette</GhostCommandPaletteTitle>
        <GhostCommandPaletteInput placeholder="Type a command" />
        <GhostCommandPaletteList>
          <GhostCommandPaletteItem id="pin">Pin tab</GhostCommandPaletteItem>
        </GhostCommandPaletteList>
      </GhostCommandPaletteContent>
    </GhostCommandPalette>
    <button type="button" data-testid="palette-after">After palettes</button>
  </section>
</template>
