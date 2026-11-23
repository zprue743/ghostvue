<script setup lang="ts">
/**
 * Native dismiss button. Removes its toast from the store, then emits
 * `click`. It never focuses itself; focus returns to where it was before it
 * entered the region when the removed toast held it.
 */
import { computed, inject, mergeProps, useAttrs, useTemplateRef } from 'vue'

import {
  ghostToastItemContextKey,
  type GhostToastCloseExposed,
} from './ghost-toast'

defineOptions({
  inheritAttrs: false,
})

const emit = defineEmits<{
  /** After the toast was dismissed. */
  click: [event: MouseEvent]
}>()

defineSlots<{
  default(): unknown
}>()

const injected = inject(ghostToastItemContextKey, null)
if (!injected) {
  throw new Error('GhostToastClose must be used inside GhostToast')
}
const item = injected

const attrs = useAttrs()
const host = useTemplateRef<HTMLButtonElement>('host')

function onClick(event: MouseEvent): void {
  item.dismiss()
  emit('click', event)
}

const bindings = computed(() =>
  mergeProps(attrs, {
    type: 'button',
    class: 'ghost-toast-close',
    'data-part': 'close',
    onClick,
  }),
)

defineExpose<GhostToastCloseExposed>({
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
