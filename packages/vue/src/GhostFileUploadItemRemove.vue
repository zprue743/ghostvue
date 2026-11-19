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
  ghostFileUploadItemContextKey,
  type GhostFileUploadItemRemoveExposed,
} from './ghost-file-upload'
import { resolveGhostFileUploadMessage } from './ghost-file-upload-messages'

defineOptions({
  inheritAttrs: false,
})

defineSlots<{
  default(): unknown
}>()

const injectedRoot = inject(ghostFileUploadContextKey)
const injectedItem = inject(ghostFileUploadItemContextKey)
if (!injectedRoot || !injectedItem) {
  throw new Error(
    'GhostFileUploadItemRemove must be used inside GhostFileUploadItem',
  )
}
const root = injectedRoot
const item = injectedItem

const attrs = useAttrs()
const host = useTemplateRef<HTMLButtonElement>('host')

onMounted(() => {
  item.setRemoveButton(host.value)
})
onBeforeUnmount(() => {
  item.setRemoveButton(null)
})

function onClick(event: MouseEvent): void {
  if (event.defaultPrevented) {
    return
  }
  root.upload.remove(item.file.value)
}

const bindings = computed(() => {
  const own: Record<string, unknown> = {
    type: 'button',
    class: 'ghost-file-upload-item-remove',
    'data-part': 'item-remove',
    disabled: root.upload.isDisabled.value,
    onClick,
  }
  // A consumer `aria-label` or `aria-labelledby` wins over the default name.
  if (
    attrs['aria-label'] === undefined &&
    attrs['aria-labelledby'] === undefined
  ) {
    own['aria-label'] = resolveGhostFileUploadMessage(
      root.messages.value,
      'removeLabel',
    )(item.file.value)
  }
  return mergeProps(attrs, own)
})

defineExpose<GhostFileUploadItemRemoveExposed>({
  get element() {
    return host.value
  },
  focus(options?: FocusOptions) {
    host.value?.focus(options)
  },
  blur() {
    host.value?.blur()
  },
})
</script>

<template>
  <button ref="host" v-bind="bindings">
    <slot />
  </button>
</template>
