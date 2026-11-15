<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostCombobox,
  GhostComboboxContent,
  GhostComboboxInput,
  GhostComboboxOption,
  GhostField,
  GhostFieldControl,
  GhostFieldDescription,
  GhostFieldLabel,
} from '@ghostvue/vue'

const operator = ref<string | undefined>(undefined)
</script>

<template>
  <GhostField required>
    <GhostFieldLabel>Filter operator</GhostFieldLabel>
    <GhostFieldDescription>Type to narrow operators.</GhostFieldDescription>
    <GhostFieldControl v-slot="field">
      <GhostCombobox v-model="operator">
        <GhostComboboxInput v-bind="field" placeholder="Choose operator" />
        <GhostComboboxContent :portal="false">
          <GhostComboboxOption value="eq" text-value="Equals">
            Equals
          </GhostComboboxOption>
          <GhostComboboxOption value="contains" text-value="Contains">
            Contains
          </GhostComboboxOption>
          <GhostComboboxOption value="starts" text-value="Starts with">
            Starts with
          </GhostComboboxOption>
        </GhostComboboxContent>
      </GhostCombobox>
    </GhostFieldControl>
  </GhostField>
</template>
