<script setup lang="ts">
import {
  GhostFileUpload,
  GhostFileUploadDropzone,
  GhostFileUploadItem,
  GhostFileUploadItemRemove,
  GhostFileUploadList,
  GhostFileUploadTrigger,
} from '@ghostvue/themes'

// Seeded so the list styles are visible before anything is chosen.
const seeded = [
  new File(['quarterly figures'], 'q3-report.pdf', {
    type: 'application/pdf',
  }),
  new File(['cover'], 'cover-photo.png', { type: 'image/png' }),
]

function formatSize(bytes: number): string {
  return bytes < 1024
    ? `${String(bytes)} B`
    : `${String(Math.round(bytes / 1024))} KB`
}
</script>

<template>
  <GhostFileUpload
    v-slot="{ entries }"
    :default-value="seeded"
    :max-files="5"
    aria-describedby="themed-upload-hint"
  >
    <GhostFileUploadDropzone v-slot="{ dragging }">
      <strong>{{ dragging ? 'Drop to add files' : 'Drag files here' }}</strong>
      <span id="themed-upload-hint">Up to 5 files.</span>
      <GhostFileUploadTrigger>Choose files</GhostFileUploadTrigger>
    </GhostFileUploadDropzone>
    <GhostFileUploadList aria-label="Selected files">
      <GhostFileUploadItem
        v-for="entry in entries"
        :key="entry.id"
        :file="entry.file"
      >
        <span>{{ entry.file.name }}</span>
        <span>{{ formatSize(entry.file.size) }}</span>
        <GhostFileUploadItemRemove>Remove</GhostFileUploadItemRemove>
      </GhostFileUploadItem>
    </GhostFileUploadList>
  </GhostFileUpload>
</template>
