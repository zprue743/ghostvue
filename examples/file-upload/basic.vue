<script setup lang="ts">
import {
  GhostFileUpload,
  GhostFileUploadDropzone,
  GhostFileUploadItem,
  GhostFileUploadItemRemove,
  GhostFileUploadList,
  GhostFileUploadTrigger,
} from '@ghostvue/vue'
</script>

<template>
  <GhostFileUpload v-slot="{ entries }">
    <GhostFileUploadDropzone v-slot="{ dragging }" data-testid="dropzone">
      <p>{{ dragging ? 'Drop to add files' : 'Drag files here, or' }}</p>
      <GhostFileUploadTrigger>Choose files</GhostFileUploadTrigger>
    </GhostFileUploadDropzone>
    <GhostFileUploadList aria-label="Selected files">
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
