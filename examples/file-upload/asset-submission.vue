<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue'

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
  type GhostFileUploadExposed,
  type GhostFileUploadRejection,
  type GhostFileUploadValidate,
} from '@ghostvue/themes'

const MAX_FILES = 3

// Two assets are already attached, so one slot is left before the limit.
const files = shallowRef<File[]>([
  new File(['architecture-spec'], 'architecture-spec.pdf', {
    type: 'application/pdf',
  }),
  new File(['brand-mark'], 'brand-mark.svg', { type: 'image/svg+xml' }),
])
const rejections = shallowRef<GhostFileUploadRejection[]>([])
const submitError = shallowRef('')
// Names read back from FormData on submit; null until the form is submitted.
const submitted = shallowRef<string[] | null>(null)
const upload = useTemplateRef<GhostFileUploadExposed>('upload')

// Visible error text: the live region alone does not satisfy WCAG 3.3.1.
const errors = computed(() =>
  submitError.value
    ? [submitError.value]
    : rejections.value.map((rejection) => rejection.message),
)

// The review keys assets by file name, so a second file with the same name
// is rejected. Remove the attached one first to replace it.
const rejectSameName: GhostFileUploadValidate = (file, { files: current }) =>
  current.some((existing) => existing.name === file.name)
    ? 'a file with this name is already attached'
    : null

function formatSize(bytes: number): string {
  return bytes < 1024
    ? `${String(bytes)} B`
    : `${String(Math.round(bytes / 1024))} KB`
}

// update:modelValue runs before reject, so a mixed batch clears the old
// errors here and then shows only the new rejections.
function onFilesChange(next: File[]): void {
  files.value = next
  rejections.value = []
  submitError.value = ''
  submitted.value = null
}

function onReject(next: GhostFileUploadRejection[]): void {
  rejections.value = next
  submitted.value = null
}

function onSubmit(event: SubmitEvent): void {
  const form = event.currentTarget
  if (!(form instanceof HTMLFormElement)) return
  // The upload's hidden form input holds exactly the attached list, so this
  // is what a native multipart submit would send. Nothing leaves the page.
  // An empty file input still contributes one nameless File, so skip it.
  const names = new FormData(form)
    .getAll('assets')
    .flatMap((value) =>
      value instanceof File && value.name !== '' ? [value.name] : [],
    )
  if (names.length === 0) {
    submitError.value = 'Attach at least one asset before submitting.'
    submitted.value = null
    upload.value?.focus()
    return
  }
  submitted.value = names
}
</script>

<template>
  <form class="upload-form" @submit.prevent="onSubmit">
    <GhostCard as="section" aria-labelledby="upload-title">
      <template #header>
        <div class="upload-form__header">
          <h2 id="upload-title" class="upload-form__title">
            Release packet assets
          </h2>
          <p class="upload-form__lead">
            Attach specification PDFs or brand marks for the design review.
          </p>
        </div>
      </template>

      <GhostField :invalid="errors.length > 0">
        <GhostFieldLabel>Attachments</GhostFieldLabel>
        <GhostFieldDescription>
          Up to 3 PDF, PNG, or SVG files, 5 MB each.
        </GhostFieldDescription>
        <GhostFieldControl v-slot="field">
          <GhostFileUpload
            ref="upload"
            v-slot="{ entries, remaining }"
            v-bind="field"
            :model-value="files"
            name="assets"
            accept=".pdf,.png,.svg"
            :max-files="MAX_FILES"
            :max-file-size="5_000_000"
            :validate="rejectSameName"
            @update:model-value="onFilesChange"
            @reject="onReject"
          >
            <GhostFileUploadDropzone v-slot="{ dragging }">
              <strong>
                {{ dragging ? 'Drop files to attach' : 'Drag and drop files' }}
              </strong>
              <span>
                {{
                  remaining === 0
                    ? 'All 3 slots are used. Remove a file to add another.'
                    : `${String(remaining)} of 3 slots left.`
                }}
              </span>
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
        <GhostFieldError as="div" class="upload-form__errors">
          <p v-for="(message, index) in errors" :key="`${index}-${message}`">
            {{ message }}
          </p>
        </GhostFieldError>
      </GhostField>

      <template #footer>
        <div class="upload-form__actions">
          <p class="upload-form__status" role="status">
            <template v-if="submitted">
              Submitted {{ submitted.length }}
              {{ submitted.length === 1 ? 'file' : 'files' }} as “assets”:
              {{ submitted.join(', ') }}.
            </template>
            <template v-else>Not submitted yet.</template>
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

.upload-form__errors {
  display: grid;
  gap: var(--ghost-space-gap-xs);
  overflow-wrap: anywhere;
}

.upload-form__errors p {
  margin: 0;
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
