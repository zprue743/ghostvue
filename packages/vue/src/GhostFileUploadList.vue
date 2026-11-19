<script setup lang="ts">
import { computed, inject, mergeProps, useAttrs, useTemplateRef } from 'vue'

import {
  ghostFileUploadContextKey,
  type GhostFileUploadListExposed,
} from './ghost-file-upload'

defineOptions({
  inheritAttrs: false,
})

defineSlots<{
  default(): unknown
}>()

const injected = inject(ghostFileUploadContextKey)
if (!injected) {
  throw new Error('GhostFileUploadList must be used inside GhostFileUpload')
}
const { upload } = injected

const attrs = useAttrs()
const host = useTemplateRef<HTMLElement>('host')

const bindings = computed(() =>
  mergeProps(attrs, {
    class: 'ghost-file-upload-list',
    'data-part': 'list',
  }),
)

defineExpose<GhostFileUploadListExposed>({
  get element() {
    return host.value
  },
})
</script>

<template>
  <!-- Rendered only while files exist; empty-state copy is consumer content. -->
  <ul v-if="upload.files.value.length > 0" ref="host" v-bind="bindings">
    <slot />
  </ul>
</template>
