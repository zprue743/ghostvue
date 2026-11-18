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
  <!-- Client-side checks are UX only; the server must validate again. -->
  <GhostFileUpload
    v-slot="{ entries, rejections, remaining, clearRejections }"
    accept="image/png,image/jpeg,.webp"
    :max-file-size="1_000_000"
    :max-files="3"
    aria-describedby="validation-rules"
  >
    <p id="validation-rules">PNG, JPEG, or WebP. Up to 1 MB each, 3 files.</p>
    <GhostFileUploadDropzone>
      <p>Drag images here, or</p>
      <GhostFileUploadTrigger>Choose images</GhostFileUploadTrigger>
    </GhostFileUploadDropzone>
    <p data-testid="remaining">{{ remaining }} of 3 remaining</p>
    <GhostFileUploadList aria-label="Selected images">
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
    <div v-if="rejections.length > 0" data-testid="rejections">
      <ul aria-label="Files not added">
        <li v-for="rejection in rejections" :key="rejection.message">
          {{ rejection.message }}
        </li>
      </ul>
      <button type="button" @click="clearRejections">Dismiss</button>
    </div>
  </GhostFileUpload>
</template>
