<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostButton,
  GhostCard,
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
} from '@ghostvue/themes'

const seeded = [
  new File(['architecture-spec'], 'architecture-spec.pdf', {
    type: 'application/pdf',
  }),
  new File(['brand-mark'], 'brand-mark.svg', { type: 'image/svg+xml' }),
]

const files = ref<File[]>(seeded)
const rejectionMessage = ref('')
const submitted = ref(false)

function formatSize(bytes: number): string {
  return bytes < 1024
    ? `${String(bytes)} B`
    : `${String(Math.round(bytes / 1024))} KB`
}

function handleReject(): void {
  rejectionMessage.value =
    'Some files were skipped. Upload up to 3 PDF, PNG, or SVG files under 5 MB.'
  submitted.value = false
}

function handleChange(next: File[]): void {
  files.value = next
  rejectionMessage.value = ''
  submitted.value = false
}

function submit(): void {
  if (files.value.length === 0) {
    rejectionMessage.value = 'Attach at least one asset before submitting.'
    return
  }
  submitted.value = true
}
</script>

<template>
  <form class="upload-form" @submit.prevent="submit">
    <GhostCard as="section" aria-labelledby="upload-title">
      <template #header>
        <div class="upload-form__header">
          <h2 id="upload-title" class="upload-form__title">
            Release packet assets
          </h2>
          <p class="upload-form__lead">
            Attach specification PDFs or vector marks for the design review.
          </p>
        </div>
      </template>

      <GhostField :invalid="rejectionMessage !== ''">
        <GhostFieldLabel>Attachments</GhostFieldLabel>
        <GhostFieldDescription>
          Up to 3 files (PDF, PNG, or SVG, max 5 MB each).
        </GhostFieldDescription>
        <GhostFieldControl v-slot="field">
          <GhostFileUpload
            v-slot="{ entries }"
            v-bind="field"
            :model-value="files"
            accept=".pdf,.png,.svg"
            :max-files="3"
            :max-file-size="5 * 1024 * 1024"
            multiple
            @update:model-value="handleChange"
            @reject="handleReject"
          >
            <GhostFileUploadDropzone v-slot="{ dragging }">
              <strong>
                {{ dragging ? 'Drop files to attach' : 'Drag and drop files' }}
              </strong>
              <span>Or browse from your computer</span>
              <GhostFileUploadTrigger>Choose files</GhostFileUploadTrigger>
            </GhostFileUploadDropzone>

            <GhostFileUploadList
              v-if="entries.length > 0"
              aria-label="Attached assets"
            >
              <GhostFileUploadItem
                v-for="entry in entries"
                :key="entry.id"
                :file="entry.file"
              >
                <span class="upload-form__filename">{{ entry.file.name }}</span>
                <span class="upload-form__filesize">
                  {{ formatSize(entry.file.size) }}
                </span>
                <GhostFileUploadItemRemove>Remove</GhostFileUploadItemRemove>
              </GhostFileUploadItem>
            </GhostFileUploadList>
          </GhostFileUpload>
        </GhostFieldControl>
        <GhostFieldError v-if="rejectionMessage">
          {{ rejectionMessage }}
        </GhostFieldError>
      </GhostField>

      <template #footer>
        <div class="upload-form__actions">
          <p class="upload-form__status" role="status">
            {{
              submitted
                ? `Submitted ${files.length} file${files.length === 1 ? '' : 's'}.`
                : `${files.length} of 3 slots used`
            }}
          </p>
          <GhostButton type="submit" class="upload-form__action">
            Submit packet
          </GhostButton>
        </div>
      </template>
    </GhostCard>
  </form>
</template>

<style scoped>
.upload-form {
  max-inline-size: 36rem;
}

.upload-form__header {
  display: grid;
  gap: var(--ghost-space-gap-xs);
  padding-block-end: var(--ghost-space-stack-sm);
}

.upload-form__title {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-lg);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-tight);
  margin: 0;
}

.upload-form__lead,
.upload-form__status {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-snug);
  margin: 0;
  overflow-wrap: anywhere;
}

.upload-form__filename {
  min-inline-size: 0;
  overflow-wrap: anywhere;
}

.upload-form__filesize {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-xs);
  white-space: nowrap;
}

.upload-form__actions {
  display: grid;
  gap: var(--ghost-space-gap-sm) var(--ghost-space-gap-md);
}

.upload-form :deep(.upload-form__action) {
  inline-size: 100%;
}

@container ghost-demo (min-width: 30rem) {
  .upload-form__actions {
    align-items: center;
    display: flex;
    justify-content: flex-end;
  }

  .upload-form__status {
    flex: 1 1 auto;
  }

  .upload-form :deep(.upload-form__action) {
    inline-size: auto;
  }
}
</style>
