<script setup lang="ts">
import { computed, ref } from 'vue'

import {
  GhostButton,
  GhostCommandPalette,
  GhostCommandPaletteContent,
  GhostCommandPaletteEmpty,
  GhostCommandPaletteGroup,
  GhostCommandPaletteInput,
  GhostCommandPaletteItem,
  GhostCommandPaletteLabel,
  GhostCommandPaletteList,
  GhostCommandPaletteOverlay,
  GhostCommandPaletteSeparator,
  GhostCommandPaletteTitle,
  GhostCommandPaletteTrigger,
  GhostKbd,
  type GhostCommandPaletteCommandPayload,
} from '@ghostvue/themes'

interface Command {
  id: string
  label: string
  keys?: readonly string[]
}

const groups: { id: string; label: string; commands: Command[] }[] = [
  {
    id: 'suggested',
    label: 'Suggested',
    commands: [
      { id: 'new-doc', label: 'New document', keys: ['mod', 'n'] },
      { id: 'search-docs', label: 'Search documents', keys: ['mod', 'p'] },
      { id: 'share', label: 'Share current document' },
    ],
  },
  {
    id: 'preferences',
    label: 'Preferences',
    commands: [
      { id: 'theme-dark', label: 'Switch to dark theme' },
      { id: 'theme-light', label: 'Switch to light theme' },
      { id: 'shortcuts', label: 'Keyboard shortcuts', keys: ['?'] },
    ],
  },
]

const search = ref('')
const lastCommand = ref('None yet')

const visibleGroups = computed(() => {
  const query = search.value.trim().toLowerCase()
  return groups
    .map((group) => ({
      ...group,
      commands: group.commands.filter((command) =>
        command.label.toLowerCase().includes(query),
      ),
    }))
    .filter((group) => group.commands.length > 0)
})

function runCommand({ id }: GhostCommandPaletteCommandPayload): void {
  lastCommand.value =
    groups.flatMap((group) => group.commands).find((c) => c.id === id)?.label ??
    id
}
</script>

<template>
  <div class="palette-themed">
    <GhostCommandPalette v-model:search="search" @command="runCommand">
      <GhostCommandPaletteTrigger :as="GhostButton" variant="outline">
        Search commands
        <GhostKbd :keys="['mod']">K</GhostKbd>
      </GhostCommandPaletteTrigger>
      <GhostCommandPaletteOverlay />
      <GhostCommandPaletteContent>
        <GhostCommandPaletteTitle>Commands</GhostCommandPaletteTitle>
        <GhostCommandPaletteInput placeholder="Type a command or search" />
        <GhostCommandPaletteList>
          <template v-for="(group, index) in visibleGroups" :key="group.id">
            <GhostCommandPaletteSeparator v-if="index > 0" />
            <GhostCommandPaletteGroup>
              <GhostCommandPaletteLabel>{{
                group.label
              }}</GhostCommandPaletteLabel>
              <GhostCommandPaletteItem
                v-for="command in group.commands"
                :id="command.id"
                :key="command.id"
                :text-value="command.label"
              >
                <span class="palette-themed__label">{{ command.label }}</span>
                <GhostKbd v-if="command.keys" :keys="command.keys" />
              </GhostCommandPaletteItem>
            </GhostCommandPaletteGroup>
          </template>
          <GhostCommandPaletteEmpty
            >No commands found.</GhostCommandPaletteEmpty
          >
        </GhostCommandPaletteList>
        <!--
          Consumer-owned footer (C6): the palette has no footer slot. Hints are
          plain text after the list, outside the listbox.
        -->
        <div class="palette-themed__footer">
          <span
            ><GhostKbd keys="up" /> <GhostKbd keys="down" /> to navigate</span
          >
          <span><GhostKbd keys="enter" /> to run</span>
          <span><GhostKbd keys="esc" /> to close</span>
        </div>
      </GhostCommandPaletteContent>
    </GhostCommandPalette>
    <p class="palette-themed__status">
      Last command: <output>{{ lastCommand }}</output>
    </p>
  </div>
</template>

<style scoped>
.palette-themed {
  align-items: flex-start;
  display: grid;
  gap: var(--ghost-space-gap-sm);
  justify-items: start;
}

.palette-themed__status {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  margin: 0;
}

.palette-themed__label {
  flex: 1;
}

.palette-themed__footer {
  border-block-start: var(--ghost-border-hairline-width) solid
    var(--ghost-border-default);
  color: var(--ghost-text-muted);
  display: flex;
  flex-wrap: wrap;
  font-size: var(--ghost-type-size-sm);
  gap: var(--ghost-space-gap-md);
  padding-block-start: var(--ghost-space-inset-sm);
  padding-inline: var(--ghost-space-inset-sm);
}
</style>
