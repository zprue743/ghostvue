<script setup lang="ts">
import {
  GhostSelect,
  GhostSelectContent,
  GhostSelectOption,
  GhostSelectTrigger,
  GhostSelectValue,
} from '@ghostvue/vue'
</script>

<template>
  <form data-testid="select-form">
    <GhostSelect name="cadence" default-value="weekly">
      <GhostSelectTrigger>
        <GhostSelectValue placeholder="How often" />
      </GhostSelectTrigger>
      <GhostSelectContent :portal="false">
        <GhostSelectOption value="daily">Daily</GhostSelectOption>
        <GhostSelectOption value="weekly">Weekly</GhostSelectOption>
        <GhostSelectOption value="monthly">Monthly</GhostSelectOption>
      </GhostSelectContent>
    </GhostSelect>
    <button type="reset">Reset</button>
    <button type="submit">Submit</button>
  </form>
</template>
