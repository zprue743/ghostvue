<script setup lang="ts">
import { ref } from 'vue'

import { useGhostButton } from '@ghostvue/vue'

const saving = ref(false)
const { rootProps } = useGhostButton({ loading: saving })

function save(): void {
  saving.value = true
}
</script>

<template>
  <button v-bind="rootProps" @click="save">Save</button>
</template>
