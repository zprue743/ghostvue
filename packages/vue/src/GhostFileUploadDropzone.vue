<script setup lang="ts">
import {
  computed,
  inject,
  mergeProps,
  onBeforeUnmount,
  onMounted,
  useAttrs,
  useTemplateRef,
} from 'vue'

import {
  ghostFileUploadContextKey,
  type GhostFileUploadDropzoneExposed,
  type GhostFileUploadDropzoneSlotProps,
} from './ghost-file-upload'

defineOptions({
  inheritAttrs: false,
})

defineSlots<{
  default(props: GhostFileUploadDropzoneSlotProps): unknown
}>()

const injected = inject(ghostFileUploadContextKey)
if (!injected) {
  throw new Error('GhostFileUploadDropzone must be used inside GhostFileUpload')
}
const { upload } = injected

const attrs = useAttrs()
const host = useTemplateRef<HTMLElement>('host')

// Client-only registration so SSR never touches `document`; the composable
// installs the shared document drop guard while an enabled zone is mounted.
let unregister: (() => void) | undefined
onMounted(() => {
  unregister = upload.registerDropzone()
})
onBeforeUnmount(() => {
  unregister?.()
  unregister = undefined
})

// Consumer listeners run first (mergeProps order), so a consumer
// `preventDefault()` on click keeps the picker closed.
const bindings = computed(() =>
  mergeProps(attrs, { ...upload.dropzoneProps.value }),
)

const slotProps = computed((): GhostFileUploadDropzoneSlotProps => ({
  dragging: upload.dropzoneProps.value['data-state'] === 'dragging',
}))

defineExpose<GhostFileUploadDropzoneExposed>({
  get element() {
    return host.value
  },
})
</script>

<template>
  <!--
    No role and no tabindex (spec: Accessibility, Dropzone): not keyboard
    operable or scrollable, and a named region per upload would add landmark
    noise. Click-to-browse is a pointer convenience; the trigger is the
    keyboard equivalent.
  -->
  <div ref="host" v-bind="bindings">
    <slot v-bind="slotProps" />
  </div>
</template>
