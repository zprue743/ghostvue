<script setup lang="ts">
import {
  computed,
  inject,
  mergeProps,
  onBeforeUnmount,
  onMounted,
  provide,
  shallowRef,
  useAttrs,
  useTemplateRef,
} from 'vue'

import {
  ghostFileUploadContextKey,
  ghostFileUploadItemContextKey,
  type GhostFileUploadItemExposed,
} from './ghost-file-upload'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<{
  /** The entry this item represents; provides context to its remove button. */
  file: File
}>()

defineSlots<{
  default(): unknown
}>()

const injected = inject(ghostFileUploadContextKey)
if (!injected) {
  throw new Error('GhostFileUploadItem must be used inside GhostFileUpload')
}
const { upload } = injected

const attrs = useAttrs()
const host = useTemplateRef<HTMLElement>('host')
const removeButton = shallowRef<HTMLElement | null>(null)

provide(ghostFileUploadItemContextKey, {
  file: computed(() => props.file),
  setRemoveButton(element) {
    removeButton.value = element
  },
})

// Registered for the focus-after-removal rule (next / previous remove button).
let unregister: (() => void) | undefined
onMounted(() => {
  unregister = upload.registerItem({
    file: () => props.file,
    element: () => host.value,
    removeButton: () => removeButton.value,
  })
})
onBeforeUnmount(() => {
  unregister?.()
  unregister = undefined
})

const bindings = computed(() =>
  mergeProps(attrs, {
    class: 'ghost-file-upload-item',
    'data-part': 'item',
  }),
)

defineExpose<GhostFileUploadItemExposed>({
  get element() {
    return host.value
  },
})
</script>

<template>
  <li ref="host" v-bind="bindings">
    <slot />
  </li>
</template>
