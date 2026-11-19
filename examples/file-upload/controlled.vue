<script setup lang="ts">
import { shallowRef } from 'vue'

import {
  GhostFileUpload,
  GhostFileUploadDropzone,
  GhostFileUploadItem,
  GhostFileUploadItemRemove,
  GhostFileUploadList,
  GhostFileUploadTrigger,
} from '@ghostvue/vue'

// v-model applies each update synchronously, which controlled parents must do:
// every intake is computed against the current prop.
const files = shallowRef<File[]>([])
const disabled = shallowRef(false)
</script>

<template>
  <label>
    <input v-model="disabled" type="checkbox" />
    Disabled
  </label>
  <GhostFileUpload
    v-slot="{ entries, clear }"
    v-model="files"
    :disabled="disabled"
  >
    <GhostFileUploadDropzone data-testid="dropzone">
      <p>Drag files here, or</p>
      <GhostFileUploadTrigger>Choose files</GhostFileUploadTrigger>
    </GhostFileUploadDropzone>
    <p data-testid="count">{{ files.length }} selected</p>
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
    <button v-if="files.length > 0" type="button" @click="clear">
      Clear all
    </button>
  </GhostFileUpload>
</template>
