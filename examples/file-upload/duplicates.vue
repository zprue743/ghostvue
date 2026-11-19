<script setup lang="ts">
import {
  GhostFileUpload,
  GhostFileUploadItem,
  GhostFileUploadItemRemove,
  GhostFileUploadList,
  GhostFileUploadTrigger,
  type GhostFileUploadValidate,
} from '@ghostvue/vue'

// There is no built-in deduplication: identity is the File object, and the
// same file chosen twice is two File objects. Compare name, size, and
// lastModified against the current list plus earlier files of this batch.
const rejectDuplicates: GhostFileUploadValidate = (file, { files }) =>
  files.some(
    (existing) =>
      existing.name === file.name &&
      existing.size === file.size &&
      existing.lastModified === file.lastModified,
  )
    ? 'It is already in the list'
    : null
</script>

<template>
  <GhostFileUpload
    v-slot="{ entries, rejections }"
    :validate="rejectDuplicates"
  >
    <GhostFileUploadTrigger>Choose files</GhostFileUploadTrigger>
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
    <p v-for="rejection in rejections" :key="rejection.message">
      {{ rejection.message }}
    </p>
  </GhostFileUpload>
</template>
