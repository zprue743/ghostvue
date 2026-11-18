<script setup lang="ts">
import { shallowRef } from 'vue'

import {
  GhostField,
  GhostFieldControl,
  GhostFieldDescription,
  GhostFieldError,
  GhostFieldLabel,
  GhostFileUpload,
  GhostFileUploadDropzone,
  GhostFileUploadItem,
  GhostFileUploadItemRemove,
  GhostFileUploadList,
  GhostFileUploadTrigger,
  type GhostFileUploadRejection,
} from '@ghostvue/vue'

const files = shallowRef<File[]>([])
// Visible error text: the live region alone does not satisfy WCAG 3.3.1.
const rejected = shallowRef<GhostFileUploadRejection[]>([])

function onFilesChange(next: File[]) {
  files.value = next
  rejected.value = []
}
</script>

<template>
  <GhostField :invalid="rejected.length > 0">
    <GhostFieldLabel>Attachments</GhostFieldLabel>
    <GhostFieldDescription>PDF files up to 5 MB.</GhostFieldDescription>
    <GhostFieldControl v-slot="field">
      <GhostFileUpload
        v-slot="{ entries }"
        v-bind="field"
        :model-value="files"
        accept=".pdf,application/pdf"
        :max-file-size="5_000_000"
        name="attachments"
        @update:model-value="onFilesChange"
        @reject="rejected = $event"
      >
        <GhostFileUploadDropzone>
          <p>Drag PDF files here, or</p>
          <GhostFileUploadTrigger>Choose files</GhostFileUploadTrigger>
        </GhostFileUploadDropzone>
        <GhostFileUploadList aria-label="Attached files">
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
    </GhostFieldControl>
    <GhostFieldError>
      <template v-for="rejection in rejected" :key="rejection.message">
        {{ rejection.message }}{{ ' ' }}
      </template>
    </GhostFieldError>
  </GhostField>
</template>
