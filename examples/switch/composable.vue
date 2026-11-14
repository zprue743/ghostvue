<script setup lang="ts">
import { useGhostSwitch } from '@ghostvue/vue'

const { rootProps } = useGhostSwitch()
</script>

<template>
  <div>
    <label for="wifi">Wi-Fi</label>
    <button id="wifi" v-bind="rootProps">
      <span data-part="track" aria-hidden="true">
        <span data-part="thumb" />
      </span>
    </button>
  </div>
</template>
