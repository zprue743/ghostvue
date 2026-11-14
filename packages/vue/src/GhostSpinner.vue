<script setup lang="ts">
import GhostVisuallyHidden from './GhostVisuallyHidden.vue'
import { useGhostSpinner } from './use-ghost-spinner'

// Declared props only; native HTML/ARIA stay fallthrough so the generator omits them.
const props = withDefaults(
  defineProps<{
    label?: string
  }>(),
  {
    label: 'Loading',
  },
)

// Hidden text is the live-region message. Status names come from the author
// (`aria-label`), so contents must stay in the tree to be announced.
const { label: message, rootProps } = useGhostSpinner({
  label: () => props.label,
})
</script>

<template>
  <span v-bind="rootProps">
    <GhostVisuallyHidden>{{ message }}</GhostVisuallyHidden>
  </span>
</template>
