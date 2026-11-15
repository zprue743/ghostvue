<script setup lang="ts">
import {
  GhostCombobox,
  GhostComboboxContent,
  GhostComboboxInput,
  GhostComboboxOption,
} from '@ghostvue/vue'
</script>

<template>
  <form data-testid="combobox-form">
    <GhostCombobox name="cadence" default-value="weekly">
      <GhostComboboxInput
        aria-label="Email cadence"
        placeholder="How often"
      />
      <GhostComboboxContent :portal="false">
        <GhostComboboxOption value="daily" text-value="Daily">Daily</GhostComboboxOption>
        <GhostComboboxOption value="weekly" text-value="Weekly">Weekly</GhostComboboxOption>
        <GhostComboboxOption value="monthly" text-value="Monthly">Monthly</GhostComboboxOption>
      </GhostComboboxContent>
    </GhostCombobox>
    <button type="reset">Reset</button>
    <button type="submit">Submit</button>
  </form>
</template>