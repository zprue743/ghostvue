<script setup lang="ts">
import { shallowRef } from 'vue'

import {
  GhostFileUpload,
  GhostFileUploadDropzone,
  GhostFileUploadItem,
  GhostFileUploadItemRemove,
  GhostFileUploadList,
  GhostFileUploadTrigger,
  type GhostFileUploadRejection,
} from '../src'

const files = shallowRef<File[]>([])
const rejected = shallowRef<GhostFileUploadRejection[]>([])

function onReject(rejections: GhostFileUploadRejection[]) {
  rejected.value = rejections
}
</script>

<template>
  <GhostFileUpload
    v-model="files"
    accept=".pdf"
    :max-files="2"
    name="docs"
    @reject="onReject"
  >
    <template #default="{ entries, remaining, rejections, invalid }">
      <GhostFileUploadDropzone>
        <template #default="{ dragging }">
          {{ dragging ? 'Drop' : 'Drag' }} {{ remaining ?? 'any' }}
          {{ invalid }}
          <GhostFileUploadTrigger :disabled="remaining === 0">
            Choose
          </GhostFileUploadTrigger>
        </template>
      </GhostFileUploadDropzone>
      <GhostFileUploadList aria-label="Files">
        <GhostFileUploadItem
          v-for="entry in entries"
          :key="entry.id"
          :file="entry.file"
        >
          {{ entry.file.name }}
          <GhostFileUploadItemRemove>Remove</GhostFileUploadItemRemove>
        </GhostFileUploadItem>
      </GhostFileUploadList>
      <p v-for="rejection in rejections" :key="rejection.message">
        {{ rejection.reason }}
      </p>
    </template>
  </GhostFileUpload>
</template>
