<script setup lang="ts">
import { shallowRef } from 'vue'

import {
  GhostFileUpload,
  GhostFileUploadItem,
  GhostFileUploadItemRemove,
  GhostFileUploadList,
  GhostFileUploadTrigger,
} from '@ghostvue/vue'

const submitted = shallowRef<string | null>(null)

function onSubmit(event: SubmitEvent) {
  const form = event.currentTarget
  if (!(form instanceof HTMLFormElement)) return
  // The visually hidden mirror input carries the committed list.
  const names = new FormData(form)
    .getAll('documents')
    .flatMap((value) => (value instanceof File ? [value.name] : []))
  submitted.value = names.join(', ')
}
</script>

<template>
  <form data-testid="file-upload-form" @submit.prevent="onSubmit">
    <!-- The control cannot expose "required" itself; say it in the label. -->
    <p id="documents-label">Documents (required)</p>
    <GhostFileUpload
      v-slot="{ entries, invalid }"
      name="documents"
      required
      role="group"
      aria-labelledby="documents-label"
    >
      <GhostFileUploadTrigger
        :aria-describedby="invalid ? 'documents-error' : undefined"
      >
        Choose documents
      </GhostFileUploadTrigger>
      <p v-if="invalid" id="documents-error">Choose at least one document.</p>
      <GhostFileUploadList aria-label="Chosen documents">
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
    <button type="reset">Reset</button>
    <button type="submit">Submit</button>
    <p v-if="submitted !== null" data-testid="submitted">
      Submitted: {{ submitted }}
    </p>
  </form>
</template>
