<script setup lang="ts">
import { computed, ref } from 'vue'

import {
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
  type GhostCommandPaletteCommandPayload,
} from '@ghostvue/vue'

interface Command {
  id: string
  label: string
  disabled?: boolean
}

// Static catalog keyed by the same ids the items emit on `command`.
const groups: { id: string; label: string; commands: Command[] }[] = [
  {
    id: 'navigation',
    label: 'Navigation',
    commands: [
      { id: 'go-dashboard', label: 'Go to dashboard' },
      { id: 'go-issues', label: 'Go to issues' },
      { id: 'go-billing', label: 'Go to billing', disabled: true },
    ],
  },
  {
    id: 'actions',
    label: 'Actions',
    commands: [
      { id: 'create-issue', label: 'Create issue' },
      { id: 'invite-member', label: 'Invite teammate' },
    ],
  },
]

const search = ref('')
const lastCommand = ref('None yet')

// The palette never filters: the consumer decides which items are mounted.
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
  const command = groups
    .flatMap((group) => group.commands)
    .find((entry) => entry.id === id)
  lastCommand.value = command?.label ?? id
}
</script>

<template>
  <div>
    <GhostCommandPalette v-model:search="search" @command="runCommand">
      <GhostCommandPaletteTrigger
        >Open command palette</GhostCommandPaletteTrigger
      >
      <GhostCommandPaletteOverlay />
      <GhostCommandPaletteContent>
        <GhostCommandPaletteTitle>Command palette</GhostCommandPaletteTitle>
        <GhostCommandPaletteInput placeholder="Type a command" />
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
                :disabled="command.disabled === true"
              >
                {{ command.label }}
              </GhostCommandPaletteItem>
            </GhostCommandPaletteGroup>
          </template>
          <GhostCommandPaletteEmpty
            >No commands found.</GhostCommandPaletteEmpty
          >
        </GhostCommandPaletteList>
      </GhostCommandPaletteContent>
    </GhostCommandPalette>
    <p>
      Last command: <output>{{ lastCommand }}</output>
    </p>
  </div>
</template>
