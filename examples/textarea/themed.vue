<script setup lang="ts">
import { ref } from 'vue'

import { GhostTextarea } from '@ghostvue/themes'

const bio = ref('')
</script>

<template>
  <div>
    <label for="themed-bio">Bio</label>
    <GhostTextarea
      id="themed-bio"
      v-model="bio"
      size="lg"
      placeholder="A short bio"
    />
  </div>
</template>
