<script setup lang="ts">
import {
  GhostFileUpload,
  GhostFileUploadItem,
  GhostFileUploadItemRemove,
  GhostFileUploadList,
  GhostFileUploadTrigger,
} from '@ghostvue/vue'
</script>

<template>
  <!-- maxFiles: 1 turns native `multiple` off; a second file is rejected until the first is removed. -->
  <GhostFileUpload
    v-slot="{ entries, remaining }"
    accept="image/*"
    :max-files="1"
  >
    <GhostFileUploadTrigger :disabled="remaining === 0">
      Choose avatar
    </GhostFileUploadTrigger>
    <GhostFileUploadList aria-label="Avatar">
      <GhostFileUploadItem
        v-for="entry in entries"
        :key="entry.id"
        :file="entry.file"
      >
        <span>{{ entry.file.name }}</span>
        {{ ' ' }}
        <GhostFileUploadItemRemove>Remove</GhostFileUploadItemRemove>
      </GhostFileUploadItem>
    </GhostFileUploadList>
  </GhostFileUpload>
</template>
