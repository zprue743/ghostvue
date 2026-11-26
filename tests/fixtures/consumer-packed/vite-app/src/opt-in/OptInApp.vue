<script setup>
import { ref } from 'vue'

import {
  GhostButton,
  GhostField,
  GhostFieldControl,
  GhostFieldLabel,
  GhostInput,
} from '@ghostvue/themes/components'

const workspace = ref('Ada')
</script>

<template>
  <div data-ghost-theme="calm">
    <main>
      <GhostField>
        <GhostFieldLabel>Workspace name</GhostFieldLabel>
        <GhostFieldControl v-slot="field">
          <GhostInput
            v-bind="field"
            v-model="workspace"
            name="workspace"
            data-smoke="input"
          />
        </GhostFieldControl>
      </GhostField>
      <GhostButton data-smoke="save">Save</GhostButton>
    </main>
  </div>
</template>
