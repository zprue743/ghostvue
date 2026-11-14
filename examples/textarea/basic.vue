<script setup lang="ts">
import { ref } from 'vue'

import { GhostTextarea } from '@ghostvue/vue'

const notes = ref('Ship the notes field.')
</script>

<template>
  <div>
    <label for="notes">Notes</label>
    <GhostTextarea id="notes" v-model="notes" name="notes" />
  </div>
</template>
